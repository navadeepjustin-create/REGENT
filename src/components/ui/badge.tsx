import React from 'react';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'planning' | 'active' | 'on_hold';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const styles: Record<Priority, string> = {
    low: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    urgent: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border capitalize ${styles[priority]} ${sizeClasses}`}
    >
      {priority}
    </span>
  );
}

interface StatusBadgeProps {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const styles: Record<Status, string> = {
    todo: 'bg-surface-3 text-text-secondary border-border-subtle',
    in_progress: 'bg-regent-gold/10 text-regent-gold border-regent-gold/30',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cancelled: 'bg-surface-2 text-text-muted border-border-subtle line-through',
    planning: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    active: 'bg-regent-gold/10 text-regent-gold border-regent-gold/30',
    on_hold: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  const labels: Record<Status, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
    planning: 'Planning',
    active: 'Active',
    on_hold: 'On Hold',
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${styles[status]} ${sizeClasses}`}
    >
      {labels[status]}
    </span>
  );
}
