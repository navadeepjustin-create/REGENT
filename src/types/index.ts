/* ============================================
   REGENT — Type Definitions
   ============================================ */

// ── User & Profile ──
export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  workspace_type: 'student' | 'professional' | 'developer' | 'fitness' | 'general';
  timezone: string;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  enabled_modules: string[];
  theme: 'dark' | 'light' | 'system';
  daily_success_rule: DailySuccessRule;
  starter_habits: string[];
  primary_goals: string[];
  created_at: string;
  updated_at: string;
}

export interface DailySuccessRule {
  type: 'habits_count' | 'priority_tasks' | 'focus_minutes' | 'custom';
  min_habits?: number;
  require_priorities?: boolean;
  min_focus_minutes?: number;
  custom_description?: string;
}

// ── Tasks ──
export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  project_id: string | null;
  subject_id: string | null;
  category: string | null;
  tags: string[];
  is_priority_task: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Habits ──
export type HabitSchedule = 'daily' | 'weekdays' | 'custom';
export type HabitCategory = 'health' | 'fitness' | 'learning' | 'productivity' | 'mindfulness' | 'social' | 'creative' | 'finance' | 'other';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: HabitCategory;
  icon: string;
  schedule_type: HabitSchedule;
  schedule_days: number[]; // 0=Sun, 1=Mon, etc.
  target_value: number;
  unit: string;
  start_date: string;
  rest_days: number[]; // day numbers that are rest days
  is_active: boolean;
  is_archived: boolean;
  contributes_to_daily_success: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface HabitEntry {
  id: string;
  habit_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ── Focus Sessions ──
export type FocusSessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface FocusSession {
  id: string;
  user_id: string;
  task_id: string | null;
  status: FocusSessionStatus;
  work_duration: number; // minutes
  break_duration: number; // minutes
  start_time: string;
  end_time: string | null;
  actual_duration: number | null; // seconds
  paused_duration: number; // seconds accumulated pause time
  notes: string | null;
  created_at: string;
}

// ── Projects ──
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string | null;
  priority: TaskPriority;
  status: ProjectStatus;
  target_date: string | null;
  progress: number; // 0-100 calculated
  created_at: string;
  updated_at: string;
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  is_completed: boolean;
  completed_at: string | null;
  sort_order: number;
  created_at: string;
}

// ── Study / Academic ──
export interface Subject {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  semester: string | null;
  institution: string | null;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SyllabusUnit {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Assignment {
  id: string;
  subject_id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  is_backlog: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  subject_id: string;
  unit_id: string | null;
  topic: string | null;
  start_time: string;
  end_time: string | null;
  duration: number | null; // minutes
  notes: string | null;
  task_id: string | null;
  created_at: string;
}

// ── Daily Reviews ──
export interface DailyReview {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  reflection: string | null;
  mood: number | null; // 1-5
  energy: number | null; // 1-5
  accomplishments: string[];
  tomorrow_priorities: string[];
  created_at: string;
  updated_at: string;
}

// ── App Navigation ──
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  module?: string;
}

// ── Calendar ──
export interface DayData {
  date: string;
  isSuccess: boolean | null; // null = not tracked/future
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  focusMinutes: number;
  studyMinutes: number;
  hasReview: boolean;
}

// ── Analytics ──
export interface WeeklyStats {
  tasksCompleted: number;
  habitsCompletionRate: number;
  focusMinutes: number;
  studyMinutes: number;
  streakDays: number;
}

export interface InsightData {
  period: string;
  tasks: number;
  habits: number;
  focus: number;
  study: number;
}
