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
  const trimmedTitle = task.title?.trim();
  if (!trimmedTitle) {
    throw new Error('Task title is required.');
  }
  if (trimmedTitle.length > 500) {
    throw new Error('Task title cannot exceed 500 characters.');
  }

  const supabase = createClient();
  const payload = {
    user_id: userId,
    title: trimmedTitle,
    description: task.description?.trim() || null,
    status: task.status || 'todo',
    priority: task.priority || 'medium',
    start_date: task.start_date || null,
    due_date: task.due_date || null,
    project_id: task.project_id || null,
    subject_id: task.subject_id || null,
    category: task.category || null,
    tags: Array.isArray(task.tags) ? task.tags : [],
    is_priority_task: Boolean(task.is_priority_task),
  };

  let { data, error } = await supabase
    .from('tasks')
    .insert(payload)
    .select()
    .single();

  // If foreign key constraint on profiles table fails (code 23503), ensure profile exists and retry
  if (error && (error.code === '23503' || error.message?.includes('profiles'))) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          },
          { onConflict: 'id' }
        );

      const retry = await supabase
        .from('tasks')
        .insert(payload)
        .select()
        .single();

      data = retry.data;
      error = retry.error;
    }
  }

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
