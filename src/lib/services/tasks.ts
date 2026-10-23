import { createClient } from '@/lib/supabase/client';
import type { Task, TaskPriority, TaskStatus } from '@/types';

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  projectId?: string;
  subjectId?: string;
  isPriority?: boolean;
  dueDate?: string;
}

export async function getTasks(userId: string, filter?: TaskFilter): Promise<Task[]> {
  const supabase = createClient();
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .order('is_priority_task', { ascending: false })
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filter?.status) {
    query = query.eq('status', filter.status);
  }
  if (filter?.priority) {
    query = query.eq('priority', filter.priority);
  }
  if (filter?.projectId) {
    query = query.eq('project_id', filter.projectId);
  }
  if (filter?.subjectId) {
    query = query.eq('subject_id', filter.subjectId);
  }
  if (filter?.isPriority !== undefined) {
    query = query.eq('is_priority_task', filter.isPriority);
  }
  if (filter?.dueDate) {
    query = query.eq('due_date', filter.dueDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
  return (data || []) as Task[];
}

export async function createTask(userId: string, task: Partial<Task>): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: task.title,
      description: task.description || null,
      status: task.status || 'todo',
      priority: task.priority || 'medium',
      start_date: task.start_date || null,
      due_date: task.due_date || null,
      project_id: task.project_id || null,
      subject_id: task.subject_id || null,
      category: task.category || null,
      tags: task.tags || [],
      is_priority_task: task.is_priority_task || false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }
  return data as Task;
}

export async function updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...updates };
  
  if (updates.status === 'completed' && !updates.completed_at) {
    payload.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== 'completed') {
    payload.completed_at = null;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single();

  if (error) {
    console.error('Error updating task:', error);
    throw error;
  }
  return data as Task;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

export async function toggleTaskComplete(taskId: string, currentStatus: TaskStatus): Promise<Task> {
  const newStatus: TaskStatus = currentStatus === 'completed' ? 'todo' : 'completed';
  return updateTask(taskId, { status: newStatus });
}
