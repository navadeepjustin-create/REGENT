import { createClient } from '@/lib/supabase/client';
import type { Profile, UserPreferences } from '@/types';

export async function updateProfile(
  userId: string,
  updates: Partial<Profile>
): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    throw error;
  }
  return data as Profile;
}

export async function updatePreferences(
  userId: string,
  updates: Partial<UserPreferences>
): Promise<UserPreferences> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('user_preferences')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating preferences:', error);
    throw error;
  }
  return data as UserPreferences;
}

export async function exportAllUserData(userId: string) {
  const supabase = createClient();

  const [
    { data: profile },
    { data: preferences },
    { data: tasks },
    { data: habits },
    { data: habitEntries },
    { data: focusSessions },
    { data: projects },
    { data: milestones },
    { data: subjects },
    { data: units },
    { data: assignments },
    { data: studySessions },
    { data: reviews },
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('user_preferences').select('*').eq('user_id', userId).single(),
    supabase.from('tasks').select('*').eq('user_id', userId),
    supabase.from('habits').select('*').eq('user_id', userId),
    supabase.from('habit_entries').select('*').eq('user_id', userId),
    supabase.from('focus_sessions').select('*').eq('user_id', userId),
    supabase.from('projects').select('*').eq('user_id', userId),
    supabase.from('project_milestones').select('*').eq('user_id', userId),
    supabase.from('subjects').select('*').eq('user_id', userId),
    supabase.from('syllabus_units').select('*').eq('user_id', userId),
    supabase.from('assignments').select('*').eq('user_id', userId),
    supabase.from('study_sessions').select('*').eq('user_id', userId),
    supabase.from('daily_reviews').select('*').eq('user_id', userId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    regentVersion: '1.0.0',
    profile,
    preferences,
    tasks: tasks || [],
    habits: habits || [],
    habitEntries: habitEntries || [],
    focusSessions: focusSessions || [],
    projects: projects || [],
    projectMilestones: milestones || [],
    subjects: subjects || [],
    syllabusUnits: units || [],
    assignments: assignments || [],
    studySessions: studySessions || [],
    dailyReviews: reviews || [],
  };
}
