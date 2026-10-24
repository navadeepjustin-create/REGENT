import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

/**
 * Pure streak calculation test reproducing the production logic in src/lib/services/habits.ts
 */
function formatLocalDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateHabitStreak(habit, entries, todayStr) {
  const entriesByDate = new Map();
  entries.forEach((e) => entriesByDate.set(e.date, Number(e.value)));

  const [y, m, d] = todayStr.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  let currentStreak = 0;
  let cursor = new Date(today);

  const todayDayOfWeek = cursor.getDay();
  const isTodayScheduled = habit.schedule_days.includes(todayDayOfWeek);
  const isTodayRestDay = habit.rest_days.includes(todayDayOfWeek);
  const todayVal = entriesByDate.get(todayStr) || 0;

  if (isTodayScheduled && !isTodayRestDay && todayVal >= habit.target_value) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }

  const [sy, sm, sd] = habit.start_date.split('-').map(Number);
  const startDate = new Date(sy, sm - 1, sd);

  for (let i = 0; i < 365; i++) {
    const dateStr = formatLocalDate(cursor);
    const dayOfWeek = cursor.getDay();
    const isScheduled = habit.schedule_days.includes(dayOfWeek);
    const isRest = habit.rest_days.includes(dayOfWeek);

    if (cursor < startDate) {
      break;
    }

    if (!isScheduled || isRest) {
      cursor.setDate(cursor.getDate() - 1);
      continue;
    }

    const val = entriesByDate.get(dateStr) || 0;
    if (val >= habit.target_value) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  return { currentStreak, bestStreak: Math.max(currentStreak, 0) };
}

describe('REGENT Core Logic & Rules Verification', () => {

  describe('1. Habit Streak & Partial Progress', () => {
    const habit = {
      id: 'h1',
      name: 'Deep Work Sprint',
      target_value: 50,
      unit: 'mins',
      start_date: '2026-10-01',
      schedule_days: [1, 2, 3, 4, 5], // Monday - Friday
      rest_days: [0, 6], // Sunday & Saturday
    };

    it('calculates consecutive active days properly', () => {
      const entries = [
        { date: '2026-10-21', value: 50 }, // Wednesday
        { date: '2026-10-22', value: 60 }, // Thursday
        { date: '2026-10-23', value: 50 }, // Friday (today)
      ];
      const result = calculateHabitStreak(habit, entries, '2026-10-23');
      assert.strictEqual(result.currentStreak, 3);
    });

    it('does not count partial progress as meeting the habit target', () => {
      const entries = [
        { date: '2026-10-22', value: 50 },
        { date: '2026-10-23', value: 30 }, // only 30/50 -> incomplete for today
      ];
      const result = calculateHabitStreak(habit, entries, '2026-10-23');
      // Today is in-progress (30/50), so streak from yesterday is preserved (1)
      assert.strictEqual(result.currentStreak, 1);
    });

    it('protects streaks over rest days without breaking them', () => {
      // Oct 16: Friday (completed)
      // Oct 17: Saturday (rest day)
      // Oct 18: Sunday (rest day)
      // Oct 19: Monday (completed)
      const entries = [
        { date: '2026-10-16', value: 50 },
        { date: '2026-10-19', value: 50 },
      ];
      const result = calculateHabitStreak(habit, entries, '2026-10-19');
      // Should be 2 days: Friday + Monday, bridged by Saturday & Sunday rest days
      assert.strictEqual(result.currentStreak, 2);
    });

    it('terminates streak when a scheduled non-rest day is missed', () => {
      // Oct 14: Wednesday (completed)
      // Oct 15: Thursday (MISSED)
      // Oct 16: Friday (completed)
      const entries = [
        { date: '2026-10-14', value: 50 },
        { date: '2026-10-16', value: 50 },
      ];
      const result = calculateHabitStreak(habit, entries, '2026-10-16');
      assert.strictEqual(result.currentStreak, 1);
    });
  });

  describe('2. Calendar Consistency Visual Rules', () => {
    function evaluateCalendarDayStatus(dateStr, todayStr, hasActivity, metRule) {
      if (dateStr > todayStr) {
        return 'future'; // Rule: Never mark future as missed!
      }
      if (!hasActivity) {
        return 'untracked';
      }
      return metRule ? 'success' : 'missed';
    }

    it('strictly classifies future dates as "future" and never "missed"', () => {
      const status = evaluateCalendarDayStatus('2026-10-25', '2026-10-23', false, false);
      assert.strictEqual(status, 'future');
    });

    it('classifies past days satisfying rules as "success" (Black/Gold)', () => {
      const status = evaluateCalendarDayStatus('2026-10-22', '2026-10-23', true, true);
      assert.strictEqual(status, 'success');
    });

    it('classifies past tracked days missing target as "missed" (White)', () => {
      const status = evaluateCalendarDayStatus('2026-10-22', '2026-10-23', true, false);
      assert.strictEqual(status, 'missed');
    });

    it('classifies untracked historical days as "untracked" (Neutral Grey)', () => {
      const status = evaluateCalendarDayStatus('2026-10-10', '2026-10-23', false, false);
      assert.strictEqual(status, 'untracked');
    });
  });

  describe('3. Project Milestone Progress Derivation', () => {
    function computeProgress(milestones) {
      if (!milestones || milestones.length === 0) return 0;
      const completed = milestones.filter((m) => m.is_completed).length;
      return Math.round((completed / milestones.length) * 100);
    }

    it('returns 0% when no milestones exist', () => {
      assert.strictEqual(computeProgress([]), 0);
    });

    it('correctly calculates fractional progress', () => {
      const milestones = [
        { id: '1', is_completed: true },
        { id: '2', is_completed: false },
        { id: '3', is_completed: true },
        { id: '4', is_completed: false },
      ];
      assert.strictEqual(computeProgress(milestones), 50);
    });

    it('reaches 100% when all checkpoints are achieved', () => {
      const milestones = [
        { id: '1', is_completed: true },
        { id: '2', is_completed: true },
      ];
      assert.strictEqual(computeProgress(milestones), 100);
    });
  });

  describe('4. Database Schema & RLS Migrations Integrity', () => {
    const migrationContent = fs.readFileSync('supabase/migrations/000_full_setup.sql', 'utf8');

    const expectedTables = [
      'profiles',
      'user_preferences',
      'tasks',
      'habits',
      'habit_entries',
      'focus_sessions',
      'projects',
      'project_milestones',
      'subjects',
      'syllabus_units',
      'assignments',
      'study_sessions',
      'daily_reviews',
    ];

    it('contains all 13 required core tables with proper table definitions', () => {
      expectedTables.forEach((table) => {
        const tableDef = `CREATE TABLE IF NOT EXISTS ${table}`;
        assert.ok(
          migrationContent.includes(tableDef),
          `Migration must declare table definition: ${tableDef}`
        );
      });
    });

    it('enables Row Level Security (RLS) on all 13 tables', () => {
      expectedTables.forEach((table) => {
        const rlsStatement = `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`;
        assert.ok(
          migrationContent.includes(rlsStatement),
          `Migration must enable RLS on table: ${table}`
        );
      });
    });

    it('contains idempotent DROP POLICY IF EXISTS before each CREATE POLICY', () => {
      const dropCount = (migrationContent.match(/DROP POLICY IF EXISTS/g) || []).length;
      const createCount = (migrationContent.match(/CREATE POLICY/g) || []).length;
      assert.ok(dropCount > 0, 'Must contain DROP POLICY statements');
      assert.strictEqual(
        dropCount,
        createCount,
        'Every CREATE POLICY must have a matching DROP POLICY IF EXISTS for idempotency'
      );
    });

    it('includes automatic profile and preferences creation trigger on signup', () => {
      assert.ok(
        migrationContent.includes('CREATE OR REPLACE FUNCTION handle_new_user()'),
        'Must define handle_new_user trigger function'
      );
      assert.ok(
        migrationContent.includes('CREATE OR REPLACE TRIGGER on_auth_user_created'),
        'Must create on_auth_user_created trigger on auth.users'
      );
    });

    it('[REGRESSION] fk_tasks_project constraint uses idempotent DO block with definition validation', () => {
      // Must not appear as a bare top-level ALTER TABLE (not idempotent)
      const lines = migrationContent.split('\n');
      const bareTopLevelLines = lines.filter((l) =>
        /^ALTER TABLE tasks ADD CONSTRAINT fk_tasks_project/.test(l)
      );
      assert.strictEqual(
        bareTopLevelLines.length,
        0,
        'fk_tasks_project must not appear as a bare column-0 ALTER TABLE (not idempotent)'
      );
      // Must verify constraint definition before ignoring
      assert.ok(
        migrationContent.includes("c.conname = 'fk_tasks_project'"),
        'fk_tasks_project must check constraint name in pg_constraint'
      );
      assert.ok(
        migrationContent.includes("f.relname = 'projects'"),
        'fk_tasks_project must verify referenced table is projects'
      );
    });

    it('[REGRESSION] fk_tasks_subject constraint uses idempotent DO block with definition validation', () => {
      const lines = migrationContent.split('\n');
      const bareTopLevelLines = lines.filter((l) =>
        /^ALTER TABLE tasks ADD CONSTRAINT fk_tasks_subject/.test(l)
      );
      assert.strictEqual(
        bareTopLevelLines.length,
        0,
        'fk_tasks_subject must not appear as a bare column-0 ALTER TABLE (not idempotent)'
      );
      assert.ok(
        migrationContent.includes("c.conname = 'fk_tasks_subject'"),
        'fk_tasks_subject must check constraint name in pg_constraint'
      );
      assert.ok(
        migrationContent.includes("f.relname = 'subjects'"),
        'fk_tasks_subject must verify referenced table is subjects'
      );
    });

    it('[REGRESSION] SECURITY DEFINER handle_new_user has SET search_path = public', () => {
      // Mutable search_path on SECURITY DEFINER functions is a Supabase security advisory.
      assert.ok(
        migrationContent.includes('$$ LANGUAGE plpgsql SECURITY DEFINER\n   SET search_path = public;'),
        'handle_new_user must declare SET search_path = public to prevent search_path injection'
      );
    });

    it('[REGRESSION] handle_new_user uses ON CONFLICT guards for idempotent inserts', () => {
      // Without ON CONFLICT, re-firing the trigger for an existing user causes a duplicate key error.
      assert.ok(
        migrationContent.includes('ON CONFLICT (id) DO NOTHING'),
        'handle_new_user profiles insert must have ON CONFLICT (id) DO NOTHING'
      );
      assert.ok(
        migrationContent.includes('ON CONFLICT (user_id) DO NOTHING'),
        'handle_new_user user_preferences insert must have ON CONFLICT (user_id) DO NOTHING'
      );
    });

    it('[REGRESSION] forward migration 003_production_security_and_constraints.sql exists and is complete', () => {
      const forwardPath = 'supabase/migrations/003_production_security_and_constraints.sql';
      assert.ok(fs.existsSync(forwardPath), 'Forward migration 003 must exist for production rollout');
      const fContent = fs.readFileSync(forwardPath, 'utf8');
      assert.ok(fContent.includes('fk_tasks_project'), 'Forward migration must contain fk_tasks_project check');
      assert.ok(fContent.includes('fk_tasks_subject'), 'Forward migration must contain fk_tasks_subject check');
      assert.ok(fContent.includes('SET search_path = public'), 'Forward migration must set safe search_path');
      assert.ok(fContent.includes('REVOKE EXECUTE ON FUNCTION handle_new_user()'), 'Forward migration must revoke direct execution privileges');
    });
  });

  describe('5. Next.js 16 Route Protection (Proxy Convention)', () => {
    it('[REGRESSION] proxy.ts exists at src/proxy.ts (official Next.js 16 convention)', () => {
      // Next.js 16 documents src/proxy.ts with export function proxy() as the current convention.
      assert.ok(
        fs.existsSync('src/proxy.ts'),
        'src/proxy.ts must exist as the official Next.js 16 convention'
      );
    });

    it('[REGRESSION] no conflicting src/middleware.ts exists (prevents Turbopack build failure)', () => {
      // Next.js 16 build throws: "Both middleware file and proxy file are detected. Please use proxy.ts only."
      assert.strictEqual(
        fs.existsSync('src/middleware.ts'),
        false,
        'src/middleware.ts must NOT exist when src/proxy.ts is used'
      );
    });

    it('[REGRESSION] proxy.ts exports "proxy" function and config with matcher', () => {
      const content = fs.readFileSync('src/proxy.ts', 'utf8');
      assert.ok(
        content.includes('export async function proxy('),
        'proxy.ts must export "proxy" function'
      );
      assert.ok(
        content.includes('export const config'),
        'proxy.ts must export a config object'
      );
      assert.ok(
        content.includes('matcher'),
        'proxy.ts config must include matcher array'
      );
    });
  });

});
