'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
} from '@/lib/services/tasks';
import { getProjects } from '@/lib/services/projects';
import { Modal } from '@/components/ui/modal';
import { PriorityBadge } from '@/components/ui/badge';
import { useRealtimeSync } from '@/lib/hooks/use-realtime-sync';
import type { Task, TaskPriority, TaskStatus, Project } from '@/types';
import {
  CheckSquare,
  Plus,
  Circle,
  CheckCircle2,
  Calendar,
  Star,
  Trash2,
  Tag,
  Loader2,
  Filter,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

type FilterTab = 'all' | 'today' | 'upcoming' | 'backlog' | 'completed';

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('today');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Create / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [projectId, setProjectId] = useState<string>('');
  const [isPriorityTask, setIsPriorityTask] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [fTasks, fProjects] = await Promise.all([
        getTasks(user.id),
        getProjects(user.id),
      ]);
      setTasks(fTasks);
      setProjects(fProjects);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime Cross-Device Synchronization
  useRealtimeSync({
    userId: user?.id,
    tables: ['tasks', 'projects'],
    onSync: loadData,
    enabled: !!user,
  });

  const handleToggle = async (task: Task) => {
    const nextStatus: TaskStatus = task.status === 'completed' ? 'todo' : 'completed';
    // Optimistic
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
    );

    try {
      await toggleTaskComplete(task.id, task.status);
    } catch {
      // Revert
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t))
      );
    }
  };

  const handleTogglePriority = async (task: Task) => {
    const nextVal = !task.is_priority_task;
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, is_priority_task: nextVal } : t))
    );
    try {
      await updateTask(task.id, { is_priority_task: nextVal });
    } catch {
      setTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, is_priority_task: task.is_priority_task } : t))
      );
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setDueDate(activeTab === 'today' ? todayStr : '');
    setProjectId('');
    setIsPriorityTask(activeTab === 'today');
    setTagInput('');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority);
    setDueDate(task.due_date || '');
    setProjectId(task.project_id || '');
    setIsPriorityTask(task.is_priority_task);
    setTagInput(task.tags ? task.tags.join(', ') : '');
    setFormError(null);
    setFormSuccess(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setFormError(null);
    setFormSuccess(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setFormError('Task title is required.');
      return;
    }
    if (trimmedTitle.length > 500) {
      setFormError('Task title must be 500 characters or less.');
      return;
    }

    if (!user) {
      setFormError('You must be signed in to create a task.');
      return;
    }

    const tagsArray = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      if (editingTask) {
        const updated = await updateTask(editingTask.id, {
          title: trimmedTitle,
          description: description.trim() || null,
          priority,
          due_date: dueDate || null,
          project_id: projectId || null,
          is_priority_task: isPriorityTask,
          tags: tagsArray,
        });
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setFormSuccess('Task updated successfully.');
      } else {
        const created = await createTask(user.id, {
          title: trimmedTitle,
          description: description.trim() || null,
          priority,
          due_date: dueDate || null,
          project_id: projectId || null,
          is_priority_task: isPriorityTask,
          tags: tagsArray,
        });
        setTasks((prev) => [created, ...prev]);
        setFormSuccess('Task created successfully.');
      }
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 500);
    } catch (err: unknown) {
      console.error('Failed to save task:', err);
      let errorMsg = 'Failed to save task. Please try again.';
      if (err instanceof Error) {
        errorMsg = err.message;
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        errorMsg = String((err as { message: unknown }).message);
      }
      setFormError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter logic
  const filteredTasks = tasks.filter((task) => {
    // Priority filter
    if (selectedPriority !== 'all' && task.priority !== selectedPriority) {
      return false;
    }

    // Tab filter
    if (activeTab === 'today') {
      return (
        task.status !== 'completed' &&
        (task.due_date === todayStr || task.is_priority_task)
      );
    }
    if (activeTab === 'upcoming') {
      return task.status !== 'completed' && task.due_date && task.due_date > todayStr;
    }
    if (activeTab === 'backlog') {
      return (
        task.status !== 'completed' &&
        (!task.due_date || (task.due_date < todayStr && !task.is_priority_task))
      );
    }
    if (activeTab === 'completed') {
      return task.status === 'completed';
    }
    return true; // 'all'
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 regent-page-divider pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Task Matrix</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Tasks & Priorities
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Organize action items, eliminate friction, and execute with clarity.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="regent-btn-primary flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* ── Filters & Tabs ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Tab switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-xl border border-border-subtle overflow-x-auto max-w-full">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'upcoming', label: 'Upcoming' },
              { id: 'backlog', label: 'Backlog' },
              { id: 'completed', label: 'Completed' },
              { id: 'all', label: 'All Tasks' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'bg-regent-gold text-regent-obsidian font-semibold shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-3'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-text-muted" />
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="regent-input text-xs py-1.5 bg-surface-2 border border-border-subtle"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* ── Tasks List ── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="regent-card p-12 text-center">
          <Sparkles className="w-10 h-10 text-regent-gold/40 mx-auto mb-3" />
          <h3 className="text-lg font-serif font-semibold text-text-primary">
            No tasks found
          </h3>
          <p className="text-sm text-text-muted mt-1 max-w-sm mx-auto">
            {activeTab === 'today'
              ? 'All clear for today. Add a priority item or enjoy your focus.'
              : 'Keep your mind clear by documenting your next steps.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-5 regent-btn-primary text-xs"
          >
            Create Task
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTasks.map((task) => {
            const isDone = task.status === 'completed';
            const project = projects.find((p) => p.id === task.project_id);

            return (
              <div
                key={task.id}
                className={`regent-card p-4 flex items-center justify-between gap-4 group hover:border-regent-gold/30 transition-all ${
                  isDone ? 'opacity-60 bg-surface-2/40' : ''
                }`}
              >
                {/* Left: Checkbox + Star + Title + Meta */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <button
                    onClick={() => handleToggle(task)}
                    className="shrink-0 text-text-muted hover:text-regent-gold transition-colors"
                    aria-label={isDone ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => handleTogglePriority(task)}
                    className={`shrink-0 transition-colors ${
                      task.is_priority_task
                        ? 'text-amber-400'
                        : 'text-text-muted/40 hover:text-amber-400'
                    }`}
                    title={task.is_priority_task ? 'Priority task' : 'Mark as priority'}
                  >
                    <Star
                      className={`w-4 h-4 ${
                        task.is_priority_task ? 'fill-amber-400' : ''
                      }`}
                    />
                  </button>

                  <div className="min-w-0 flex-1 cursor-pointer" onClick={() => openEditModal(task)}>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium truncate ${
                          isDone ? 'line-through text-text-muted' : 'text-text-primary'
                        }`}
                      >
                        {task.title}
                      </span>
                      {project && (
                        <span className="text-[10px] text-regent-gold font-medium bg-regent-gold/10 px-2 py-0.5 rounded-full border border-regent-gold/20 shrink-0">
                          {project.name}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-xs text-text-muted truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Badges, Date, Delete button */}
                <div className="flex items-center gap-3 shrink-0">
                  {task.tags && task.tags.length > 0 && (
                    <div className="hidden md:flex items-center gap-1">
                      {task.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] text-text-muted bg-surface-2 px-1.5 py-0.5 rounded border border-border-subtle flex items-center gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {task.due_date && (
                    <span
                      className={`text-xs flex items-center gap-1 ${
                        task.due_date === todayStr
                          ? 'text-regent-gold font-medium'
                          : task.due_date < todayStr && !isDone
                          ? 'text-rose-400 font-medium'
                          : 'text-text-muted'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{task.due_date}</span>
                    </span>
                  )}

                  <PriorityBadge priority={task.priority} />

                  <button
                    onClick={() => handleDelete(task.id)}
                    className="p-1.5 text-text-muted hover:text-rose-400 rounded-lg hover:bg-surface-2 transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create / Edit Task Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        description="Configure details, priority, and schedule."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{formSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Title
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formError) setFormError(null);
              }}
              placeholder="e.g. Prepare design specification"
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
              placeholder="Additional requirements or links"
              rows={2}
              className="regent-input w-full resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="regent-input w-full bg-surface-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="regent-input w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Project Link
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="regent-input w-full bg-surface-2"
              >
                <option value="">None (Independent)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="dev, client, review"
                className="regent-input w-full"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPriority"
              checked={isPriorityTask}
              onChange={(e) => setIsPriorityTask(e.target.checked)}
              className="rounded bg-surface-2 border-border-subtle text-regent-gold focus:ring-0"
            />
            <label htmlFor="isPriority" className="text-xs text-text-secondary">
              Highlight as Key Priority Item (Starred)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="regent-btn-ghost text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="regent-btn-primary text-xs flex items-center gap-1.5"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingTask ? 'Save Changes' : 'Create Task'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
