'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { getTasks } from '@/lib/services/tasks';
import { getHabits, getHabitEntries } from '@/lib/services/habits';
import { getFocusSessions } from '@/lib/services/focus';
import { getStudySessions } from '@/lib/services/study';
import { StatCard } from '@/components/ui/stat-card';
import type { Task, Habit, HabitEntry, FocusSession, StudySession } from '@/types';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  Clock,
  Target,
  Flame,
  Calendar,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

export default function InsightsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [focusSessions, setFocusSessions] = useState<FocusSession[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);

  // Time window: 7 days or 14 days
  const [timeframe, setTimeframe] = useState<7 | 14>(14);

  const loadInsightsData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - timeframe);
      const startIso = daysAgo.toISOString().split('T')[0];
      const todayIso = new Date().toISOString().split('T')[0];

      const [fTasks, fHabits, fEntries, fFocus, fStudy] = await Promise.all([
        getTasks(user.id),
        getHabits(user.id),
        getHabitEntries(user.id, startIso, todayIso),
        getFocusSessions(user.id, startIso, todayIso),
        getStudySessions(user.id, undefined, startIso, todayIso),
      ]);

      setTasks(fTasks);
      setHabits(fHabits);
      setEntries(fEntries);
      setFocusSessions(fFocus);
      setStudySessions(fStudy);
    } catch (err) {
      console.error('Failed to load insights data:', err);
    } finally {
      setLoading(false);
    }
  }, [user, timeframe]);

  useEffect(() => {
    loadInsightsData();
  }, [loadInsightsData]);

  // Generate daily timeline data for charts
  const timelineData = [];
  const now = new Date();

  for (let i = timeframe - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
    }).format(d);

    // Completed tasks on this date
    const tasksDone = tasks.filter(
      (t) => t.status === 'completed' && t.completed_at && t.completed_at.startsWith(dateStr)
    ).length;

    // Focus minutes on this date
    const dayFocus = focusSessions.filter((s) => s.start_time.startsWith(dateStr));
    const focusSec = dayFocus.reduce((acc, s) => acc + (s.actual_duration || 0), 0);
    const focusMins = Math.round(focusSec / 60);

    // Study minutes on this date
    const dayStudy = studySessions.filter((s) => s.start_time.startsWith(dateStr));
    const studyMins = dayStudy.reduce((acc, s) => acc + (s.duration || 0), 0);

    // Habit entries
    const dayEntries = entries.filter((e) => e.date === dateStr);
    const habitsCompleted = habits.filter((h) => {
      const entry = dayEntries.find((e) => e.habit_id === h.id);
      return entry && Number(entry.value) >= h.target_value;
    }).length;

    timelineData.push({
      date: dateStr,
      day: dayLabel,
      tasks: tasksDone,
      focusMinutes: focusMins,
      studyMinutes: studyMins,
      habits: habitsCompleted,
    });
  }

  // Summary Metrics
  const totalTasksCompleted = tasks.filter((t) => t.status === 'completed').length;
  const totalFocusMinutes = Math.round(
    focusSessions.reduce((acc, s) => acc + (s.actual_duration || 0), 0) / 60
  );
  const totalStudyHours = Math.round(
    studySessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 regent-page-divider pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Velocity & Analytics</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Insights & Trajectory
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Objective metrics illustrating execution volume, focus duration, and habit adherence.
          </p>
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-border-subtle self-start md:self-auto">
          <button
            onClick={() => setTimeframe(7)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              timeframe === 7
                ? 'bg-regent-gold text-regent-obsidian font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Past 7 Days
          </button>
          <button
            onClick={() => setTimeframe(14)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              timeframe === 14
                ? 'bg-regent-gold text-regent-obsidian font-semibold'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Past 14 Days
          </button>
        </div>
      </div>

      {/* ── High-Level Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Tasks Completed"
          value={totalTasksCompleted}
          sublabel="Lifetime execution"
          icon={CheckCircle2}
        />
        <StatCard
          label="Focus Duration"
          value={`${totalFocusMinutes}m`}
          sublabel={`In past ${timeframe} days`}
          icon={Clock}
        />
        <StatCard
          label="Study Duration"
          value={`${totalStudyHours}h`}
          sublabel="Academic immersion"
          icon={BarChart3}
        />
        <StatCard
          label="Active Habits"
          value={habits.filter((h) => h.is_active).length}
          sublabel="Tracked routines"
          icon={Target}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-80">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Chart 1: Focus & Study Minutes by Day */}
          <div className="regent-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-serif font-semibold text-text-primary">
                  Deep Focus & Study Volume (Minutes)
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Aggregated deep work sprints over the past {timeframe} days.
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded bg-regent-gold" />
                  Focus Minutes
                </span>
                <span className="flex items-center gap-1.5 text-text-secondary">
                  <span className="w-2.5 h-2.5 rounded bg-indigo-400" />
                  Study Minutes
                </span>
              </div>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={timelineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="focusGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C2A878" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#C2A878" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="studyGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818CF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#818CF8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="day"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#737373" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#171717',
                      borderColor: '#262626',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#EDEDED',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="focusMinutes"
                    name="Focus (min)"
                    stroke="#C2A878"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#focusGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="studyMinutes"
                    name="Study (min)"
                    stroke="#818CF8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#studyGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Tasks Completed & Habits Completed */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Task Velocity */}
            <div className="regent-card p-6">
              <div className="mb-6">
                <h3 className="text-base font-serif font-semibold text-text-primary">
                  Task Execution Velocity
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tasks marked completed each day.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="day"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#EDEDED',
                      }}
                    />
                    <Bar
                      dataKey="tasks"
                      name="Tasks Completed"
                      fill="#C2A878"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Habit Consistency */}
            <div className="regent-card p-6">
              <div className="mb-6">
                <h3 className="text-base font-serif font-semibold text-text-primary">
                  Habit Adherence
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Habits achieving their full numeric target.
                </p>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timelineData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis
                      dataKey="day"
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#737373"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#171717',
                        borderColor: '#262626',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#EDEDED',
                      }}
                    />
                    <Bar
                      dataKey="habits"
                      name="Habits Met"
                      fill="#34D399"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
