import React from 'react';

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'todo' | 'in_progress' | 'completed' | 'cancelled' | 'planning' | 'active' | 'on_hold';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'sm' | 'md';
}

export function PriorityBadge({ priority, size = 'sm' }: PriorityBadgeProps) {
  const styles: Record<Priority, string> = {
    low: 'bg-emerald-950/35 text-emerald-300/90 border-emerald-500/25',
    medium: 'bg-sky-950/35 text-sky-300/90 border-sky-500/25',
    high: 'bg-amber-950/35 text-amber-300/90 border-amber-500/25',
    urgent: 'bg-rose-950/35 text-rose-300/90 border-rose-500/25',
  };

  const sizeClasses = size === 'sm' ? 'text-[11px] px-2.5 py-0.5' : 'text-xs px-3 py-1';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border tracking-wide capitalize backdrop-blur-sm ${styles[priority]} ${sizeClasses}`}
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
    todo: 'bg-surface-3/80 text-text-secondary border-border-subtle/80',
    in_progress: 'bg-regent-gold/15 text-regent-gold border-regent-gold/30 shadow-sm shadow-regent-gold/5',
    completed: 'bg-emerald-950/35 text-emerald-300/90 border-emerald-500/25',
    cancelled: 'bg-surface-2/60 text-text-muted border-border-subtle line-through',
    planning: 'bg-indigo-950/35 text-indigo-300/90 border-indigo-500/25',
    active: 'bg-regent-gold/15 text-regent-gold border-regent-gold/30 shadow-sm shadow-regent-gold/5',
    on_hold: 'bg-amber-950/35 text-amber-300/90 border-amber-500/25',
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
