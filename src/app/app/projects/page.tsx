'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
} from '@/lib/services/projects';
import { Modal } from '@/components/ui/modal';
import { PriorityBadge, StatusBadge } from '@/components/ui/badge';
import type { Project, ProjectMilestone, ProjectStatus, TaskPriority } from '@/types';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  ChevronRight,
  Loader2,
  Sparkles,
  Layers,
} from 'lucide-react';

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [milestonesLoading, setMilestonesLoading] = useState(false);

  // Create Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectCategory, setProjectCategory] = useState('');
  const [projectPriority, setProjectPriority] = useState<TaskPriority>('medium');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('active');
  const [projectTargetDate, setProjectTargetDate] = useState('');
  const [isSubmittingProject, setIsSubmittingProject] = useState(false);

  // Add Milestone Input
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await getProjects(user.id);
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedProject]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const loadMilestones = useCallback(async (projectId: string) => {
    try {
      setMilestonesLoading(true);
      const data = await getMilestones(projectId);
      setMilestones(data);
    } catch (err) {
      console.error('Failed to load milestones:', err);
    } finally {
      setMilestonesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadMilestones(selectedProject.id);
    } else {
      setMilestones([]);
    }
  }, [selectedProject, loadMilestones]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectName.trim()) return;
    try {
      setIsSubmittingProject(true);
      const created = await createProject(user.id, {
        name: projectName.trim(),
        description: projectDesc.trim() || null,
        category: projectCategory.trim() || null,
        priority: projectPriority,
        status: projectStatus,
        target_date: projectTargetDate || null,
      });
      setProjects((prev) => [created, ...prev]);
      setSelectedProject(created);
      setIsProjectModalOpen(false);
      resetProjectForm();
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsSubmittingProject(false);
    }
  };

  const resetProjectForm = () => {
    setProjectName('');
    setProjectDesc('');
    setProjectCategory('');
    setProjectPriority('medium');
    setProjectStatus('active');
    setProjectTargetDate('');
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project and all its milestones?')) return;
    try {
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleToggleMilestone = async (milestone: ProjectMilestone) => {
    if (!selectedProject) return;
    const nextCompleted = !milestone.is_completed;
    // Optimistic
    setMilestones((prev) =>
      prev.map((m) => (m.id === milestone.id ? { ...m, is_completed: nextCompleted } : m))
    );

    try {
      const updated = await updateMilestone(milestone.id, selectedProject.id, {
        is_completed: nextCompleted,
      });
      setMilestones((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m))
      );
      // Reload projects to reflect updated progress
      const refreshed = await getProjects(user!.id);
      setProjects(refreshed);
      const updatedCurrent = refreshed.find((p) => p.id === selectedProject.id);
      if (updatedCurrent) setSelectedProject(updatedCurrent);
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
      loadMilestones(selectedProject.id);
    }
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedProject || !newMilestoneTitle.trim()) return;
    try {
      setIsAddingMilestone(true);
      const created = await createMilestone(user.id, selectedProject.id, {
        title: newMilestoneTitle.trim(),
        target_date: newMilestoneDate || null,
        sort_order: milestones.length,
      });
      setMilestones((prev) => [...prev, created]);
      setNewMilestoneTitle('');
      setNewMilestoneDate('');

      // Refresh project progress
      const refreshed = await getProjects(user.id);
      setProjects(refreshed);
      const updatedCurrent = refreshed.find((p) => p.id === selectedProject.id);
      if (updatedCurrent) setSelectedProject(updatedCurrent);
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setIsAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!selectedProject) return;
    try {
      await deleteMilestone(milestoneId, selectedProject.id);
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneId));
      const refreshed = await getProjects(user!.id);
      setProjects(refreshed);
      const updatedCurrent = refreshed.find((p) => p.id === selectedProject.id);
      if (updatedCurrent) setSelectedProject(updatedCurrent);
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <FolderKanban className="w-3.5 h-3.5" />
            <span>Strategic Horizons</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Projects & Milestones
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Break complex initiatives into measurable milestones and track progress.
          </p>
        </div>

        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="regent-btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* ── Two Column View: Projects List & Project Inspector ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="regent-card p-12 text-center">
          <Sparkles className="w-10 h-10 text-regent-gold/40 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-semibold text-text-primary">
            No projects established yet
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            Organize multi-step objectives and track your milestones systematically.
          </p>
          <button
            onClick={() => setIsProjectModalOpen(true)}
            className="mt-5 regent-btn-primary text-xs"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Projects List (1 col) */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
              Active Initiatives ({projects.length})
            </h3>

            {projects.map((project) => {
              const isSelected = selectedProject?.id === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-2 border-regent-gold/50 shadow-md ring-1 ring-regent-gold/20'
                      : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-regent-gold/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-regent-gold font-semibold uppercase tracking-wider">
                      {project.category || 'Initiative'}
                    </span>
                    <StatusBadge status={project.status} size="sm" />
                  </div>

                  <h4 className="text-sm font-semibold text-text-primary line-clamp-1">
                    {project.name}
                  </h4>

                  {project.description && (
                    <p className="text-xs text-text-muted line-clamp-2 mt-1">
                      {project.description}
                    </p>
                  )}

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-text-muted">Progress</span>
                      <span className="font-semibold text-regent-gold">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-regent-gold h-full transition-all duration-300"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Project Inspector & Milestones (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {selectedProject ? (
              <div className="regent-card p-6">
                {/* Project Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={selectedProject.status} />
                      <PriorityBadge priority={selectedProject.priority} />
                    </div>
                    <h2 className="text-xl font-serif font-bold text-text-primary">
                      {selectedProject.name}
                    </h2>
                    {selectedProject.description && (
                      <p className="text-xs text-text-muted mt-1">
                        {selectedProject.description}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => handleDeleteProject(selectedProject.id)}
                    className="p-2 text-text-muted hover:text-rose-400 rounded-lg hover:bg-surface-2 transition-colors self-end sm:self-auto"
                    title="Delete project"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Target Date & Meta */}
                <div className="grid grid-cols-2 gap-4 my-4 p-3 rounded-xl bg-surface-2 border border-border-subtle text-xs">
                  <div>
                    <span className="text-text-muted block">Target Date</span>
                    <span className="text-text-primary font-medium mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-regent-gold" />
                      {selectedProject.target_date || 'None set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-text-muted block">Milestones Completed</span>
                    <span className="text-text-primary font-medium mt-0.5">
                      {milestones.filter((m) => m.is_completed).length} / {milestones.length}
                    </span>
                  </div>
                </div>

                {/* Milestones Checklist */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-regent-gold" />
                      <span>Milestones & Checkpoints</span>
                    </h3>
                  </div>

                  {milestonesLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 text-regent-gold animate-spin" />
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="text-center py-8 border border-dashed border-border-subtle rounded-xl text-xs text-text-muted">
                      No milestones created yet. Add checkpoints below.
                    </div>
                  ) : (
                    <div className="space-y-2 mb-6">
                      {milestones.map((m) => (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                            m.is_completed
                              ? 'bg-surface-2/40 border-border-subtle opacity-70'
                              : 'bg-surface-2 border-border-subtle hover:border-regent-gold/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              onClick={() => handleToggleMilestone(m)}
                              className="text-text-muted hover:text-regent-gold transition-colors shrink-0"
                            >
                              {m.is_completed ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <span
                              className={`text-xs font-medium truncate ${
                                m.is_completed
                                  ? 'line-through text-text-muted'
                                  : 'text-text-primary'
                              }`}
                            >
                              {m.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {m.target_date && (
                              <span className="text-[11px] text-text-muted">
                                {m.target_date}
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteMilestone(m.id)}
                              className="text-text-muted hover:text-rose-400 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Milestone Inline Form */}
                  <form
                    onSubmit={handleAddMilestone}
                    className="flex flex-col sm:flex-row items-center gap-2 p-2 rounded-xl bg-surface-2 border border-border-subtle"
                  >
                    <input
                      type="text"
                      required
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      placeholder="Add milestone checkpoint..."
                      className="regent-input text-xs w-full sm:flex-1 py-1.5"
                    />
                    <input
                      type="date"
                      value={newMilestoneDate}
                      onChange={(e) => setNewMilestoneDate(e.target.value)}
                      className="regent-input text-xs w-full sm:w-auto py-1.5"
                    />
                    <button
                      type="submit"
                      disabled={isAddingMilestone || !newMilestoneTitle.trim()}
                      className="regent-btn-primary text-xs px-3 py-1.5 w-full sm:w-auto flex items-center justify-center gap-1"
                    >
                      {isAddingMilestone && <Loader2 className="w-3 h-3 animate-spin" />}
                      <span>Add Checkpoint</span>
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="regent-card p-12 text-center text-xs text-text-muted">
                Select an initiative on the left to inspect milestones.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create Project Modal ── */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Create Initiative"
        description="Set strategic goals, priorities, and deadlines."
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Project Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Q4 Platform Launch, Health Transformation"
              className="regent-input w-full"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Description (Optional)
            </label>
            <textarea
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              placeholder="High-level vision and objectives"
              rows={2}
              className="regent-input w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Category
              </label>
              <input
                type="text"
                value={projectCategory}
                onChange={(e) => setProjectCategory(e.target.value)}
                placeholder="Product, Business, Fitness"
                className="regent-input w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={projectPriority}
                onChange={(e) => setProjectPriority(e.target.value as TaskPriority)}
                className="regent-input w-full bg-surface-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Status
              </label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value as ProjectStatus)}
                className="regent-input w-full bg-surface-2"
              >
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Target Completion Date
              </label>
              <input
                type="date"
                value={projectTargetDate}
                onChange={(e) => setProjectTargetDate(e.target.value)}
                className="regent-input w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="regent-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingProject || !projectName.trim()}
              className="regent-btn-primary text-xs flex items-center gap-1.5"
            >
              {isSubmittingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Initiative</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
