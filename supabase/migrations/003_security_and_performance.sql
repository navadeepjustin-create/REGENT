-- ============================================
-- REGENT 2.0 — Security & Performance Hardening
-- Version: 003 — Idempotent Indexes & Trigger Hardening
-- ============================================

-- ── 1. Foreign Key & Query Performance Indexes ──
-- Index tasks by subject_id (frequently filtered in academic / project views)
CREATE INDEX IF NOT EXISTS idx_tasks_subject_id ON tasks(subject_id);

-- Index focus_sessions by task_id (frequently joined when inspecting focus time per task)
CREATE INDEX IF NOT EXISTS idx_focus_sessions_task_id ON focus_sessions(task_id);

-- Index study_sessions by unit_id and task_id
CREATE INDEX IF NOT EXISTS idx_study_sessions_unit_id ON study_sessions(unit_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_task_id ON study_sessions(task_id);

-- Index projects by status for fast workspace queries
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);

-- Index habits by sort order for snappy drag-and-drop / ordering
CREATE INDEX IF NOT EXISTS idx_habits_user_sort ON habits(user_id, sort_order);

-- ── 2. Security Definer Function Hardening ──
-- Harden handle_new_user with fixed search_path to prevent schema injection
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execution of security definer auth trigger
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- ── 3. Realtime Publication Clean Registration ──
-- Ensure core tables are published for realtime sync if publication exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE tasks, habits, habit_entries, focus_sessions, daily_reviews, projects;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
