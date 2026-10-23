import { createClient } from '@/lib/supabase/client';
import type { Project, ProjectMilestone } from '@/types';

export async function getProjects(userId: string): Promise<Project[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
  return (data || []) as Project[];
}

export async function createProject(userId: string, project: Partial<Project>): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: userId,
      name: project.name,
      description: project.description || null,
      category: project.category || null,
      priority: project.priority || 'medium',
      status: project.status || 'planning',
      target_date: project.target_date || null,
      progress: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw error;
  }
  return data as Project;
}

export async function updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', projectId)
    .select()
    .single();

  if (error) {
    console.error('Error updating project:', error);
    throw error;
  }
  return data as Project;
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
}

export async function getMilestones(projectId: string): Promise<ProjectMilestone[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching milestones:', error);
    throw error;
  }
  return (data || []) as ProjectMilestone[];
}

export async function createMilestone(
  userId: string,
  projectId: string,
  milestone: Partial<ProjectMilestone>
): Promise<ProjectMilestone> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('project_milestones')
    .insert({
      user_id: userId,
      project_id: projectId,
      title: milestone.title,
      description: milestone.description || null,
      target_date: milestone.target_date || null,
      is_completed: false,
      sort_order: milestone.sort_order || 0,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating milestone:', error);
    throw error;
  }

  // Recalculate project progress
  await recalculateProjectProgress(projectId);

  return data as ProjectMilestone;
}

export async function updateMilestone(
  milestoneId: string,
  projectId: string,
  updates: Partial<ProjectMilestone>
): Promise<ProjectMilestone> {
  const supabase = createClient();
  const payload: Record<string, unknown> = { ...updates };
  if (updates.is_completed !== undefined) {
    payload.completed_at = updates.is_completed ? new Date().toISOString() : null;
  }

  const { data, error } = await supabase
    .from('project_milestones')
    .update(payload)
    .eq('id', milestoneId)
    .select()
    .single();

  if (error) {
    console.error('Error updating milestone:', error);
    throw error;
  }

  await recalculateProjectProgress(projectId);

  return data as ProjectMilestone;
}

export async function deleteMilestone(milestoneId: string, projectId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('project_milestones')
    .delete()
    .eq('id', milestoneId);

  if (error) {
    console.error('Error deleting milestone:', error);
    throw error;
  }

  await recalculateProjectProgress(projectId);
}

export async function recalculateProjectProgress(projectId: string): Promise<number> {
  const supabase = createClient();
  const milestones = await getMilestones(projectId);
  if (milestones.length === 0) return 0;

  const completed = milestones.filter((m) => m.is_completed).length;
  const progress = Math.round((completed / milestones.length) * 100);

  await supabase
    .from('projects')
    .update({
      progress,
      status: progress === 100 ? 'completed' : undefined,
    })
    .eq('id', projectId);

  return progress;
}
