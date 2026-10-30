'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks } from '@/lib/services/tasks';
import {
  createFocusSession,
  updateFocusSession,
  getFocusSessions,
  getActiveFocusSession,
} from '@/lib/services/focus';
import { formatLocalDate } from '@/lib/utils';
import type { Task, FocusSession } from '@/types';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Calendar,
  Loader2,
  Sparkles,
  Bell,
  Check,
  Target,
} from 'lucide-react';

type Mode = 'work' | 'break';

interface PersistedTimerState {
  activeSessionId: string | null;
  mode: Mode;
  workMinutes: number;
  breakMinutes: number;
  targetEndTimeMs: number | null; // null when paused
  pausedRemainingSeconds: number;
  isRunning: boolean;
  selectedTaskId: string;
  notes: string;
  startedAt: string;
  accumulatedWorkedSeconds: number;
}

const STORAGE_KEY = 'regent_focus_state_v2';

export default function FocusPage() {
  const { user, preferences } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentSessions, setRecentSessions] = useState<FocusSession[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  // Timer configuration
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [mode, setMode] = useState<Mode>('work');

  // Timer state
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [targetEndTimeMs, setTargetEndTimeMs] = useState<number | null>(null);
  const [accumulatedWorkedSeconds, setAccumulatedWorkedSeconds] = useState(0);

  // Daily target (minutes)
  const dailyTargetMinutes = preferences?.daily_success_rule?.min_focus_minutes || 120;
  const [todayCompletedMinutes, setTodayCompletedMinutes] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isCompletingRef = useRef(false);

  const todayStr = formatLocalDate(new Date());

  // Request browser notification permission once
  const requestNotificationPermission = useCallback(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  const playChime = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4);
      osc.start();
      osc.stop(ctx.currentTime + 1.4);
    } catch {
      // AudioContext unavailable or autoplay restricted
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, { body, icon: '/favicon.ico' });
      } catch {
        // Ignore notification error
      }
    }
  }, []);

  // Save current timer state to localStorage
  const persistState = useCallback((overrides?: Partial<PersistedTimerState>) => {
    if (typeof window === 'undefined') return;
    const state: PersistedTimerState = {
      activeSessionId,
      mode,
      workMinutes,
      breakMinutes,
      targetEndTimeMs,
      pausedRemainingSeconds: timeLeft,
      isRunning,
      selectedTaskId,
      notes,
      startedAt: new Date().toISOString(),
      accumulatedWorkedSeconds,
      ...overrides,
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage full or restricted
    }
  }, [
    activeSessionId,
    mode,
    workMinutes,
    breakMinutes,
    targetEndTimeMs,
    timeLeft,
    isRunning,
    selectedTaskId,
    notes,
    accumulatedWorkedSeconds,
  ]);

  const clearPersistedState = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fTasks, fSessions, activeInDb] = await Promise.all([
        getTasks(user.id, { status: 'todo' }),
        getFocusSessions(user.id),
        getActiveFocusSession(user.id),
      ]);
      setTasks(fTasks);
      setRecentSessions(fSessions.slice(0, 10));

      // Calculate today's completed focus minutes
      const todaySessions = fSessions.filter(
        (s) => s.start_time.startsWith(todayStr) && s.status === 'completed'
      );
      const totalSec = todaySessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
      setTodayCompletedMinutes(Math.round(totalSec / 60));

      // ── Restore State from localStorage if available ──
      const savedRaw = localStorage.getItem(STORAGE_KEY);
      if (savedRaw) {
        try {
          const saved: PersistedTimerState = JSON.parse(savedRaw);
          setMode(saved.mode || 'work');
          setWorkMinutes(saved.workMinutes || 25);
          setBreakMinutes(saved.breakMinutes || 5);
          setSelectedTaskId(saved.selectedTaskId || '');
          setNotes(saved.notes || '');
          setActiveSessionId(saved.activeSessionId || (activeInDb ? activeInDb.id : null));
          setAccumulatedWorkedSeconds(saved.accumulatedWorkedSeconds || 0);

          if (saved.isRunning && saved.targetEndTimeMs) {
            const now = Date.now();
            const remaining = Math.round((saved.targetEndTimeMs - now) / 1000);
            if (remaining > 0) {
              setTimeLeft(remaining);
              setTargetEndTimeMs(saved.targetEndTimeMs);
              setIsRunning(true);
            } else {
              // Timer elapsed while away from tab/refreshing!
              setTimeLeft(0);
              setIsRunning(false);
              setTargetEndTimeMs(null);
            }
          } else {
            // Was paused
            setTimeLeft(saved.pausedRemainingSeconds || (saved.workMinutes || 25) * 60);
            setIsRunning(false);
            setTargetEndTimeMs(null);
          }
        } catch {
          clearPersistedState();
        }
      } else if (activeInDb) {
        // Recover orphan DB session
        setActiveSessionId(activeInDb.id);
        setSelectedTaskId(activeInDb.task_id || '');
        setWorkMinutes(activeInDb.work_duration || 25);
        setBreakMinutes(activeInDb.break_duration || 5);
        setTimeLeft((activeInDb.work_duration || 25) * 60);
      }
    } catch (err) {
      console.error('Failed to load focus chamber data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr, clearPersistedState]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Session Completed Handler
  const handleSessionCompleted = useCallback(async () => {
    if (isCompletingRef.current) return;
    isCompletingRef.current = true;

    playChime();

    if (mode === 'work') {
      sendNotification('REGENT Focus Complete', 'Excellent discipline. Time for a well-earned restorative break.');
      if (activeSessionId) {
        try {
          const finalDuration = accumulatedWorkedSeconds > 0 ? accumulatedWorkedSeconds : workMinutes * 60;
          const completed = await updateFocusSession(activeSessionId, {
            status: 'completed',
            end_time: new Date().toISOString(),
            actual_duration: finalDuration,
            notes: notes || null,
          });
          setRecentSessions((prev) => [completed, ...prev.filter((s) => s.id !== completed.id)]);
          setTodayCompletedMinutes((prev) => prev + Math.round(finalDuration / 60));
        } catch (err) {
          console.error('Failed to log completed focus session:', err);
        }
      }
      // Switch mode to break
      setMode('break');
      const breakSec = breakMinutes * 60;
      setTimeLeft(breakSec);
      setIsRunning(false);
      setTargetEndTimeMs(null);
      setActiveSessionId(null);
      setAccumulatedWorkedSeconds(0);
      clearPersistedState();
    } else {
      sendNotification('Break Finished', 'Your break has concluded. Ready to initiate your next focus chamber?');
      setMode('work');
      const workSec = workMinutes * 60;
      setTimeLeft(workSec);
      setIsRunning(false);
      setTargetEndTimeMs(null);
      setActiveSessionId(null);
      setAccumulatedWorkedSeconds(0);
      clearPersistedState();
    }

    isCompletingRef.current = false;
  }, [
    mode,
    activeSessionId,
    accumulatedWorkedSeconds,
    workMinutes,
    breakMinutes,
    notes,
    playChime,
    sendNotification,
    clearPersistedState,
  ]);

  // Accurate drift-free countdown engine using requestAnimationFrame / setInterval anchored to Date.now()
  useEffect(() => {
    if (!isRunning || !targetEndTimeMs) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const checkTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.round((targetEndTimeMs - now) / 1000));
      setTimeLeft(remaining);

      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsRunning(false);
        setTargetEndTimeMs(null);
        handleSessionCompleted();
      }
    };

    // Run immediately and every 500ms to guarantee sub-second accuracy
    checkTime();
    timerRef.current = setInterval(checkTime, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, targetEndTimeMs, handleSessionCompleted]);

  // Start / Resume Timer
  const handleStart = async () => {
    requestNotificationPermission();

    const targetMs = Date.now() + timeLeft * 1000;
    setTargetEndTimeMs(targetMs);
    setIsRunning(true);

    let currentSessionId = activeSessionId;

    if (!currentSessionId && user && mode === 'work') {
      try {
        const session = await createFocusSession(user.id, {
          task_id: selectedTaskId || null,
          work_duration: workMinutes,
          break_duration: breakMinutes,
          status: 'active',
          notes: notes || null,
        });
        currentSessionId = session.id;
        setActiveSessionId(session.id);
      } catch (err) {
        console.error('Failed to create focus session record in Supabase:', err);
      }
    } else if (currentSessionId && mode === 'work') {
      try {
        await updateFocusSession(currentSessionId, { status: 'active' });
      } catch {
        // Non-blocking
      }
    }

    persistState({
      activeSessionId: currentSessionId,
      isRunning: true,
      targetEndTimeMs: targetMs,
      pausedRemainingSeconds: timeLeft,
    });
  };

  // Pause Timer
  const handlePause = async () => {
    setIsRunning(false);
    setTargetEndTimeMs(null);

    // Compute elapsed work seconds so far
    const totalModeSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
    const elapsed = Math.max(0, totalModeSeconds - timeLeft);
    setAccumulatedWorkedSeconds(elapsed);

    if (activeSessionId) {
      try {
        await updateFocusSession(activeSessionId, {
          status: 'paused',
          actual_duration: elapsed,
        });
      } catch (err) {
        console.error('Failed to pause focus session:', err);
      }
    }

    persistState({
      isRunning: false,
      targetEndTimeMs: null,
      pausedRemainingSeconds: timeLeft,
      accumulatedWorkedSeconds: elapsed,
    });
  };

  // Reset Timer
  const handleReset = () => {
    setIsRunning(false);
    setTargetEndTimeMs(null);
    const resetSec = (mode === 'work' ? workMinutes : breakMinutes) * 60;
    setTimeLeft(resetSec);
    setAccumulatedWorkedSeconds(0);
    clearPersistedState();
  };

  // Finish Early
  const handleFinishEarly = async () => {
    if (confirm('Conclude and log this focus block now with current accumulated time?')) {
      setIsRunning(false);
      setTargetEndTimeMs(null);
      const totalModeSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
      const elapsed = Math.max(60, totalModeSeconds - timeLeft);
      setAccumulatedWorkedSeconds(elapsed);
      await handleSessionCompleted();
    }
  };

  // Preset Selector
  const selectPreset = (work: number, brk: number) => {
    if (isRunning) return;
    setWorkMinutes(work);
    setBreakMinutes(brk);
    setMode('work');
    setTimeLeft(work * 60);
    setTargetEndTimeMs(null);
    clearPersistedState();
  };

  const formatDisplayTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalModeSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progressPercent = Math.min(
    100,
    Math.round(((totalModeSeconds - timeLeft) / totalModeSeconds) * 100)
  );

  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 regent-page-divider pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase font-mono">
            <Timer className="w-3.5 h-3.5" />
            <span>Deep Work Chamber</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Focus & Flow
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Eliminate cognitive clutter. Devote unbroken, drift-free attention to singular priorities.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-surface-2 p-1.5 rounded-xl border border-border-subtle self-start md:self-auto">
          <button
            onClick={() => {
              if (isRunning) return;
              setMode('work');
              setTimeLeft(workMinutes * 60);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'work'
                ? 'bg-gradient-to-r from-regent-gold to-regent-gold-light text-regent-obsidian font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Work Block ({workMinutes}m)
          </button>
          <button
            onClick={() => {
              if (isRunning) return;
              setMode('break');
              setTimeLeft(breakMinutes * 60);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'break'
                ? 'bg-gradient-to-r from-regent-gold to-regent-gold-light text-regent-obsidian font-semibold shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Restorative Break ({breakMinutes}m)
          </button>
        </div>
      </div>

      {/* ── Daily Target Banner ── */}
      <div className="regent-card p-5 border border-border-subtle/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-regent-gold/10 border border-regent-gold/30 flex items-center justify-center text-regent-gold">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Today&apos;s Focus Target</p>
            <p className="text-base font-medium text-text-primary mt-0.5">
              <span className="text-regent-gold font-semibold">{todayCompletedMinutes}m</span> of{' '}
              {dailyTargetMinutes}m goal completed
            </p>
          </div>
        </div>

        <div className="w-full sm:w-64 bg-[#141512] h-2 rounded-full overflow-hidden border border-border-subtle">
          <div
            className="h-full bg-gradient-to-r from-regent-gold via-regent-gold-light to-amber-200 rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.round((todayCompletedMinutes / dailyTargetMinutes) * 100))}%` }}
          />
        </div>
      </div>

      {/* ── Chamber Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Main Focus Chamber */}
        <div className="lg:col-span-2 space-y-6">
          <div className="regent-card-elevated p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Ambient Radial Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(194,168,120,0.06),transparent_70%)] pointer-events-none" />

            {/* Presets */}
            <div className="flex items-center gap-2 mb-8 z-10">
              <button
                onClick={() => selectPreset(25, 5)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  workMinutes === 25 && breakMinutes === 5
                    ? 'bg-regent-gold/20 text-regent-gold border-regent-gold/50 shadow-sm'
                    : 'bg-surface-2 text-text-muted border-border-subtle hover:text-text-primary'
                } disabled:opacity-50`}
              >
                Classic 25/5
              </button>
              <button
                onClick={() => selectPreset(50, 10)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  workMinutes === 50 && breakMinutes === 10
                    ? 'bg-regent-gold/20 text-regent-gold border-regent-gold/50 shadow-sm'
                    : 'bg-surface-2 text-text-muted border-border-subtle hover:text-text-primary'
                } disabled:opacity-50`}
              >
                Deep Work 50/10
              </button>
              <button
                onClick={() => selectPreset(15, 3)}
                disabled={isRunning}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  workMinutes === 15 && breakMinutes === 3
                    ? 'bg-regent-gold/20 text-regent-gold border-regent-gold/50 shadow-sm'
                    : 'bg-surface-2 text-text-muted border-border-subtle hover:text-text-primary'
                } disabled:opacity-50`}
              >
                Sprint 15/3
              </button>
            </div>

            {/* Circular Timer Ring */}
            <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center my-4 z-10">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-[#1C1E19]"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  className="stroke-regent-gold transition-all duration-300"
                  strokeWidth="4"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-5xl md:text-6xl font-light tracking-tight text-regent-ivory">
                  {formatDisplayTime(timeLeft)}
                </span>
                <span className="text-xs uppercase tracking-widest text-text-muted mt-2 font-mono">
                  {mode === 'work' ? 'Unbroken Attention' : 'Restorative Interval'}
                </span>
                {selectedTask && (
                  <span className="mt-2 text-xs text-regent-gold truncate max-w-[180px] bg-regent-gold/10 px-2 py-0.5 rounded border border-regent-gold/20">
                    {selectedTask.title}
                  </span>
                )}
              </div>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-4 mt-8 z-10">
              <button
                onClick={handleReset}
                className="regent-btn-ghost p-3 rounded-full border border-border-subtle hover:border-regent-gold/40"
                title="Reset Chamber"
              >
                <RotateCcw className="w-5 h-5 text-text-muted" />
              </button>

              {isRunning ? (
                <button
                  onClick={handlePause}
                  className="w-16 h-16 rounded-full bg-regent-gold text-regent-obsidian flex items-center justify-center hover:bg-regent-gold-light shadow-lg shadow-regent-gold/25 transition-all scale-100 active:scale-95"
                  title="Pause Chamber"
                >
                  <Pause className="w-7 h-7 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  className="w-16 h-16 rounded-full bg-regent-gold text-regent-obsidian flex items-center justify-center hover:bg-regent-gold-light shadow-lg shadow-regent-gold/25 transition-all scale-100 active:scale-95 pl-1"
                  title="Initiate Chamber"
                >
                  <Play className="w-7 h-7 fill-current" />
                </button>
              )}

              {activeSessionId && isRunning && (
                <button
                  onClick={handleFinishEarly}
                  className="regent-btn-ghost p-3 rounded-full border border-border-subtle hover:border-emerald-500/50 hover:text-emerald-400"
                  title="Finish and Log Early"
                >
                  <Check className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: Task Association & Settings */}
        <div className="space-y-6">
          {/* Associate Task */}
          <div className="regent-card p-6 border border-border-subtle">
            <h3 className="text-base font-serif font-semibold text-text-primary mb-3">
              Dedicate Block
            </h3>
            <p className="text-xs text-text-muted mb-4">
              Bind this focus block to a priority action item in your backlog.
            </p>

            <select
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              disabled={isRunning}
              className="regent-input text-xs w-full py-2.5 bg-surface-2 border border-border-subtle mb-4 disabled:opacity-50"
            >
              <option value="">No specific task (General Focus)</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.is_priority_task ? '★ ' : ''}{t.title}
                </option>
              ))}
            </select>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session intention or cognitive notes..."
              rows={3}
              className="regent-input text-xs w-full py-2 bg-surface-2 resize-none"
            />
          </div>

          {/* Recent Sessions */}
          <div className="regent-card p-6 border border-border-subtle">
            <h3 className="text-base font-serif font-semibold text-text-primary mb-3">
              Recent Chambers
            </h3>

            {loading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-5 h-5 text-regent-gold animate-spin" />
              </div>
            ) : recentSessions.length === 0 ? (
              <p className="text-xs text-text-muted py-6 text-center">
                No focus chambers logged yet. Complete your first block above.
              </p>
            ) : (
              <ul className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {recentSessions.map((session) => {
                  const durationMins = Math.round((session.actual_duration || session.work_duration * 60) / 60);
                  const startTime = new Date(session.start_time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <li
                      key={session.id}
                      className="regent-surface-item p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <div>
                          <p className="font-medium text-text-primary">
                            {durationMins} minutes
                          </p>
                          <p className="text-[11px] text-text-muted mt-0.5">
                            {startTime} · {session.status}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-regent-gold/80 bg-regent-gold/10 px-2 py-0.5 rounded">
                        +{durationMins}m
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
