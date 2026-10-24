-- ── REGENT Forward Migration: Security, Constraint Idempotency & Triggers ──
-- Migration: 003_production_security_and_constraints.sql
-- Applies forward fixes for:
-- 1. Idempotent foreign keys with definition validation (fk_tasks_project, fk_tasks_subject)
-- 2. SECURITY DEFINER safe search_path and execution privileges
-- 3. Idempotent handle_new_user() trigger with ON CONFLICT guards

-- ── 1. Safe Foreign Key: tasks -> projects ──
DO $$
DECLARE
  v_exists boolean;
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_project'
  ) INTO v_exists;

  IF v_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_class f ON c.confrelid = f.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' 
        AND t.relname = 'tasks' 
        AND c.conname = 'fk_tasks_project'
        AND f.relname = 'projects'
        AND c.confdeltype = 'n'
    ) INTO v_valid;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'Constraint fk_tasks_project exists on table tasks but has an invalid definition!';
    END IF;
  ELSE
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. Safe Foreign Key: tasks -> subjects ──
DO $$
DECLARE
  v_exists boolean;
  v_valid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public' AND t.relname = 'tasks' AND c.conname = 'fk_tasks_subject'
  ) INTO v_exists;

  IF v_exists THEN
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      JOIN pg_class f ON c.confrelid = f.oid
      JOIN pg_namespace n ON t.relnamespace = n.oid
      WHERE n.nspname = 'public' 
        AND t.relname = 'tasks' 
        AND c.conname = 'fk_tasks_subject'
        AND f.relname = 'subjects'
        AND c.confdeltype = 'n'
    ) INTO v_valid;

    IF NOT v_valid THEN
      RAISE EXCEPTION 'Constraint fk_tasks_subject exists on table tasks but has an invalid definition!';
    END IF;
  ELSE
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 3. Hardened updated_at trigger function with safe search_path ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = public;

-- ── 4. Hardened handle_new_user function with safe search_path, idempotent ON CONFLICT ──
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  INSERT INTO user_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public;

-- Revoke direct execution permissions from public/anon/authenticated (can only be run by trigger)
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;

-- Ensure trigger is attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
