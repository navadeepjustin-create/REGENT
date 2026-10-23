import { createClient } from '@/lib/supabase/client';
import type { Subject, SyllabusUnit, Assignment, StudySession } from '@/types';

// ── Subjects ──
export async function getSubjects(userId: string): Promise<Subject[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching subjects:', error);
    throw error;
  }
  return (data || []) as Subject[];
}

export async function createSubject(userId: string, subject: Partial<Subject>): Promise<Subject> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      user_id: userId,
      name: subject.name,
      code: subject.code || null,
      semester: subject.semester || null,
      institution: subject.institution || null,
      color: subject.color || '#C2A878',
      is_active: subject.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating subject:', error);
    throw error;
  }
  return data as Subject;
}

export async function updateSubject(subjectId: string, updates: Partial<Subject>): Promise<Subject> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('subjects')
    .update(updates)
    .eq('id', subjectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating subject:', error);
    throw error;
  }
  return data as Subject;
}

export async function deleteSubject(subjectId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('subjects')
    .delete()
    .eq('id', subjectId);

  if (error) {
    console.error('Error deleting subject:', error);
    throw error;
  }
}

// ── Syllabus Units ──
export async function getSyllabusUnits(subjectId: string): Promise<SyllabusUnit[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('syllabus_units')
    .select('*')
    .eq('subject_id', subjectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching syllabus units:', error);
    throw error;
  }
  return (data || []) as SyllabusUnit[];
}

export async function createSyllabusUnit(
  userId: string,
  subjectId: string,
  unit: Partial<SyllabusUnit>
): Promise<SyllabusUnit> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('syllabus_units')
    .insert({
      user_id: userId,
      subject_id: subjectId,
      title: unit.title,
      description: unit.description || null,
      sort_order: unit.sort_order || 0,
      is_completed: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating syllabus unit:', error);
    throw error;
  }
  return data as SyllabusUnit;
}

export async function updateSyllabusUnit(
  unitId: string,
  updates: Partial<SyllabusUnit>
): Promise<SyllabusUnit> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...updates };
  if (updates.is_completed !== undefined) {
    payload.completed_at = updates.is_completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('syllabus_units')
    .update(payload)
    .eq('id', unitId)
    .select()
    .single();

  if (error) {
    console.error('Error updating syllabus unit:', error);
    throw error;
  }
  return data as SyllabusUnit;
}

export async function deleteSyllabusUnit(unitId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('syllabus_units')
    .delete()
    .eq('id', unitId);

  if (error) {
    console.error('Error deleting syllabus unit:', error);
    throw error;
  }
}

// ── Assignments ──
export async function getAssignments(userId: string, subjectId?: string): Promise<Assignment[]> {
  const supabase = createClient();
  let query = supabase
    .from('assignments')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching assignments:', error);
    throw error;
  }
  return (data || []) as Assignment[];
}

export async function createAssignment(
  userId: string,
  assignment: Partial<Assignment>
): Promise<Assignment> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assignments')
    .insert({
      user_id: userId,
      subject_id: assignment.subject_id,
      title: assignment.title,
      description: assignment.description || null,
      due_date: assignment.due_date || null,
      status: assignment.status || 'todo',
      priority: assignment.priority || 'medium',
      is_backlog: assignment.is_backlog ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating assignment:', error);
    throw error;
  }
  return data as Assignment;
}

export async function updateAssignment(
  assignmentId: string,
  updates: Partial<Assignment>
): Promise<Assignment> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...updates };
  if (updates.status === 'completed' && !updates.completed_at) {
    payload.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== 'completed') {
    payload.completed_at = null;
  }

  const { data, error } = await supabase
    .from('assignments')
    .update(payload)
    .eq('id', assignmentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assignment:', error);
    throw error;
  }
  return data as Assignment;
}

export async function deleteAssignment(assignmentId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('assignments')
    .delete()
    .eq('id', assignmentId);

  if (error) {
    console.error('Error deleting assignment:', error);
    throw error;
  }
}

// ── Study Sessions ──
export async function getStudySessions(
  userId: string,
  subjectId?: string,
  startDate?: string,
  endDate?: string
): Promise<StudySession[]> {
  const supabase = createClient();
  let query = supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false });

  if (subjectId) {
    query = query.eq('subject_id', subjectId);
  }
  if (startDate) {
    query = query.gte('start_time', `${startDate}T00:00:00`);
  }
  if (endDate) {
    query = query.lte('start_time', `${endDate}T23:59:59`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching study sessions:', error);
    throw error;
  }
  return (data || []) as StudySession[];
}

export async function logStudySession(
  userId: string,
  session: Partial<StudySession>
): Promise<StudySession> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      subject_id: session.subject_id,
      unit_id: session.unit_id || null,
      topic: session.topic || null,
      start_time: session.start_time || new Date().toISOString(),
      end_time: session.end_time || null,
      duration: session.duration || 0,
      notes: session.notes || null,
      task_id: session.task_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error logging study session:', error);
    throw error;
  }
  return data as StudySession;
}
