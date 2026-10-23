import { createClient } from '@/lib/supabase/client';
import type { Habit, HabitEntry } from '@/types';

export async function getHabits(userId: string, includeArchived = false): Promise<Habit[]> {
  const supabase = createClient();
  let query = supabase
    .from('habits')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (!includeArchived) {
    query = query.eq('is_archived', false);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching habits:', error);
    throw error;
  }
  return (data || []) as Habit[];
}

export async function createHabit(userId: string, habit: Partial<Habit>): Promise<Habit> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habits')
    .insert({
      user_id: userId,
      name: habit.name,
      description: habit.description || null,
      category: habit.category || 'productivity',
      icon: habit.icon || 'circle-check',
      schedule_type: habit.schedule_type || 'daily',
      schedule_days: habit.schedule_days || [0, 1, 2, 3, 4, 5, 6],
      target_value: habit.target_value ?? 1,
      unit: habit.unit || 'times',
      start_date: habit.start_date || new Date().toISOString().split('T')[0],
      rest_days: habit.rest_days || [],
      is_active: habit.is_active ?? true,
      contributes_to_daily_success: habit.contributes_to_daily_success ?? true,
      sort_order: habit.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating habit:', error);
    throw error;
  }
  return data as Habit;
}

export async function updateHabit(habitId: string, updates: Partial<Habit>): Promise<Habit> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habits')
    .update(updates)
    .eq('id', habitId)
    .select()
    .single();

  if (error) {
    console.error('Error updating habit:', error);
    throw error;
  }
  return data as Habit;
}

export async function deleteHabit(habitId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('habits')
    .delete()
    .eq('id', habitId);

  if (error) {
    console.error('Error deleting habit:', error);
    throw error;
  }
}

export async function getHabitEntries(
  userId: string,
  startDate: string,
  endDate: string
): Promise<HabitEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habit_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) {
    console.error('Error fetching habit entries:', error);
    throw error;
  }
  return (data || []) as HabitEntry[];
}

export async function logHabitEntry(
  userId: string,
  habitId: string,
  date: string,
  value: number,
  notes?: string
): Promise<HabitEntry> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('habit_entries')
    .upsert(
      {
        user_id: userId,
        habit_id: habitId,
        date,
        value,
        notes: notes || null,
      },
      {
        onConflict: 'habit_id,date',
      }
    )
    .select()
    .single();

  if (error) {
    console.error('Error logging habit entry:', error);
    throw error;
  }
  return data as HabitEntry;
}

/**
 * Calculates current streak for a habit, respecting scheduled days and rest days.
 * Rest days and unscheduled days do NOT break the streak.
 */
export function calculateHabitStreak(
  habit: Habit,
  entries: HabitEntry[],
  todayStr: string = new Date().toISOString().split('T')[0]
): { currentStreak: number; bestStreak: number } {
  const entriesByDate = new Map<string, number>();
  entries.forEach((e) => entriesByDate.set(e.date, Number(e.value)));

  const today = new Date(todayStr + 'T00:00:00');
  let currentStreak = 0;
  let cursor = new Date(today);

  // Check today first. If today is scheduled and met target, count it.
  // If not met today yet, we start checking from yesterday so today in progress doesn't break streak.
  const todayDayOfWeek = cursor.getDay();
  const isTodayScheduled = habit.schedule_days.includes(todayDayOfWeek);
  const isTodayRestDay = habit.rest_days.includes(todayDayOfWeek);
  const todayVal = entriesByDate.get(todayStr) || 0;

  if (isTodayScheduled && !isTodayRestDay && todayVal >= habit.target_value) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  } else if (!isTodayScheduled || isTodayRestDay) {
    // If today is a rest day, start checking backwards from yesterday
    cursor.setDate(cursor.getDate() - 1);
  } else {
    // Today not met yet, check backwards from yesterday
    cursor.setDate(cursor.getDate() - 1);
  }

  // Go backwards up to 365 days
  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split('T')[0];
    const dayOfWeek = cursor.getDay();
    const isScheduled = habit.schedule_days.includes(dayOfWeek);
    const isRest = habit.rest_days.includes(dayOfWeek);

    if (cursor < new Date(habit.start_date + 'T00:00:00')) {
      break;
    }

    if (!isScheduled || isRest) {
      // Allowed rest/off day; does not increment nor break streak
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const val = entriesByDate.get(dateStr) || 0;
    if (val >= habit.target_value) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      // Missed scheduled day: streak ends
      break;
    }
  }

  return { currentStreak, bestStreak: Math.max(currentStreak, 0) };
}
