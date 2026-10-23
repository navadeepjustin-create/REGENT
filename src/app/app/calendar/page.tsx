'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks } from '@/lib/services/tasks';
import { getHabits, getHabitEntries } from '@/lib/services/habits';
import { getFocusSessions } from '@/lib/services/focus';
import { getReviewsRange } from '@/lib/services/reviews';
import type { Task, Habit, HabitEntry, FocusSession, DailyReview } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Sparkles,
  Calendar as CalendarIcon,
  Loader2,
  Smile,
  Zap,
} from 'lucide-react';

interface DaySummary {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  status: 'success' | 'missed' | 'untracked' | 'future';
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsScheduled: number;
  focusMinutes: number;
  review?: DailyReview;
}

export default function CalendarPage() {
  const { user, preferences } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [reviews, setReviews] = useState<DailyReview[]>([]);
  const [loading, setLoading] = useState(true);

  // Month navigation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Compute start and end of visible grid (including padding days)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Calculate grid start (Sunday-based)
  const startDayOfWeek = firstDayOfMonth.getDay();
  const startDate = new Date(firstDayOfMonth);
  startDate.setDate(startDate.getDate() - startDayOfWeek);

  // Calculate grid end (to cover full 6 rows = 42 cells)
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 41);

  const startIso = startDate.toISOString().split('T')[0];
  const endIso = endDate.toISOString().split('T')[0];
  const todayIso = new Date().toISOString().split('T')[0];

  const loadMonthData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fTasks, fHabits, fEntries, fFocus, fReviews] = await Promise.all([
        getTasks(user.id),
        getHabits(user.id),
        getHabitEntries(user.id, startIso, endIso),
        getFocusSessions(user.id, startIso, endIso),
        getReviewsRange(user.id, startIso, endIso),
      ]);

      setTasks(fTasks);
      setHabits(fHabits);
      setEntries(fEntries);
      setFocusSessions(fFocus);
      setReviews(fReviews);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, startIso, endIso]);

  useEffect(() => {
    loadMonthData();
  }, [loadMonthData]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(now.toISOString().split('T')[0]);
  };

  // Generate 42 calendar grid cells
  const days: DaySummary[] = [];
  const cursor = new Date(startDate);

  for (let i = 0; i < 42; i++) {
    const dateStr = cursor.toISOString().split('T')[0];
    const isCurrentMonth = cursor.getMonth() === month;
    const isToday = dateStr === todayIso;
    const isFuture = dateStr > todayIso;

    // Day calculations
    const dayOfWeek = cursor.getDay();

    // Tasks on this day
    const dayTasks = tasks.filter(
      (t) => t.due_date === dateStr || (t.completed_at && t.completed_at.startsWith(dateStr))
    );
    const tasksCompleted = dayTasks.filter((t) => t.status === 'completed').length;
    const tasksTotal = dayTasks.length;

    // Habits scheduled for this day of week
    const scheduledHabits = habits.filter(
      (h) => h.is_active && h.schedule_days.includes(dayOfWeek) && dateStr >= h.start_date
    );
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const habitsCompleted = scheduledHabits.filter((h) => {
      const entry = dayEntries.find((e) => e.habit_id === h.id);
      return entry && Number(entry.value) >= h.target_value;
    }).length;

    // Focus sessions
    const daySessions = focusSessions.filter((s) => s.start_time.startsWith(dateStr));
    const focusSec = daySessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
    const focusMinutes = Math.round(focusSec / 60);

    // Review
    const dayReview = reviews.find((r) => r.date === dateStr);

    // Success Rule Evaluation:
    // User preference or default rule: minimum habits or tasks
    const minHabits = preferences?.daily_success_rule?.min_habits ?? 2;
    const minFocus = preferences?.daily_success_rule?.min_focus_minutes ?? 25;

    let status: 'success' | 'missed' | 'untracked' | 'future' = 'untracked';

    if (isFuture) {
      status = 'future'; // NEVER mark future days as missed!
    } else {
      const hasAnyActivity = tasksTotal > 0 || scheduledHabits.length > 0 || focusMinutes > 0 || !!dayReview;
      if (!hasAnyActivity) {
        status = 'untracked';
      } else {
        const metHabits = scheduledHabits.length > 0 && habitsCompleted >= Math.min(minHabits, scheduledHabits.length);
        const metTasks = tasksCompleted > 0;
        const metFocus = focusMinutes >= minFocus;

        if (metHabits || metTasks || metFocus) {
          status = 'success';
        } else {
          status = 'missed';
        }
      }
    }

    days.push({
      date: dateStr,
      dayOfMonth: cursor.getDate(),
      isCurrentMonth,
      isToday,
      isFuture,
      status,
      tasksCompleted,
      tasksTotal,
      habitsCompleted,
      habitsScheduled: scheduledHabits.length,
      focusMinutes,
      review: dayReview,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  const selectedDay = days.find((d) => d.date === selectedDateStr) || days[0];

  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentDate);

  const selectedDayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(selectedDateStr + 'T00:00:00'));

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Master Execution Log</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Calendar & Continuity
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track accountability over time. Inspect historical consistency.
          </p>
        </div>

        {/* Month Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleToday}
            className="regent-btn-secondary text-xs px-3 py-1.5"
          >
            Today
          </button>
          <div className="flex items-center bg-surface-2 rounded-lg border border-border-subtle p-1">
            <button
              onClick={handlePrevMonth}
              className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface-3 transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-medium text-text-primary min-w-[120px] text-center">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface-3 transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary bg-surface-2/60 border border-border-subtle px-4 py-3 rounded-xl">
        <span className="font-semibold text-text-primary">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-regent-gold border border-regent-gold/50 shadow-sm" />
          <span>Execution Success</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-surface-4 border border-rose-500/50" />
          <span>Target Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-surface-3 border border-border-subtle" />
          <span>Untracked / Rest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-surface-1 border border-dashed border-border-subtle" />
          <span>Future</span>
        </div>
      </div>

      {/* ── Main Grid & Day Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Calendar Grid (2 cols) */}
        <div className="lg:col-span-2 regent-card p-6">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1 mb-2 text-center text-xs font-semibold text-text-muted">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-80">
              <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {days.map((day) => {
                const isSelected = day.date === selectedDateStr;

                // Color mappings
                let bgClass = 'bg-surface-2/40 border-border-subtle text-text-muted';
                let indicator = null;

                if (day.status === 'success') {
                  bgClass = 'bg-regent-gold/15 border-regent-gold/40 text-regent-gold font-semibold';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-regent-gold" />;
                } else if (day.status === 'missed') {
                  bgClass = 'bg-surface-3/80 border-rose-500/30 text-rose-300';
                  indicator = <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />;
                } else if (day.status === 'future') {
                  bgClass = 'bg-surface-1/40 border-border-subtle/50 text-text-muted/40';
                }

                if (!day.isCurrentMonth) {
                  bgClass += ' opacity-30';
                }

                if (day.isToday) {
                  bgClass += ' ring-2 ring-regent-gold';
                }

                if (isSelected) {
                  bgClass += ' scale-[1.03] shadow-lg border-regent-gold z-10';
                }

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDateStr(day.date)}
                    className={`h-16 md:h-20 p-1.5 rounded-xl border flex flex-col justify-between items-start transition-all text-left ${bgClass}`}
                  >
                    <span className="text-xs">{day.dayOfMonth}</span>

                    <div className="w-full flex items-center justify-between">
                      {indicator}
                      {day.focusMinutes > 0 && (
                        <span className="text-[10px] text-text-muted hidden md:inline">
                          {day.focusMinutes}m
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Day Inspector (1 col) */}
        <div className="regent-card p-6 flex flex-col justify-between">
          <div>
            <div className="border-b border-border-subtle pb-4 mb-4">
              <span className="text-xs font-semibold text-regent-gold uppercase tracking-wider">
                Day Inspector
              </span>
              <h3 className="text-lg font-serif font-semibold text-text-primary mt-1">
                {selectedDayFormatted}
              </h3>
              <div className="mt-2 flex items-center gap-2">
                {selectedDay.status === 'success' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-regent-gold font-medium bg-regent-gold/10 px-2.5 py-1 rounded-full border border-regent-gold/30">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Success Achieved
                  </span>
                )}
                {selectedDay.status === 'missed' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium bg-rose-500/10 px-2.5 py-1 rounded-full border border-rose-500/20">
                    <XCircle className="w-3.5 h-3.5" />
                    Below Threshold
                  </span>
                )}
                {selectedDay.status === 'future' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-muted font-medium bg-surface-2 px-2.5 py-1 rounded-full border border-border-subtle">
                    <Clock className="w-3.5 h-3.5" />
                    Upcoming Day
                  </span>
                )}
                {selectedDay.status === 'untracked' && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary font-medium bg-surface-2 px-2.5 py-1 rounded-full border border-border-subtle">
                    Untracked / Rest Day
                  </span>
                )}
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Target className="w-4 h-4 text-regent-gold" />
                  <span className="text-xs font-medium text-text-secondary">Habits Logged</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">
                  {selectedDay.habitsCompleted} / {selectedDay.habitsScheduled}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-regent-gold" />
                  <span className="text-xs font-medium text-text-secondary">Tasks Completed</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">
                  {selectedDay.tasksCompleted} / {selectedDay.tasksTotal}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-regent-gold" />
                  <span className="text-xs font-medium text-text-secondary">Focus Time</span>
                </div>
                <span className="text-xs font-semibold text-text-primary">
                  {selectedDay.focusMinutes} minutes
                </span>
              </div>

              {/* Reflection if exists */}
              {selectedDay.review ? (
                <div className="p-4 rounded-xl bg-surface-2/80 border border-border-subtle space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-regent-gold" />
                      Daily Reflection
                    </span>
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {selectedDay.review.mood && (
                        <span className="flex items-center gap-1">
                          <Smile className="w-3 h-3 text-regent-gold" />
                          {selectedDay.review.mood}/5
                        </span>
                      )}
                      {selectedDay.review.energy && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-regent-gold" />
                          {selectedDay.review.energy}/5
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary italic">
                    &ldquo;{selectedDay.review.reflection}&rdquo;
                  </p>
                </div>
              ) : (
                <div className="text-center py-6 border border-dashed border-border-subtle rounded-xl text-xs text-text-muted">
                  No reflection recorded for this date.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
