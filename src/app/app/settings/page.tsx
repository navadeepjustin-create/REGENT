'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { updateProfile, updatePreferences, exportAllUserData } from '@/lib/services/profile';
import type { DailySuccessRule } from '@/types';
import {
  Settings,
  User,
  Sliders,
  Database,
  Download,
  LogOut,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Target,
} from 'lucide-react';

const ALL_MODULES = [
  { id: 'tasks', label: 'Tasks & Priorities', description: 'Action items, subtasks, and backlog management.' },
  { id: 'habits', label: 'Habits & Routines', description: 'Numeric progress logging and streak continuity.' },
  { id: 'calendar', label: 'Calendar & Accountability', description: 'Execution history with strict success evaluation.' },
  { id: 'study', label: 'Academic & Study', description: 'Syllabus units, assignments, and study hour tracking.' },
  { id: 'projects', label: 'Projects & Milestones', description: 'Strategic initiatives with checkpoints.' },
  { id: 'focus', label: 'Focus & Flow (Pomodoro)', description: 'Chamber timer with ambient chime and metrics.' },
  { id: 'insights', label: 'Insights & Velocity', description: 'Deep charts showing performance trajectories.' },
];

export default function SettingsPage() {
  const { user, profile, preferences, refreshProfile, refreshPreferences, signOut } = useAuth();
  const router = useRouter();

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<string>('general');
  const [timezone, setTimezone] = useState('UTC');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);

  // Enabled Modules
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [isSavingModules, setIsSavingModules] = useState(false);

  // Daily Success Rule
  const [successRuleType, setSuccessRuleType] = useState<string>('habits_count');
  const [minHabits, setMinHabits] = useState(3);
  const [minFocusMinutes, setMinFocusMinutes] = useState(50);
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setWorkspaceType(profile.workspace_type || 'general');
      setTimezone(profile.timezone || 'UTC');
    }
  }, [profile]);

  useEffect(() => {
    if (preferences) {
      setEnabledModules(preferences.enabled_modules || ['tasks', 'habits', 'calendar', 'focus', 'insights']);
      if (preferences.daily_success_rule) {
        setSuccessRuleType(preferences.daily_success_rule.type || 'habits_count');
        setMinHabits(preferences.daily_success_rule.min_habits || 3);
        setMinFocusMinutes(preferences.daily_success_rule.min_focus_minutes || 50);
      }
    }
  }, [preferences]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsSavingProfile(true);
      await updateProfile(user.id, {
        display_name: displayName.trim(),
        workspace_type: workspaceType as 'student' | 'professional' | 'developer' | 'fitness' | 'general',
        timezone,
      });
      await refreshProfile();
      setProfileSuccessMsg(true);
      setTimeout(() => setProfileSuccessMsg(false), 3000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleToggleModule = async (moduleId: string) => {
    if (!user) return;
    const nextModules = enabledModules.includes(moduleId)
      ? enabledModules.filter((m) => m !== moduleId)
      : [...enabledModules, moduleId];

    setEnabledModules(nextModules);
    try {
      setIsSavingModules(true);
      await updatePreferences(user.id, {
        enabled_modules: nextModules,
      });
      await refreshPreferences();
    } catch (err) {
      console.error('Failed to update modules:', err);
    } finally {
      setIsSavingModules(false);
    }
  };

  const handleSaveSuccessRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      setIsSavingRule(true);
      const rule: DailySuccessRule = {
        type: successRuleType as 'habits_count' | 'priority_tasks' | 'focus_minutes',
        min_habits: minHabits,
        min_focus_minutes: minFocusMinutes,
      };
      await updatePreferences(user.id, {
        daily_success_rule: rule,
      });
      await refreshPreferences();
    } catch (err) {
      console.error('Failed to update success rule:', err);
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleExportData = async () => {
    if (!user) return;
    try {
      setIsExporting(true);
      const data = await exportAllUserData(user.id);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `regent-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export data:', err);
      alert('Failed to export user data.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-regent-gold tracking-widest uppercase">
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences & System Control</span>
          </div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif font-semibold text-text-primary mt-1">
            Account & Configuration
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Tailor workspace modules, accountability thresholds, and data portability.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="regent-btn-ghost text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 self-start md:self-auto"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* ── Section 1: User Profile ── */}
      <div className="regent-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-regent-gold" />
            <h2 className="text-base font-serif font-semibold text-text-primary">
              Profile Information
            </h2>
          </div>
          {profileSuccessMsg && (
            <span className="text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your preferred name"
                className="regent-input w-full text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Email Address (Authenticated)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="regent-input w-full text-xs opacity-60 cursor-not-allowed bg-surface-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Workspace Persona
              </label>
              <select
                value={workspaceType}
                onChange={(e) => setWorkspaceType(e.target.value)}
                className="regent-input w-full bg-surface-2 text-xs"
              >
                <option value="general">General Ambitious</option>
                <option value="student">Student / Academic</option>
                <option value="developer">Software Engineer / Builder</option>
                <option value="professional">Executive / Professional</option>
                <option value="fitness">Fitness & Health Enthusiast</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Timezone
              </label>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="UTC, America/New_York, Asia/Kolkata"
                className="regent-input w-full text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="regent-btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              {isSavingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 2: Enabled Modules ── */}
      <div className="regent-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-4 h-4 text-regent-gold" />
          <h2 className="text-base font-serif font-semibold text-text-primary">
            Workspace Modules
          </h2>
        </div>
        <p className="text-xs text-text-muted mb-6">
          Toggle features on or off. Disabled modules are hidden from navigation to eliminate distraction.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ALL_MODULES.map((mod) => {
            const isEnabled = enabledModules.includes(mod.id);
            return (
              <div
                key={mod.id}
                onClick={() => handleToggleModule(mod.id)}
                className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  isEnabled
                    ? 'bg-surface-2 border-regent-gold/30'
                    : 'bg-surface-1/50 border-border-subtle opacity-50 hover:opacity-80'
                }`}
              >
                <div className="min-w-0 pr-3">
                  <p className="text-xs font-semibold text-text-primary">
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                    {mod.description}
                  </p>
                </div>

                <div
                  className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${
                    isEnabled ? 'bg-regent-gold' : 'bg-surface-3'
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-regent-obsidian absolute top-0.5 transition-transform ${
                      isEnabled ? 'left-[18px]' : 'left-1'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 3: Daily Success Rule ── */}
      <div className="regent-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-4 h-4 text-regent-gold" />
          <h2 className="text-base font-serif font-semibold text-text-primary">
            Accountability & Success Criteria
          </h2>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Determine what qualifies as a successful day in the Continuity Calendar.
        </p>

        <form onSubmit={handleSaveSuccessRule} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Primary Standard
              </label>
              <select
                value={successRuleType}
                onChange={(e) => setSuccessRuleType(e.target.value)}
                className="regent-input w-full bg-surface-2 text-xs"
              >
                <option value="habits_count">Target Habits Completed</option>
                <option value="focus_minutes">Target Focus Minutes</option>
                <option value="priority_tasks">Priority Tasks Executed</option>
              </select>
            </div>

            {successRuleType === 'habits_count' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Minimum Daily Habits Target
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={minHabits}
                  onChange={(e) => setMinHabits(Number(e.target.value))}
                  className="regent-input w-full text-xs"
                />
              </div>
            )}

            {successRuleType === 'focus_minutes' && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Minimum Deep Work Minutes
                </label>
                <input
                  type="number"
                  min="15"
                  step="15"
                  value={minFocusMinutes}
                  onChange={(e) => setMinFocusMinutes(Number(e.target.value))}
                  className="regent-input w-full text-xs"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingRule}
              className="regent-btn-secondary text-xs px-4 py-2 flex items-center gap-1.5"
            >
              {isSavingRule && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Success Criteria</span>
            </button>
          </div>
        </form>
      </div>

      {/* ── Section 4: Data Portability & Backup ── */}
      <div className="regent-card p-6">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-regent-gold" />
          <h2 className="text-base font-serif font-semibold text-text-primary">
            Data Portability & Sovereignty
          </h2>
        </div>
        <p className="text-xs text-text-muted mb-4">
          You own your data completely. Export every task, habit log, reflection, and project in standard JSON format anytime.
        </p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-surface-2 border border-border-subtle">
          <div>
            <p className="text-xs font-semibold text-text-primary">
              Full Workspace Backup (JSON)
            </p>
            <p className="text-[11px] text-text-muted mt-0.5">
              Includes all database tables, timestamps, and relational links.
            </p>
          </div>

          <button
            onClick={handleExportData}
            disabled={isExporting}
            className="regent-btn-primary text-xs px-3.5 py-2 flex items-center gap-1.5 shrink-0"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Export Data</span>
          </button>
        </div>
      </div>

      {/* ── Section 5: Cloud Connection & Security ── */}
      <div className="regent-card p-6 border-emerald-500/20 bg-surface-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-text-primary">
                Cloud Connection Active
              </p>
              <p className="text-[11px] text-text-muted">
                Protected by Supabase Row Level Security (RLS) policies.
              </p>
            </div>
          </div>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            Encrypted & Isolated
          </span>
        </div>
      </div>
    </div>
  );
}
