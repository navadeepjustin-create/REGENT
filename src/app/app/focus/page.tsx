'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks } from '@/lib/services/tasks';
import {
  createFocusSession,
  updateFocusSession,
  getFocusSessions,
} from '@/lib/services/focus';
import type { Task, FocusSession } from '@/types';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  ListTodo,
  Calendar,
  Loader2,
  Sparkles,
} from 'lucide-react';

type Mode = 'work' | 'break';

export default function FocusPage() {
  const { user } = useAuth();
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
  const [elapsedWorkSeconds, setElapsedWorkSeconds] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fTasks, fSessions] = await Promise.all([
        getTasks(user.id, { status: 'todo' }),
        getFocusSessions(user.id),
      ]);
      setTasks(fTasks);
      setRecentSessions(fSessions.slice(0, 10));
    } catch (err) {
      console.error('Failed to load focus data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total seconds for current mode
  const totalSeconds = (mode === 'work' ? workMinutes : breakMinutes) * 60;
  const progressPercent = Math.min(
    100,
    Math.round(((totalSeconds - timeLeft) / totalSeconds) * 100)
  );

  // Sound chime synthesizer using Web Audio API
  const playChime = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // AudioContext unavailable or blocked by autoplay policy
    }
  }, []);

  const handleSessionCompleted = useCallback(async () => {
    if (activeSessionId) {
      try {
        const completed = await updateFocusSession(activeSessionId, {
          status: 'completed',
          end_time: new Date().toISOString(),
          actual_duration: elapsedWorkSeconds,
        });
        setRecentSessions((prev) => [completed, ...prev]);
        setActiveSessionId(null);
        setElapsedWorkSeconds(0);
      } catch (err) {
        console.error('Failed to complete focus session:', err);
      }
    }
    // Switch to break mode
    setMode('break');
    setTimeLeft(breakMinutes * 60);
  }, [activeSessionId, breakMinutes, elapsedWorkSeconds]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();
            handleSessionCompleted();
            return 0;
          }
          if (mode === 'work') {
            setElapsedWorkSeconds((s) => s + 1);
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, playChime, handleSessionCompleted]);

  const handleStart = async () => {
    if (!isRunning) {
      setIsRunning(true);
      if (!activeSessionId && user && mode === 'work') {
        try {
          const session = await createFocusSession(user.id, {
            task_id: selectedTaskId || null,
            work_duration: workMinutes,
            break_duration: breakMinutes,
            status: 'active',
            notes: notes || null,
          });
          setActiveSessionId(session.id);
        } catch (err) {
          console.error('Failed to create focus session record:', err);
        }
      }
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    if (activeSessionId) {
      try {
        await updateFocusSession(activeSessionId, {
          status: 'paused',
          actual_duration: elapsedWorkSeconds,
        });
      } catch (err) {
        console.error('Failed to pause focus session:', err);
      }
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft((mode === 'work' ? workMinutes : breakMinutes) * 60);
  };

  const handleFinishEarly = async () => {
    if (confirm('Finish and log this focus session now?')) {
      setIsRunning(false);
      await handleSessionCompleted();
    }
  };

  const selectPreset = (work: number, brk: number) => {
    if (isRunning) return;
    setWorkMinutes(work);
    setBreakMinutes(brk);
    setMode('work');
    setTimeLeft(work * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 regent-page-divider pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <Timer className="w-3.5 h-3.5" />
            <span>Deep Work Chamber</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Focus & Flow
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Eliminate cognitive clutter. Devote unbroken attention to singular priorities.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-xl border border-border-subtle self-start md:self-auto">
          <button
            onClick={() => {
              if (isRunning) return;
              setMode('work');
              setTimeLeft(workMinutes * 60);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'work'
                ? 'bg-regent-gold text-regent-obsidian font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Work Block
          </button>
          <button
            onClick={() => {
              if (isRunning) return;
              setMode('break');
              setTimeLeft(breakMinutes * 60);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              mode === 'break'
                ? 'bg-regent-gold text-regent-obsidian font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Recovery Break
          </button>
        </div>
      </div>

      {/* ── Main Timer Section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Timer Visual (2 cols) */}
        <div className="lg:col-span-2 regent-card p-8 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Preset Buttons */}
          <div className="flex items-center gap-2 mb-8">
            {[
              { label: 'Classic 25 / 5', work: 25, brk: 5 },
              { label: 'Deep 50 / 10', work: 50, brk: 10 },
              { label: 'Sprint 15 / 3', work: 15, brk: 3 },
            ].map((preset) => (
              <button
                key={preset.label}
                disabled={isRunning}
                onClick={() => selectPreset(preset.work, preset.brk)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                  workMinutes === preset.work && mode === 'work'
                    ? 'bg-regent-gold/15 text-regent-gold border-regent-gold/40'
                    : 'bg-surface-2 text-text-muted border-border-subtle hover:text-text-primary disabled:opacity-50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Circular Countdown Ring */}
          <div className="relative w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Background ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-surface-2"
                strokeWidth="4"
                fill="none"
              />
              {/* Animated Progress ring */}
              <circle
                cx="50"
                cy="50"
                r="44"
                className="stroke-regent-gold transition-all duration-1000 ease-linear"
                strokeWidth="4"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
                strokeLinecap="round"
                fill="none"
              />
            </svg>

            <div className="absolute flex flex-col items-center">
              <span className="text-5xl md:text-6xl font-serif font-bold text-text-primary tracking-tight">
                {formatTime(timeLeft)}
              </span>
              <span className="text-xs uppercase tracking-widest text-regent-gold font-semibold mt-2">
                {mode === 'work' ? 'Deep Work' : 'Restoration'}
              </span>
              {isRunning && (
                <span className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Recording
                </span>
              )}
            </div>
          </div>

          {/* Play / Pause / Reset Controls */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={handleReset}
              className="p-3 rounded-xl bg-surface-2 text-text-muted hover:text-text-primary border border-border-subtle transition-all"
              title="Reset timer"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {isRunning ? (
              <button
                onClick={handlePause}
                className="px-8 py-3.5 rounded-xl bg-surface-2 text-regent-gold border border-regent-gold/40 hover:bg-surface-3 transition-all flex items-center gap-2 font-medium"
              >
                <Pause className="w-5 h-5 fill-regent-gold" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-8 py-3.5 rounded-xl bg-regent-gold text-regent-obsidian font-semibold hover:bg-regent-gold-light transition-all flex items-center gap-2 shadow-lg shadow-regent-gold/10"
              >
                <Play className="w-5 h-5 fill-regent-obsidian" />
                <span>{elapsedWorkSeconds > 0 ? 'Resume' : 'Begin Focus'}</span>
              </button>
            )}

            {isRunning && mode === 'work' && (
              <button
                onClick={handleFinishEarly}
                className="p-3 rounded-xl bg-surface-2 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all"
                title="Finish & Save Session"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Task Attachment & Session Notes (1 col) */}
        <div className="space-y-6">
          <div className="regent-card p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-regent-gold" />
              <span>Attach To Task</span>
            </h3>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Link to an Active Task (Optional)
              </label>
              <select
                value={selectedTaskId}
                disabled={isRunning}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="regent-input w-full bg-surface-2 text-xs"
              >
                <option value="">General Focus (No specific task)</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Session Focus Intent
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What single outcome defines this session?"
                rows={2}
                className="regent-input w-full resize-none text-xs"
              />
            </div>
          </div>

          {/* Recent Focus History */}
          <div className="regent-card p-6">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-regent-gold" />
              <span>Recent Sessions</span>
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-regent-gold animate-spin" />
              </div>
            ) : recentSessions.length === 0 ? (
              <div className="text-center py-6 text-xs text-text-muted">
                No sessions completed yet. Start your first sprint above.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentSessions.slice(0, 5).map((s) => {
                  const minutes = Math.round((s.actual_duration || 0) / 60);
                  const dateStr = new Date(s.start_time).toLocaleDateString();
                  return (
                    <li
                      key={s.id}
                      className="p-2.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium text-text-primary">
                          {s.notes || 'Deep Focus Sprint'}
                        </p>
                        <p className="text-[11px] text-text-muted">{dateStr}</p>
                      </div>
                      <span className="font-semibold text-regent-gold">
                        {minutes > 0 ? `${minutes}m` : `${s.actual_duration || 0}s`}
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
