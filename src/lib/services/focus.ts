import { createClient } from '@/lib/supabase/client';
import type { FocusSession } from '@/types';

export async function createFocusSession(
  userId: string,
  session: Partial<FocusSession>
): Promise<FocusSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('focus_sessions')
    .insert({
      user_id: userId,
      task_id: session.task_id || null,
      status: session.status || 'active',
      work_duration: session.work_duration || 25,
      break_duration: session.break_duration || 5,
      start_time: session.start_time || new Date().toISOString(),
      actual_duration: session.actual_duration || 0,
      paused_duration: session.paused_duration || 0,
      notes: session.notes || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating focus session:', error);
    throw error;
  }
  return data as FocusSession;
}

export async function updateFocusSession(
  sessionId: string,
  updates: Partial<FocusSession>
): Promise<FocusSession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('focus_sessions')
    .update(updates)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) {
    console.error('Error updating focus session:', error);
    throw error;
  }
  return data as FocusSession;
}

export async function getFocusSessions(
  userId: string,
  startDate?: string,
  endDate?: string
): Promise<FocusSession[]> {
  const supabase = createClient();
  let query = supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (startDate) {
    query = query.gte('start_time', `${startDate}T00:00:00`);
  }
  if (endDate) {
    query = query.lte('start_time', `${endDate}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching focus sessions:', error);
    throw error;
  }
  return (data || []) as FocusSession[];
}

export async function getActiveFocusSession(userId: string): Promise<FocusSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('focus_sessions')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['active', 'paused'])
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
  return data as FocusSession | null;
}
