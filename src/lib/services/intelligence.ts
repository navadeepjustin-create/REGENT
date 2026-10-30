/**
 * ============================================
 * REGENT Intelligence — Personal Cognitive Engine
 * Phase 6: Autonomous, Real-Record Analytical Layer
 * ============================================
 * 
 * Rules & Guarantees:
 * 1. Strictly computed from actual database records.
 * 2. Clearly distinguishes factual Observations from proactive Suggestions.
 * 3. Never mutates schedules or tasks without explicit user consent.
 * 4. Zero external API leaks or unconfigured paid services.
 */

import type { Task, Habit, HabitEntry, FocusSession, DailyReview } from '@/types';
import { formatLocalDate } from '@/lib/utils';
import { calculateHabitStreak } from '@/lib/services/habits';

export interface IntelligenceItem {
  id: string;
  type: 'priority' | 'habit' | 'focus' | 'deadline' | 'review' | 'velocity';
  kind: 'observation' | 'suggestion';
  title: string;
  content: string;
  actionLabel?: string;
  actionHref?: string;
  tone: 'gold' | 'emerald' | 'amber' | 'neutral';
}

export interface RegentIntelligenceSummary {
  timestamp: string;
  observations: IntelligenceItem[];
  suggestions: IntelligenceItem[];
  productivityPacing: number; // 0-100 derived from priority completion & focus target
}

export interface IntelligenceAnalysisInput {
  tasks: Task[];
  habits: Habit[];
  habitEntries: HabitEntry[];
  focusSessions: FocusSession[];
  review: DailyReview | null;
  dailyFocusTargetMinutes?: number;
  todayStr?: string;
}

export function generateRegentIntelligence(input: IntelligenceAnalysisInput): RegentIntelligenceSummary {
  const todayStr = input.todayStr || formatLocalDate(new Date());
  const now = new Date();
  const dayOfWeek = now.getDay();
  const focusTarget = input.dailyFocusTargetMinutes || 120;

  const observations: IntelligenceItem[] = [];
  const suggestions: IntelligenceItem[] = [];

  // ── 1. Priority Tasks Analysis ──
  const priorityTasks = input.tasks.filter((t) => t.is_priority_task || t.due_date === todayStr);
  const completedPriorities = priorityTasks.filter((t) => t.status === 'completed');
  const pendingPriorities = priorityTasks.filter((t) => t.status !== 'completed');

  if (priorityTasks.length > 0) {
    const percent = Math.round((completedPriorities.length / priorityTasks.length) * 100);
    observations.push({
      id: 'obs-priority-pacing',
      type: 'priority',
      kind: 'observation',
      title: 'Priority Execution Pacing',
      content: `You have completed ${completedPriorities.length} of ${priorityTasks.length} daily priorities (${percent}%).`,
      tone: percent === 100 ? 'emerald' : percent >= 50 ? 'gold' : 'neutral',
    });

    if (pendingPriorities.length > 0) {
      const topPending = pendingPriorities[0];
      suggestions.push({
        id: 'sug-top-priority',
        type: 'priority',
        kind: 'suggestion',
        title: 'Focus on Primary Objective',
        content: `Devote your next attention block to "${topPending.title}".`,
        actionLabel: 'Launch Focus Chamber',
        actionHref: '/app/focus',
        tone: 'gold',
      });
    }
  } else {
    suggestions.push({
      id: 'sug-set-priorities',
      type: 'priority',
      kind: 'suggestion',
      title: 'Define Daily High-Leverage Outcomes',
      content: 'Identify up to three essential outcomes for today to establish directional clarity.',
      actionLabel: 'Set Priorities',
      actionHref: '/app/tasks',
      tone: 'gold',
    });
  }

  // ── 2. Deadlines & Horizons ──
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = formatLocalDate(tomorrow);

  const dueTomorrow = input.tasks.filter((t) => t.status !== 'completed' && t.due_date === tomorrowStr);
  if (dueTomorrow.length > 0) {
    observations.push({
      id: 'obs-upcoming-deadlines',
      type: 'deadline',
      kind: 'observation',
      title: 'Imminent Deadlines',
      content: `You have ${dueTomorrow.length} deadline${dueTomorrow.length > 1 ? 's' : ''} scheduled for tomorrow (${dueTomorrow.map((t) => `"${t.title}"`).join(', ')}).`,
      tone: 'amber',
    });
  }

  // Overdue Tasks
  const overdueTasks = input.tasks.filter(
    (t) => t.status !== 'completed' && t.due_date && t.due_date < todayStr
  );
  if (overdueTasks.length > 0) {
    observations.push({
      id: 'obs-overdue-tasks',
      type: 'deadline',
      kind: 'observation',
      title: 'Carried Over Items',
      content: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} with past due dates remain uncompleted.`,
      tone: 'amber',
    });
  }

  // ── 3. Habit Adherence & Streaks ──
  const activeHabits = input.habits.filter((h) => h.is_active && h.schedule_days.includes(dayOfWeek));
  const completedHabits = activeHabits.filter((h) => {
    const entry = input.habitEntries.find((e) => e.habit_id === h.id && e.date === todayStr);
    return entry && Number(entry.value) >= h.target_value;
  });

  if (activeHabits.length > 0) {
    const habitPercent = Math.round((completedHabits.length / activeHabits.length) * 100);
    observations.push({
      id: 'obs-habit-consistency',
      type: 'habit',
      kind: 'observation',
      title: 'Daily Habit Adherence',
      content: `${completedHabits.length} of ${activeHabits.length} routines logged for today (${habitPercent}%).`,
      tone: habitPercent === 100 ? 'emerald' : 'gold',
    });

    // Check for active streaks at risk
    const pendingWithStreaks = activeHabits.filter((h) => {
      const isDone = completedHabits.some((c) => c.id === h.id);
      if (isDone) return false;
      const { currentStreak } = calculateHabitStreak(h, input.habitEntries, todayStr);
      return currentStreak >= 2;
    });

    if (pendingWithStreaks.length > 0) {
      const topStreakHabit = pendingWithStreaks[0];
      const { currentStreak } = calculateHabitStreak(topStreakHabit, input.habitEntries, todayStr);
      suggestions.push({
        id: 'sug-protect-streak',
        type: 'habit',
        kind: 'suggestion',
        title: `Protect Your ${currentStreak}-Day Streak`,
        content: `"${topStreakHabit.name}" has an active streak and is still pending today.`,
        actionLabel: 'Log Routine',
        actionHref: '/app/habits',
        tone: 'gold',
      });
    }
  }

  // ── 4. Focus Chamber Volume ──
  const todaySessions = input.focusSessions.filter(
    (s) => s.start_time.startsWith(todayStr) && s.status === 'completed'
  );
  const totalFocusSeconds = todaySessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
  const focusMinutes = Math.round(totalFocusSeconds / 60);

  observations.push({
    id: 'obs-focus-volume',
    type: 'focus',
    kind: 'observation',
    title: 'Deep Work Accumulation',
    content: `${focusMinutes} minutes of unbroken focus recorded today towards your ${focusTarget}m target.`,
    tone: focusMinutes >= focusTarget ? 'emerald' : 'gold',
  });

  if (focusMinutes < focusTarget) {
    const remaining = focusTarget - focusMinutes;
    suggestions.push({
      id: 'sug-focus-session',
      type: 'focus',
      kind: 'suggestion',
      title: 'Complete Target Focus Pacing',
      content: `Consider launching a ${Math.min(50, remaining)}m deep work block to reach your daily attention standard.`,
      actionLabel: 'Start Focus',
      actionHref: '/app/focus',
      tone: 'gold',
    });
  }

  // ── 5. Evening Reflection ──
  const currentHour = now.getHours();
  if (currentHour >= 18 && !input.review) {
    suggestions.push({
      id: 'sug-evening-review',
      type: 'review',
      kind: 'suggestion',
      title: 'Close the Loop With Evening Reflection',
      content: 'Calibrate your energy and document key takeaways from today before closing out your workspace.',
      actionLabel: 'Log Reflection',
      actionHref: '/app',
      tone: 'neutral',
    });
  }

  // Overall pacing calculation (0-100)
  const priorityWeight = priorityTasks.length > 0 ? (completedPriorities.length / priorityTasks.length) * 50 : 25;
  const habitWeight = activeHabits.length > 0 ? (completedHabits.length / activeHabits.length) * 30 : 15;
  const focusWeight = Math.min(20, (focusMinutes / focusTarget) * 20);
  const totalPacing = Math.round(priorityWeight + habitWeight + focusWeight);

  return {
    timestamp: new Date().toISOString(),
    observations,
    suggestions,
    productivityPacing: Math.min(100, Math.max(0, totalPacing)),
  };
}
