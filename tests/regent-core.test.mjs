import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';

/**
 * Pure streak calculation test reproducing the production logic in src/lib/services/habits.ts
 */
function calculateHabitStreak(habit, entries, todayStr) {
  const entriesByDate = new Map();
  entries.forEach((e) => entriesByDate.set(e.date, Number(e.value)));

  const today = new Date(todayStr + 'T00:00:00');
  let currentStreak = 0;
  let cursor = new Date(today);

  const todayDayOfWeek = cursor.getDay();
  const isTodayScheduled = habit.schedule_days.includes(todayDayOfWeek);
  const isTodayRestDay = habit.rest_days.includes(todayDayOfWeek);
  const todayVal = entriesByDate.get(todayStr) || 0;

  if (isTodayScheduled && !isTodayRestDay && todayVal >= habit.target_value) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  } else if (!isTodayScheduled || isTodayRestDay) {
    cursor.setDate(cursor.getDate() - 1);
  } else {
    cursor.setDate(cursor.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) {
    const dateStr = cursor.toISOString().split('T')[0];
    const dayOfWeek = cursor.getDay();
    const isScheduled = habit.schedule_days.includes(dayOfWeek);
    const isRest = habit.rest_days.includes(dayOfWeek);

    if (cursor < new Date(habit.start_date + 'T00:00:00')) {
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
  });

});
