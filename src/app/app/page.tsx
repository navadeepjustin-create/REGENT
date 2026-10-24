'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks, createTask, toggleTaskComplete } from '@/lib/services/tasks';
import { getHabits, getHabitEntries, logHabitEntry, calculateHabitStreak } from '@/lib/services/habits';
import { getFocusSessions } from '@/lib/services/focus';
import { getDailyReview, saveDailyReview } from '@/lib/services/reviews';
import { Modal } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { PriorityBadge } from '@/components/ui/badge';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import type { Task, Habit, HabitEntry, DailyReview, TaskPriority } from '@/types';
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
} from 'lucide-react';

export default function TodayPage() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [review, setReview] = useState<DailyReview | null>(null);
  const [focusMinutesToday, setFocusMinutesToday] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const todayStr = new Date().toISOString().split('T')[0];
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

      // Calculate focus minutes
      const totalSec = fetchedSessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
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
      }, 500);
    } catch (err: unknown) {
      console.error('Failed to create task:', err);
      let errorMsg = 'Failed to create task. Please try again.';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMsg = String((err as { message: unknown }).message);
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

    // Optimistic
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

  // Filter today's items
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        <p className="text-sm text-text-muted">Loading your command center...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 relative z-10">
      {/* ── Header (Clean typographic layout matching target design) ── */}
      <div className="pb-1 pt-1">
        <p className="text-xs font-mono font-medium uppercase tracking-[0.2em] text-regent-gold/90 mb-2">
          {formattedDate}
        </p>
        <h1 className="text-3xl md:text-5xl font-serif font-normal text-regent-ivory tracking-tight">
          {getGreeting()},{' '}
          <span className="text-regent-ivory">
            {profile?.display_name || user?.email?.split('@')[0] || 'navadeep'}
          </span>
        </h1>
        <p className="text-sm text-text-secondary mt-2 font-normal leading-relaxed">
          Focus on execution. Let precision guide your day.
        </p>
      </div>

      {/* ── Daily Stats Row (Row of 4 cards with illuminated Card 1) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <StatCard
          label="Priority Tasks"
          value={`${tasksCompletedToday}/${priorityTasks.length}`}
          sublabel={
            priorityTasks.length > 0
              ? `${Math.round((tasksCompletedToday / priorityTasks.length) * 100)}% completed`
              : '50% completed'
          }
          icon={CheckSquare}
          isGlowing={true}
        />
        <StatCard
          label="Habits Complete"
          value={`${habitsCompletedToday}/${todayHabits.length}`}
          sublabel={
            todayHabits.length > 0
              ? `${Math.round((habitsCompletedToday / todayHabits.length) * 100)}% on target`
              : '100% on target'
          }
          icon={Target}
        />
        <StatCard
          label="Focus Time"
          value={`${focusMinutesToday}m`}
          sublabel="Deep work logged"
          icon={Timer}
        />
        <StatCard
          label="Active Streak"
          value={`${maxStreak || 1}d`}
          sublabel="Consistent execution"
          icon={Flame}
        />
      </div>

      {/* ── Two Column Workspace: Tasks & Habits ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Priority Tasks */}
        <div className="regent-card-elevated p-6 md:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-regent-gold/10 border border-regent-gold/30 flex items-center justify-center shadow-sm shadow-regent-gold/10">
                  <Sparkles className="w-4 h-4 text-regent-gold" />
                </div>
                <h2 className="text-xl font-serif font-normal text-regent-ivory tracking-tight">
                  Today&apos;s Priorities
                </h2>
              </div>
              <Link
                href="/app/tasks"
                className="text-xs font-medium text-text-muted hover:text-regent-gold flex items-center gap-1.5 transition-colors"
              >
                <span>All Tasks</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {priorityTasks.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-border-subtle/80 rounded-xl bg-surface-2/30">
                <Sparkles className="w-8 h-8 text-regent-gold/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-text-secondary">
                  No priority tasks for today
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                  Set high-leverage tasks to clarify your focus for the day.
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
                <h2 className="text-xl font-serif font-normal text-regent-ivory tracking-tight">
                  Today&apos;s Habits
                </h2>
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
                  No habits scheduled today
                </p>
                <p className="text-xs text-text-muted mt-1 max-w-xs mx-auto">
                  Build enduring discipline through daily routines.
                </p>
                <Link
                  href="/app/habits"
                  className="mt-4 inline-block regent-btn regent-btn-secondary text-xs px-3.5 py-1.5"
                >
                  Create Habit
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

      {/* ── Evening Reflection & Daily Review Card (with illuminated gold edge) ── */}
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
            placeholder="What went well today? What resisted progress? What is one takeaway for tomorrow?"
            rows={3}
            className="regent-input w-full resize-none p-3.5 text-sm leading-relaxed"
          />

          <div className="flex justify-end">
            <button
              onClick={handleSaveReview}
              disabled={isSavingReview}
              className="regent-btn regent-btn-primary text-xs px-5 py-2.5 flex items-center gap-2 shadow-sm shadow-regent-gold/15"
            >
              {isSavingReview && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Reflection</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Quick Add Task Modal ── */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        title="Add Priority Task"
        description="Add a task scheduled for today."
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          {taskFormError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{taskFormError}</span>
            </div>
          )}

          {taskFormSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{taskFormSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Task Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newTaskTitle}
              onChange={(e) => {
                setNewTaskTitle(e.target.value);
                if (taskFormError) setTaskFormError(null);
              }}
              placeholder="e.g. Finish systemic architecture review"
              className="regent-input w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                className="regent-input w-full bg-surface-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Today Priority
              </label>
              <button
                type="button"
                onClick={() => setNewTaskIsPriority(!newTaskIsPriority)}
                className={`w-full py-2.5 px-3 rounded-lg border text-xs font-medium transition-all ${
                  newTaskIsPriority
                    ? 'bg-regent-gold/15 text-regent-gold border-regent-gold/40'
                    : 'bg-surface-2 text-text-muted border-border-subtle'
                }`}
              >
                {newTaskIsPriority ? '★ Priority Item' : 'Standard'}
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTaskModalOpen(false)}
              className="regent-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingTask || !newTaskTitle.trim()}
              className="regent-btn regent-btn-primary text-xs flex items-center gap-1.5 px-4 py-2"
            >
              {isSubmittingTask && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Task</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
