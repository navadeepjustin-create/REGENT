'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitEntries,
  logHabitEntry,
  calculateHabitStreak,
} from '@/lib/services/habits';
import { Modal } from '@/components/ui/modal';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import { formatLocalDate } from '@/lib/utils';
import type { Habit, HabitCategory, HabitEntry, HabitSchedule } from '@/types';
import {
  Target,
  Plus,
  Flame,
  CheckCircle2,
  Calendar,
  MoreVertical,
  Trash2,
  Archive,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const CATEGORIES: { label: string; value: HabitCategory }[] = [
  { label: 'All', value: 'other' as HabitCategory },
  { label: 'Productivity', value: 'productivity' },
  { label: 'Health', value: 'health' },
  { label: 'Fitness', value: 'fitness' },
  { label: 'Learning', value: 'learning' },
  { label: 'Mindfulness', value: 'mindfulness' },
  { label: 'Creative', value: 'creative' },
  { label: 'Finance', value: 'finance' },
];

const DAYS_OF_WEEK = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

export default function HabitsPage() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  // Create Habit Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<HabitCategory>('productivity');
  const [targetValue, setTargetValue] = useState(1);
  const [unit, setUnit] = useState('times');
  const [scheduleType, setScheduleType] = useState<HabitSchedule>('daily');
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [restDays, setRestDays] = useState<number[]>([]);
  const [contributesToSuccess, setContributesToSuccess] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Log Entry Modal
  const [selectedHabitForLog, setSelectedHabitForLog] = useState<Habit | null>(null);
  const [logValue, setLogValue] = useState<number>(1);
  const [logNote, setLogNote] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Active menu dropdown id
  const [menuHabitId, setMenuHabitId] = useState<string | null>(null);

  const todayStr = formatLocalDate(new Date());

  // Fetch 180 days of entries for accurate historical streak calculation
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - 180);
  const startIso = formatLocalDate(lookbackDate);

  const loadHabitsData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fetchedHabits, fetchedEntries] = await Promise.all([
        getHabits(user.id, false),
        getHabitEntries(user.id, startIso, todayStr),
      ]);
      setHabits(fetchedHabits);
      setEntries(fetchedEntries);
    } catch (err) {
      console.error('Failed to load habits:', err);
    } finally {
      setLoading(false);
    }
  }, [user, startIso, todayStr]);

  useEffect(() => {
    loadHabitsData();
  }, [loadHabitsData]);

  // Realtime Cross-Device Synchronization
  useRealtimeSync({
    userId: user?.id,
    tables: ['habits', 'habit_entries'],
    onSync: loadHabitsData,
    enabled: !!user,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;
    try {
      setIsSubmitting(true);
      const created = await createHabit(user.id, {
        name: name.trim(),
        description: description.trim() || null,
        category,
        target_value: Number(targetValue) || 1,
        unit: unit.trim() || 'times',
        schedule_type: scheduleType,
        schedule_days: scheduleDays,
        rest_days: restDays,
        contributes_to_daily_success: contributesToSuccess,
      });
      setHabits((prev) => [...prev, created]);
      setIsCreateOpen(false);
      resetForm();
    } catch (err) {
      console.error('Failed to create habit:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategory('productivity');
    setTargetValue(1);
    setUnit('times');
    setScheduleType('daily');
    setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
    setRestDays([]);
    setContributesToSuccess(true);
  };

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedHabitForLog) return;
    try {
      setIsLogging(true);
      const updatedEntry = await logHabitEntry(
        user.id,
        selectedHabitForLog.id,
        todayStr,
        Number(logValue),
        logNote.trim() || undefined
      );

      setEntries((prev) => {
        const filtered = prev.filter(
          (e) => !(e.habit_id === selectedHabitForLog.id && e.date === todayStr)
        );
        return [...filtered, updatedEntry];
      });

      setSelectedHabitForLog(null);
      setLogNote('');
    } catch (err) {
      console.error('Failed to log habit:', err);
    } finally {
      setIsLogging(false);
    }
  };

  const handleQuickAdd = async (habit: Habit, increment: number) => {
    if (!user) return;
    const currentEntry = entries.find(
      (e) => e.habit_id === habit.id && e.date === todayStr
    );
    const currentVal = currentEntry ? Number(currentEntry.value) : 0;
    const nextVal = Math.max(0, currentVal + increment);

    try {
      const updated = await logHabitEntry(user.id, habit.id, todayStr, nextVal);
      setEntries((prev) => {
        const filtered = prev.filter(
          (e) => !(e.habit_id === habit.id && e.date === todayStr)
        );
        return [...filtered, updated];
      });
    } catch (err) {
      console.error('Failed to update habit:', err);
    }
  };

  const handleDelete = async (habitId: string) => {
    if (!confirm('Are you sure you want to delete this habit? All history will be removed.')) return;
    try {
      await deleteHabit(habitId);
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setMenuHabitId(null);
    } catch (err) {
      console.error('Failed to delete habit:', err);
    }
  };

  const handleArchive = async (habitId: string) => {
    try {
      await updateHabit(habitId, { is_archived: true });
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setMenuHabitId(null);
    } catch (err) {
      console.error('Failed to archive habit:', err);
    }
  };

  const toggleDay = (day: number) => {
    setScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const toggleRestDay = (day: number) => {
    setRestDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const filteredHabits = selectedCategory === 'All'
    ? habits
    : habits.filter((h) => h.category === selectedCategory);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 regent-page-divider pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <Target className="w-3.5 h-3.5" />
            <span>Habit Matrix</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Habits & Discipline
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Track quantitative milestones. Partial progress is honored; rest days are respected.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="regent-btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit</span>
        </button>
      </div>

      {/* ── Category Filters ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.label}
            onClick={() => setSelectedCategory(cat.label)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              selectedCategory === cat.label
                ? 'bg-regent-gold text-regent-obsidian font-semibold'
                : 'bg-surface-2 text-text-secondary hover:text-text-primary border border-border-subtle'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Habit Cards Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      ) : filteredHabits.length === 0 ? (
        <div className="regent-card p-12 text-center">
          <Sparkles className="w-10 h-10 text-regent-gold/40 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-semibold text-text-primary">
            No habits in this category
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Design sustainable routines that compound over months and years.
          </p>
          <button
            onClick={() => setIsCreateOpen(true)}
            className="mt-5 regent-btn-primary text-xs"
          >
            Create Your First Habit
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHabits.map((habit) => {
            const entry = entries.find(
              (e) => e.habit_id === habit.id && e.date === todayStr
            );
            const val = entry ? Number(entry.value) : 0;
            const percent = Math.min(100, Math.round((val / habit.target_value) * 100));
            const isCompleted = val >= habit.target_value;
            const { currentStreak } = calculateHabitStreak(habit, entries, todayStr);

            return (
              <div
                key={habit.id}
                className="regent-card p-5 relative flex flex-col justify-between hover:border-regent-gold/30 transition-all duration-300"
              >
                <div>
                  {/* Top line: Category badge & Actions dropdown */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-semibold text-regent-gold uppercase tracking-wider bg-regent-gold/10 px-2 py-0.5 rounded-full border border-regent-gold/20">
                      {habit.category}
                    </span>

                    <div className="relative">
                      <button
                        onClick={() =>
                          setMenuHabitId(menuHabitId === habit.id ? null : habit.id)
                        }
                        className="p-1 text-text-muted hover:text-text-primary rounded hover:bg-surface-2 transition-colors"
                        aria-label="Habit options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuHabitId === habit.id && (
                        <div className="absolute right-0 top-6 w-36 bg-surface-2 border border-border-subtle rounded-xl shadow-xl py-1 z-20 animate-in fade-in zoom-in-95">
                          <button
                            onClick={() => {
                              setSelectedHabitForLog(habit);
                              setLogValue(val);
                              setMenuHabitId(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs text-text-primary hover:bg-surface-3 flex items-center gap-2"
                          >
                            <Calendar className="w-3.5 h-3.5 text-regent-gold" />
                            <span>Log Value</span>
                          </button>
                          <button
                            onClick={() => handleArchive(habit.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-3 flex items-center gap-2"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                          <button
                            onClick={() => handleDelete(habit.id)}
                            className="w-full text-left px-3 py-1.5 text-xs text-rose-400 hover:bg-surface-3 flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-serif font-semibold text-text-primary">
                    {habit.name}
                  </h3>
                  {habit.description && (
                    <p className="text-xs text-text-muted mt-1 line-clamp-2">
                      {habit.description}
                    </p>
                  )}

                  {/* Streak & Schedule info */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-text-muted">
                    <span className="flex items-center gap-1 font-medium text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-amber-400/20" />
                      {currentStreak} day streak
                    </span>
                    <span>
                      Target: {habit.target_value} {habit.unit}
                    </span>
                  </div>
                </div>

                {/* Progress & Quick controls */}
                <div className="mt-6 pt-4 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-text-secondary font-medium">
                      Today: <strong className="text-text-primary">{val}</strong> / {habit.target_value} {habit.unit}
                    </span>
                    <span className="text-xs font-semibold text-regent-gold">
                      {percent}%
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="regent-progress-track w-full h-2 mb-4">
                    <div
                      className="regent-progress-fill"
                      style={{
                        width: `${percent}%`,
                        background: isCompleted
                          ? 'linear-gradient(90deg, #34D399 0%, #6EE7B7 100%)'
                          : 'linear-gradient(90deg, #C2A878 0%, #E0CDA7 100%)',
                        boxShadow: isCompleted
                          ? '0 0 8px 0 rgba(52, 211, 153, 0.45)'
                          : '0 0 8px 0 rgba(194, 168, 120, 0.4)',
                      }}
                    />
                  </div>

                  {/* Quick Increment Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuickAdd(habit, 1)}
                      className="flex-1 py-1.5 px-2 rounded-lg bg-surface-2 hover:bg-regent-gold/15 hover:text-regent-gold border border-border-subtle text-xs font-medium transition-all"
                    >
                      +1 {habit.unit}
                    </button>
                    {habit.target_value > 5 && (
                      <button
                        onClick={() => handleQuickAdd(habit, Math.ceil(habit.target_value / 4))}
                        className="py-1.5 px-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-xs font-medium text-text-secondary transition-all"
                      >
                        +{Math.ceil(habit.target_value / 4)}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedHabitForLog(habit);
                        setLogValue(val);
                      }}
                      className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border-subtle text-text-muted hover:text-text-primary transition-all"
                      title="Custom entry"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create Habit Modal ── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Establish New Habit"
        description="Define precision metrics and schedules."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Habit Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Read Philosophy, Deep Work, Hydration"
              className="regent-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context or criteria for this habit"
              rows={2}
              className="regent-input w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as HabitCategory)}
                className="regent-input w-full bg-surface-2"
              >
                {CATEGORIES.filter((c) => c.label !== 'All').map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Target
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={targetValue}
                  onChange={(e) => setTargetValue(Number(e.target.value))}
                  className="regent-input w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  required
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="pages, mins"
                  className="regent-input w-full"
                />
              </div>
            </div>
          </div>

          {/* Schedule days */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Scheduled Days (Active Days)
            </label>
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = scheduleDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-regent-gold text-regent-obsidian border-regent-gold font-semibold'
                        : 'bg-surface-2 text-text-muted border-border-subtle hover:text-text-primary'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rest Days (Do NOT break streak) */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Designated Rest Days (Streak Protected)
            </label>
            <div className="flex gap-1.5">
              {DAYS_OF_WEEK.map((d) => {
                const isRest = restDays.includes(d.value);
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleRestDay(d.value)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      isRest
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-surface-2 text-text-muted border-border-subtle'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-text-muted mt-1">
              Rest days will pause the streak requirement without terminating your streak count.
            </p>
          </div>

          {/* Contributes to daily success */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="contributes"
              checked={contributesToSuccess}
              onChange={(e) => setContributesToSuccess(e.target.checked)}
              className="rounded bg-surface-2 border-border-subtle text-regent-gold focus:ring-0"
            />
            <label htmlFor="contributes" className="text-xs text-text-secondary">
              Count towards Daily Success Evaluation in Calendar
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="regent-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="regent-btn-primary text-xs flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Habit</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Log Entry Modal ── */}
      <Modal
        isOpen={!!selectedHabitForLog}
        onClose={() => setSelectedHabitForLog(null)}
        title={`Log ${selectedHabitForLog?.name || ''}`}
        description={`Record today's quantitative progress in ${selectedHabitForLog?.unit || 'units'}.`}
      >
        <form onSubmit={handleLogSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Value ({selectedHabitForLog?.unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              required
              autoFocus
              value={logValue}
              onChange={(e) => setLogValue(Number(e.target.value))}
              className="regent-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Notes / Context (Optional)
            </label>
            <textarea
              value={logNote}
              onChange={(e) => setLogNote(e.target.value)}
              placeholder="e.g. read chapters 3-4, morning run on trail"
              rows={2}
              className="regent-input w-full resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedHabitForLog(null)}
              className="regent-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLogging}
              className="regent-btn-primary text-xs flex items-center gap-1.5"
            >
              {isLogging && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Entry</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
