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

  // Historical Best Streak calculation (from habits.ts)
  let bestStreak = currentStreak;
  let runningStreak = 0;
  const forwardCursor = new Date(startDate);

  while (forwardCursor <= today) {
    const fDateStr = formatLocalDate(forwardCursor);
    const fDay = forwardCursor.getDay();
    const isSched = habit.schedule_days.includes(fDay);
    const isRest = habit.rest_days.includes(fDay);

    if (isRest || !isSched) {
      forwardCursor.setDate(forwardCursor.getDate() + 1);
      continue;
    }

    const val = entriesByDate.get(fDateStr) || 0;
    if (val >= habit.target_value) {
      runningStreak++;
      if (runningStreak > bestStreak) {
        bestStreak = runningStreak;
      }
    } else {
      runningStreak = 0;
    }
    forwardCursor.setDate(forwardCursor.getDate() + 1);
  }

  return { currentStreak, bestStreak: Math.max(currentStreak, bestStreak) };
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
    it('computes historical best streak even if current streak is lower after a missed day', () => {
      // Historical streak of 4 days: Oct 5, 6, 7, 8
      // Missed Oct 9
      // Current streak of 2 days: Oct 12, 13
      const entries = [
        { date: '2026-10-05', value: 50 },
        { date: '2026-10-06', value: 50 },
        { date: '2026-10-07', value: 50 },
        { date: '2026-10-08', value: 50 },
        // Oct 09 missed
        { date: '2026-10-12', value: 50 },
        { date: '2026-10-13', value: 50 },
      ];
      const result = calculateHabitStreak(habit, entries, '2026-10-13');
      assert.strictEqual(result.currentStreak, 2, 'Current streak should be 2');
      assert.strictEqual(result.bestStreak, 4, 'Historical best streak should be 4');
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
  });

  describe('5. Security: Open Redirect Sanitization (sanitizeRedirectPath)', () => {
    function sanitizeRedirectPath(path, fallback = '/app') {
      if (!path || typeof path !== 'string') return fallback;
      if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
        return fallback;
      }
      return path;
    }

    it('allows valid relative internal paths', () => {
      assert.strictEqual(sanitizeRedirectPath('/app'), '/app');
      assert.strictEqual(sanitizeRedirectPath('/app/tasks'), '/app/tasks');
      assert.strictEqual(sanitizeRedirectPath('/reset-password?code=123'), '/reset-password?code=123');
    });

    it('neutralizes protocol-relative open redirect attacks (//evil.com)', () => {
      assert.strictEqual(sanitizeRedirectPath('//attacker.com'), '/app');
      assert.strictEqual(sanitizeRedirectPath('//evil.org/phish'), '/app');
    });

    it('neutralizes absolute URL redirects (https://evil.com)', () => {
      assert.strictEqual(sanitizeRedirectPath('https://evil.com'), '/app');
      assert.strictEqual(sanitizeRedirectPath('http://phishing.site'), '/app');
    });

    it('neutralizes javascript: and data: schemes', () => {
      assert.strictEqual(sanitizeRedirectPath('javascript:alert(1)'), '/app');
      assert.strictEqual(sanitizeRedirectPath('data:text/html,<script>alert(1)</script>'), '/app');
    });

    it('neutralizes backslash Windows path traversal attacks', () => {
      assert.strictEqual(sanitizeRedirectPath('/\\attacker.com'), '/app');
    });

    it('falls back safely for null, undefined, and empty string', () => {
      assert.strictEqual(sanitizeRedirectPath(null), '/app');
      assert.strictEqual(sanitizeRedirectPath(undefined), '/app');
      assert.strictEqual(sanitizeRedirectPath(''), '/app');
    });
  });

  describe('6. Migration 003: Performance Indexes & Function Hardening', () => {
    const migration003 = fs.readFileSync('supabase/migrations/003_security_and_performance.sql', 'utf8');

    it('creates foreign key and query performance indexes', () => {
      const requiredIndexes = [
        'idx_tasks_subject_id',
        'idx_focus_sessions_task_id',
        'idx_study_sessions_unit_id',
        'idx_study_sessions_task_id',
        'idx_projects_user_status',
        'idx_habits_user_sort',
      ];
      requiredIndexes.forEach((idx) => {
        assert.ok(migration003.includes(idx), `Migration 003 must contain index: ${idx}`);
      });
    });

    it('hardens handle_new_user with SECURITY DEFINER and explicit search_path', () => {
      assert.ok(
        migration003.includes('SECURITY DEFINER SET search_path = public'),
        'Trigger function must explicitly set safe search_path = public'
      );
    });

    it('revokes public execute permissions on handle_new_user', () => {
      assert.ok(
        migration003.includes('REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC'),
        'Must revoke execute from PUBLIC'
      );
    });
  });

});

