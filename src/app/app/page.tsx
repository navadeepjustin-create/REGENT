'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks, createTask, toggleTaskComplete } from '@/lib/services/tasks';
import { getHabits, getHabitEntries, logHabitEntry, calculateHabitStreak } from '@/lib/services/habits';
import { getFocusSessions } from '@/lib/services/focus';
import { getDailyReview, saveDailyReview } from '@/lib/services/reviews';
import { generateRegentIntelligence, type RegentIntelligenceSummary } from '@/lib/services/intelligence';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { PriorityBadge } from '@/components/ui/badge';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import { formatLocalDate } from '@/lib/utils';
import type { Task, Habit, HabitEntry, FocusSession, DailyReview, TaskPriority } from '@/types';
import {
  CheckSquare,
  Target,
  Timer,
  Flame,
  Plus,
  Play,
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Smile,
  Zap,
  Calendar,
  Loader2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Compass,
  Lightbulb,
} from 'lucide-react';

export default function TodayPage() {
  const { user, profile, preferences } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [review, setReview] = useState<DailyReview | null>(null);
  const [focusMinutesToday, setFocusMinutesToday] = useState(0);
  const [loading, setLoading] = useState(true);

  // Active Daily Command Step
  const [commandStep, setCommandStep] = useState<'plan' | 'focus' | 'habits' | 'reflect'>('plan');

  // Quick Task Modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('medium');
  const [newTaskIsPriority, setNewTaskIsPriority] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskFormError, setTaskFormError] = useState<string | null>(null);
  const [taskFormSuccess, setTaskFormSuccess] = useState<string | null>(null);

  // Review state
  const [reflectionText, setReflectionText] = useState('');
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [selectedEnergy, setSelectedEnergy] = useState<number | null>(null);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [reviewSavedMessage, setReviewSavedMessage] = useState(false);

  const todayStr = formatLocalDate(new Date());
  const dayOfWeek = new Date().getDay();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fetchedTasks, fetchedHabits, fetchedEntries, fetchedSessions, fetchedReview] =
        await Promise.all([
          getTasks(user.id),
          getHabits(user.id),
          getHabitEntries(user.id, todayStr, todayStr),
          getFocusSessions(user.id, todayStr, todayStr),
          getDailyReview(user.id, todayStr),
        ]);

      setTasks(fetchedTasks);
      setHabits(fetchedHabits);
      setHabitEntries(fetchedEntries);
      setFocusSessions(fetchedSessions);

      // Calculate focus minutes
      const completedTodaySessions = fetchedSessions.filter((s) => s.status === 'completed');
      const totalSec = completedTodaySessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
      setFocusMinutesToday(Math.round(totalSec / 60));

      if (fetchedReview) {
        setReview(fetchedReview);
        setReflectionText(fetchedReview.reflection || '');
        setSelectedMood(fetchedReview.mood || null);
        setSelectedEnergy(fetchedReview.energy || null);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, todayStr]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleOpenModal = () => setIsTaskModalOpen(true);
    window.addEventListener('regent:open-task-modal', handleOpenModal);
    return () => window.removeEventListener('regent:open-task-modal', handleOpenModal);
  }, []);

  // Realtime Cross-Device Synchronization
  useRealtimeSync({
    userId: user?.id,
    tables: ['tasks', 'habits', 'habit_entries', 'focus_sessions', 'daily_reviews'],
    onSync: loadData,
    enabled: !!user,
  });

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Date formatting
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Task Handlers
  const handleToggleTask = async (task: Task) => {
    const updatedStatus = task.status === 'completed' ? 'todo' : 'completed';
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: updatedStatus } : t))
    );
    try {
      await toggleTaskComplete(task.id, task.status);
    } catch {
      // Revert on failure
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTask) return;

    setTaskFormError(null);
    setTaskFormSuccess(null);

    const trimmedTitle = newTaskTitle.trim();
    if (!trimmedTitle) {
      setTaskFormError('Task title is required.');
      return;
    }
    if (trimmedTitle.length > 500) {
      setTaskFormError('Task title must be 500 characters or less.');
      return;
    }

    if (!user) {
      setTaskFormError('You must be signed in to create a task.');
      return;
    }

    try {
      setIsSubmittingTask(true);
      const created = await createTask(user.id, {
        title: trimmedTitle,
        priority: newTaskPriority,
        is_priority_task: newTaskIsPriority,
        due_date: todayStr,
      });
      setTasks((prev) => [created, ...prev]);
      setTaskFormSuccess('Task created successfully.');
      setTimeout(() => {
        setNewTaskTitle('');
        setIsTaskModalOpen(false);
        setTaskFormSuccess(null);
      }, 400);
    } catch (err: unknown) {
      console.error('Failed to create task:', err);
      let errorMsg = 'Failed to create task. Please try again.';
      if (err instanceof Error) {
        errorMsg = err.message;
      }
      setTaskFormError(errorMsg);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Habit Logging Handlers
  const handleIncrementHabit = async (habit: Habit) => {
    if (!user) return;
    const currentEntry = habitEntries.find((e) => e.habit_id === habit.id);
    const currentValue = currentEntry ? Number(currentEntry.value) : 0;
    const nextValue = currentValue + 1;

    // Optimistic update
    setHabitEntries((prev) => {
      const filtered = prev.filter((e) => e.habit_id !== habit.id);
      return [
        ...filtered,
        {
          id: currentEntry?.id || 'temp',
          habit_id: habit.id,
          user_id: user.id,
          date: todayStr,
          value: nextValue,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    });

    try {
      await logHabitEntry(user.id, habit.id, todayStr, nextValue);
    } catch (err) {
      console.error('Failed to log habit:', err);
      loadData();
    }
  };

  // Review Handlers
  const handleSaveReview = async () => {
    if (!user) return;
    try {
      setIsSavingReview(true);
      const saved = await saveDailyReview(user.id, todayStr, {
        reflection: reflectionText,
        mood: selectedMood || undefined,
        energy: selectedEnergy || undefined,
      });
      setReview(saved);
      setReviewSavedMessage(true);
      setTimeout(() => setReviewSavedMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save review:', err);
    } finally {
      setIsSavingReview(false);
    }
  };

  // Today's Items Filtering
  const priorityTasks = tasks.filter(
    (t) => t.is_priority_task || t.due_date === todayStr
  );
  const tasksCompletedToday = priorityTasks.filter(
    (t) => t.status === 'completed'
  ).length;

  const todayHabits = habits.filter(
    (h) => h.is_active && h.schedule_days.includes(dayOfWeek)
  );

  const habitsCompletedToday = todayHabits.filter((h) => {
    const entry = habitEntries.find((e) => e.habit_id === h.id);
    return entry && Number(entry.value) >= h.target_value;
  }).length;

  // Best streak across active habits
  const maxStreak = habits.reduce((max, h) => {
    const { currentStreak } = calculateHabitStreak(h, habitEntries, todayStr);
    return Math.max(max, currentStreak);
  }, 0);

  // Daily Success Rule Verification
  const rule = preferences?.daily_success_rule || { type: 'habits_count', min_habits: 2 };
  const dailyFocusGoal = preferences?.daily_success_rule?.min_focus_minutes || 120;

  const isDailySuccessMet = useMemo(() => {
    if (rule.type === 'habits_count') {
      const min = rule.min_habits || 2;
      return todayHabits.length > 0 && habitsCompletedToday >= min;
    }
    if (rule.type === 'priority_tasks') {
      return priorityTasks.length > 0 && tasksCompletedToday === priorityTasks.length;
    }
    if (rule.type === 'focus_minutes') {
      const min = rule.min_focus_minutes || 60;
      return focusMinutesToday >= min;
    }
    return habitsCompletedToday >= 2 || tasksCompletedToday >= 1;
  }, [rule, todayHabits, habitsCompletedToday, priorityTasks, tasksCompletedToday, focusMinutesToday]);

  // Generate REGENT Intelligence Insights from Real DB Records
  const intelligence: RegentIntelligenceSummary = useMemo(() => {
    return generateRegentIntelligence({
      tasks,
      habits,
      habitEntries,
      focusSessions,
      review,
      dailyFocusTargetMinutes: dailyFocusGoal,
      todayStr,
    });
  }, [tasks, habits, habitEntries, focusSessions, review, dailyFocusGoal, todayStr]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        <p className="text-sm text-text-muted font-mono">Calibrating your command center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative z-10">
      {/* ── Welcome Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 pt-1 border-b border-border-subtle/50">
        <div>
          <p className="text-xs font-mono font-medium uppercase tracking-[0.2em] text-regent-gold/90 mb-2 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </p>
          <h1 className="text-3xl md:text-5xl font-serif font-normal text-regent-ivory tracking-tight">
            {getGreeting()},{' '}
            <span className="text-regent-ivory font-serif">
              {profile?.display_name || user?.email?.split('@')[0] || 'Member'}
            </span>
          </h1>
          <p className="text-sm text-text-secondary mt-2 font-normal leading-relaxed">
            One intelligent command center. Plan deliberately, execute relentlessly.
          </p>
        </div>

        {/* Daily Success Status Badge */}
        <div className={`px-4 py-2.5 rounded-xl border flex items-center gap-2.5 self-start md:self-auto ${
          isDailySuccessMet
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/10'
            : 'bg-surface-2/80 border-border-subtle text-text-secondary'
        }`}>
          <ShieldCheck className={`w-4 h-4 ${isDailySuccessMet ? 'text-emerald-400' : 'text-regent-gold/70'}`} />
          <div className="text-xs">
            <p className="font-semibold">{isDailySuccessMet ? 'Standard Achieved' : 'Standard In Progress'}</p>
            <p className="text-[11px] text-text-muted mt-0.5">
              {rule.type === 'habits_count' && `${habitsCompletedToday}/${rule.min_habits || 2} habits required`}
              {rule.type === 'priority_tasks' && `${tasksCompletedToday}/${priorityTasks.length || 1} priorities required`}
              {rule.type === 'focus_minutes' && `${focusMinutesToday}/${rule.min_focus_minutes || 60}m focus required`}
            </p>
          </div>
        </div>
      </div>

      {/* ── Daily Command Workflow Bar ── */}
      <div className="regent-card p-2 border border-border-subtle/90 flex items-center justify-between overflow-x-auto gap-2 bg-[#0E0F0D]">
        {[
          { id: 'plan', label: '1. Plan Priorities', count: `${completedPrioritiesCount(tasksCompletedToday, priorityTasks.length)}` },
          { id: 'focus', label: '2. Deep Work Chamber', count: `${focusMinutesToday}m / ${dailyFocusGoal}m` },
          { id: 'habits', label: '3. Track Routines', count: `${habitsCompletedToday}/${todayHabits.length}` },
          { id: 'reflect', label: '4. Evening Calibration', count: review ? 'Saved' : 'Pending' },
        ].map((step) => {
          const isActive = commandStep === step.id;
          return (
            <button
              key={step.id}
              onClick={() => setCommandStep(step.id as 'plan' | 'focus' | 'habits' | 'reflect')}
              className={`flex items-center gap-2.5 px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                isActive
                  ? 'bg-regent-gold text-regent-obsidian font-semibold shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-2'
              }`}
            >
              <span>{step.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                isActive ? 'bg-regent-obsidian/20 text-regent-obsidian' : 'bg-surface-3 text-text-secondary'
              }`}>
                {step.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Daily Real Stats Row (No Hardcoded Placeholders) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          label="Priority Tasks"
          value={`${tasksCompletedToday}/${priorityTasks.length}`}
          sublabel={
            priorityTasks.length > 0
              ? `${Math.round((tasksCompletedToday / priorityTasks.length) * 100)}% completed`
              : 'No priorities set today'
          }
          icon={CheckSquare}
          isGlowing={priorityTasks.length > 0 && tasksCompletedToday === priorityTasks.length}
        />
        <StatCard
          label="Habits Complete"
          value={`${habitsCompletedToday}/${todayHabits.length}`}
          sublabel={
            todayHabits.length > 0
              ? `${Math.round((habitsCompletedToday / todayHabits.length) * 100)}% on target`
              : 'No habits scheduled today'
          }
          icon={Target}
        />
        <StatCard
          label="Focus Time"
          value={`${focusMinutesToday}m`}
          sublabel={`Goal: ${dailyFocusGoal}m`}
          icon={Timer}
        />
        <StatCard
          label="Active Streak"
          value={`${maxStreak}d`}
          sublabel={maxStreak > 0 ? 'Consecutive adherence' : 'Start streak today'}
          icon={Flame}
        />
      </div>

      {/* ── REGENT Intelligence Card ── */}
      <div className="regent-card-elevated p-6 border-regent-gold/30 bg-gradient-to-r from-surface-1/90 via-[#151613] to-surface-1/90 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-regent-gold/15 border border-regent-gold/40 flex items-center justify-center text-regent-gold shadow-sm shadow-regent-gold/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-serif font-semibold text-regent-ivory">
                REGENT Intelligence
              </h2>
              <p className="text-[11px] text-text-muted font-mono">
                Computed from your active workspace records
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-regent-gold bg-regent-gold/10 px-2.5 py-1 rounded-full border border-regent-gold/20">
              Pacing {intelligence.productivityPacing}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Observations */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted mb-1 flex items-center gap-1.5">
              <span>Factual Observations</span>
            </p>
            {intelligence.observations.slice(0, 3).map((obs) => (
              <div key={obs.id} className="regent-surface-item p-3 border-border-subtle/80 text-xs">
                <p className="font-medium text-text-primary">{obs.title}</p>
                <p className="text-text-muted mt-0.5 leading-relaxed">{obs.content}</p>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wider text-regent-gold/90 mb-1 flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-regent-gold" />
              <span>Recommended Next Actions</span>
            </p>
            {intelligence.suggestions.slice(0, 3).map((sug) => (
              <div key={sug.id} className="regent-surface-item p-3 border-regent-gold/20 bg-surface-2/40 text-xs flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-text-primary truncate">{sug.title}</p>
                  <p className="text-text-muted mt-0.5 text-[11px] line-clamp-1">{sug.content}</p>
                </div>
                {sug.actionHref && (
                  <Link
                    href={sug.actionHref}
                    className="shrink-0 regent-btn regent-btn-secondary text-[11px] px-2.5 py-1 text-regent-gold border-regent-gold/40 hover:bg-regent-gold/20"
                  >
                    {sug.actionLabel || 'Action'}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Two Column Workspace: Tasks & Habits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Priority Tasks */}
        <div className="regent-card-elevated p-6 md:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-regent-gold/10 border border-regent-gold/30 flex items-center justify-center shadow-sm shadow-regent-gold/10">
                  <CheckSquare className="w-4 h-4 text-regent-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-normal text-regent-ivory tracking-tight">
                    Today&apos;s Priorities
                  </h2>
                  <p className="text-xs text-text-muted">Top objectives requiring discipline</p>
                </div>
              </div>
              <Link
                href="/app/tasks"
                className="text-xs font-medium text-text-muted hover:text-regent-gold flex items-center gap-1.5 transition-colors"
              >
                <span>Task Backlog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {priorityTasks.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border-subtle/80 rounded-xl bg-surface-2/30">
                <Sparkles className="w-8 h-8 text-regent-gold/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-text-secondary">
                  No priority tasks designated for today
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                  Designate 1 to 3 critical outcomes to orient your focus for the day.
                </p>
                <button
                  onClick={() => setIsTaskModalOpen(true)}
                  className="mt-4 regent-btn regent-btn-secondary text-xs px-3.5 py-1.5"
                >
                  Add Priority Task
                </button>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {priorityTasks.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <li
                      key={task.id}
                      className={`regent-surface-item flex items-center justify-between p-3.5 transition-all group ${
                        isDone ? 'opacity-55' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => handleToggleTask(task)}
                          className="shrink-0 text-text-muted/70 hover:text-regent-gold transition-colors"
                          aria-label={isDone ? 'Mark uncompleted' : 'Mark completed'}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5 group-hover:text-regent-gold transition-colors" />
                          )}
                        </button>
                        <span
                          className={`text-sm font-medium truncate ${
                            isDone ? 'line-through text-text-muted' : 'text-text-primary'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={task.priority} />
                        <Link
                          href={`/app/focus`}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-muted hover:text-regent-gold transition-opacity"
                          title="Focus on this task"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle/80 flex justify-end">
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="text-xs text-regent-gold/90 hover:text-regent-gold-light font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Quick add priority task</span>
            </button>
          </div>
        </div>

        {/* Today's Habits */}
        <div className="regent-card-elevated p-6 md:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-regent-gold/10 border border-regent-gold/30 flex items-center justify-center shadow-sm shadow-regent-gold/10">
                  <Target className="w-4 h-4 text-regent-gold" />
                </div>
                <div>
                  <h2 className="text-xl font-serif font-normal text-regent-ivory tracking-tight">
                    Today&apos;s Routines
                  </h2>
                  <p className="text-xs text-text-muted">Compound daily discipline</p>
                </div>
              </div>
              <Link
                href="/app/habits"
                className="text-xs font-medium text-text-muted hover:text-regent-gold flex items-center gap-1.5 transition-colors"
              >
                <span>Manage</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {todayHabits.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border-subtle/80 rounded-xl bg-surface-2/30">
                <Target className="w-8 h-8 text-regent-gold/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-text-secondary">
                  No routines scheduled for today
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                  Build habits that sustain momentum and focus over months and years.
                </p>
                <Link
                  href="/app/habits"
                  className="mt-4 inline-block regent-btn regent-btn-secondary text-xs px-3.5 py-1.5"
                >
                  Configure Habits
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {todayHabits.map((habit) => {
                  const entry = habitEntries.find((e) => e.habit_id === habit.id);
                  const val = entry ? Number(entry.value) : 0;
                  const isComplete = val >= habit.target_value;
                  const percent = Math.min(100, Math.round((val / habit.target_value) * 100));

                  return (
                    <div
                      key={habit.id}
                      className="regent-surface-item p-3.5 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2.5">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {habit.name}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5">
                            {val} of {habit.target_value} {habit.unit}
                          </p>
                        </div>

                        <button
                          onClick={() => handleIncrementHabit(habit)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                            isComplete
                              ? 'bg-emerald-950/40 text-emerald-300/90 border-emerald-500/30'
                              : 'bg-regent-gold/15 text-regent-gold border-regent-gold/30 hover:bg-regent-gold/25'
                          }`}
                        >
                          {isComplete ? 'Completed' : `+1 ${habit.unit}`}
                        </button>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-[#181916] h-1.5 rounded-full overflow-hidden border border-border-subtle/40">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete
                              ? 'bg-gradient-to-r from-emerald-400 to-emerald-300'
                              : 'bg-gradient-to-r from-regent-gold to-regent-gold-light'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-border-subtle/80 flex justify-end">
            <Link
              href="/app/habits"
              className="text-xs text-regent-gold/90 hover:text-regent-gold-light font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Configure habits</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Evening Reflection & Daily Review Card ── */}
      <div className="regent-card-reflection p-6 md:p-7">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-regent-gold/10 border border-regent-gold/30 flex items-center justify-center shadow-sm shadow-regent-gold/10">
              <Sparkles className="w-4 h-4 text-regent-gold" />
            </div>
            <h2 className="text-xl font-serif font-normal text-regent-ivory tracking-tight">
              Daily Reflection
            </h2>
          </div>
          {reviewSavedMessage && (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-full">
              Review saved successfully
            </span>
          )}
        </div>

        <p className="text-xs text-text-muted mb-5 leading-relaxed">
          Capture insights, calibrate energy, and close the loop on today&apos;s execution.
        </p>

        {/* Mood & Energy Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="regent-surface-item p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smile className="w-4 h-4 text-regent-gold" />
              <span className="text-xs font-mono uppercase tracking-[0.1em] text-text-muted">Mindset / Mood</span>
            </div>
            <div className="flex items-center gap-2.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedMood(level)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                    selectedMood === level
                      ? 'bg-gradient-to-b from-regent-gold-light via-regent-gold to-regent-gold/90 text-regent-obsidian border-regent-gold shadow-md shadow-regent-gold/25'
                      : 'bg-surface-2/70 text-text-muted border-border-subtle/80 hover:text-text-primary hover:border-regent-gold/30 hover:bg-surface-3/80'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div className="regent-surface-item p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-regent-gold" />
              <span className="text-xs font-mono uppercase tracking-[0.1em] text-text-muted">Energy Level</span>
            </div>
            <div className="flex items-center gap-2.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedEnergy(level)}
                  className={`w-9 h-9 rounded-lg text-xs font-semibold border transition-all ${
                    selectedEnergy === level
                      ? 'bg-gradient-to-b from-regent-gold-light via-regent-gold to-regent-gold/90 text-regent-obsidian border-regent-gold shadow-md shadow-regent-gold/25'
                      : 'bg-surface-2/70 text-text-muted border-border-subtle/80 hover:text-text-primary hover:border-regent-gold/30 hover:bg-surface-3/80'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Reflection textarea */}
        <div className="space-y-3">
          <textarea
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            placeholder="What went well today? What will you do with more precision tomorrow?"
            rows={3}
            className="regent-input text-xs w-full py-3 bg-surface-2 resize-none"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveReview}
              disabled={isSavingReview || (!reflectionText.trim() && !selectedMood && !selectedEnergy)}
              className="regent-btn regent-btn-primary text-xs px-4 py-2 disabled:opacity-40"
            >
              {isSavingReview ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                'Save Reflection'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Add Task Modal ── */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Priority Task"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5">
              Task Title
            </label>
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="e.g. Finalize architectural blueprint"
              className="regent-input text-sm w-full"
              autoFocus
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-1.5">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="regent-input text-xs w-full py-2 bg-surface-2"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-text-secondary">
                <input
                  type="checkbox"
                  checked={newTaskIsPriority}
                  onChange={(e) => setNewTaskIsPriority(e.target.checked)}
                  className="rounded border-border-subtle bg-surface-2 text-regent-gold focus:ring-0"
                />
                <span>Set as Daily Priority</span>
              </label>
            </div>
          </div>

          {taskFormError && (
            <div className="p-2.5 rounded-lg bg-regent-error/10 border border-regent-error/20 text-regent-error text-xs">
              {taskFormError}
            </div>
          )}

          {taskFormSuccess && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-xs">
              {taskFormSuccess}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="regent-btn regent-btn-ghost text-xs px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTask}
              className="regent-btn regent-btn-primary text-xs px-4 py-1.5"
            >
              {isSubmittingTask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Create Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function completedPrioritiesCount(completed: number, total: number): string {
  if (total === 0) return '0/0';
  return `${completed}/${total}`;
}
