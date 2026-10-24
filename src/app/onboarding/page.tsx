'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { updateProfile, updatePreferences } from '@/lib/services/profile';
import { createHabit } from '@/lib/services/habits';
import { createTask } from '@/lib/services/tasks';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import {
  GraduationCap,
  Code2,
  Briefcase,
  Dumbbell,
  Compass,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
} from 'lucide-react';

const PERSONAS = [
  {
    id: 'student',
    title: 'Student & Academic',
    desc: 'Master coursework, track syllabus units, assignment deadlines, and study hours.',
    icon: GraduationCap,
    modules: ['tasks', 'habits', 'calendar', 'study', 'focus'],
    starterHabits: [
      { name: 'Study & Review', target: 60, unit: 'mins', category: 'learning' as const },
      { name: 'Active Recall', target: 20, unit: 'mins', category: 'learning' as const },
    ],
    starterTask: 'Review course syllabus and add upcoming assignments',
  },
  {
    id: 'developer',
    title: 'Software Engineer & Builder',
    desc: 'Deep coding blocks, system architecture, sprint milestones, and bug triage.',
    icon: Code2,
    modules: ['tasks', 'habits', 'calendar', 'projects', 'focus', 'insights'],
    starterHabits: [
      { name: 'Deep Coding', target: 90, unit: 'mins', category: 'productivity' as const },
      { name: 'Read Documentation', target: 20, unit: 'mins', category: 'learning' as const },
    ],
    starterTask: 'Set up strategic project and break into first three milestones',
  },
  {
    id: 'professional',
    title: 'Executive & Professional',
    desc: 'High-leverage tasks, project delivery, calendar discipline, and velocity metrics.',
    icon: Briefcase,
    modules: ['tasks', 'habits', 'calendar', 'projects', 'focus', 'insights'],
    starterHabits: [
      { name: 'Priority Planning', target: 15, unit: 'mins', category: 'productivity' as const },
      { name: 'Strategic Reading', target: 30, unit: 'mins', category: 'learning' as const },
    ],
    starterTask: 'Define top 3 high-impact outcomes for the current quarter',
  },
  {
    id: 'fitness',
    title: 'Fitness & Athletic',
    desc: 'Consistent workouts, hydration metrics, sleep hygiene, and physical discipline.',
    icon: Dumbbell,
    modules: ['tasks', 'habits', 'calendar', 'focus'],
    starterHabits: [
      { name: 'Hydration Target', target: 3000, unit: 'ml', category: 'health' as const },
      { name: 'Workout Session', target: 45, unit: 'mins', category: 'fitness' as const },
    ],
    starterTask: 'Plan weekly workout split and nutrition baseline',
  },
  {
    id: 'general',
    title: 'Ambitious Achiever',
    desc: 'Versatile toolkit for habits, deep work, project execution, and daily reflection.',
    icon: Compass,
    modules: ['tasks', 'habits', 'calendar', 'projects', 'focus', 'insights'],
    starterHabits: [
      { name: 'Deep Work Sprint', target: 50, unit: 'mins', category: 'productivity' as const },
      { name: 'Daily Evening Review', target: 1, unit: 'entry', category: 'mindfulness' as const },
    ],
    starterTask: 'Perform evening daily reflection and log tomorrow priorities',
  },
];

export default function OnboardingPage() {
  const { user, refreshProfile, refreshPreferences } = useAuth();
  const router = useRouter();
  const [selectedPersonaId, setSelectedPersonaId] = useState('general');
  const [displayName, setDisplayName] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const selectedPersona = PERSONAS.find((p) => p.id === selectedPersonaId)!;

  const handleFinish = async () => {
    if (!user) return;
    try {
      setIsFinishing(true);

      // 1. Update Profile
      await updateProfile(user.id, {
        display_name: displayName.trim() || user.email?.split('@')[0] || 'Member',
        workspace_type: selectedPersona.id as 'student' | 'professional' | 'developer' | 'fitness' | 'general',
        onboarding_completed: true,
      });

      // 2. Update Preferences
      await updatePreferences(user.id, {
        enabled_modules: selectedPersona.modules,
        daily_success_rule: {
          type: 'habits_count',
          min_habits: 2,
        },
      });

      // 3. Provision starter habits
      for (const h of selectedPersona.starterHabits) {
        try {
          await createHabit(user.id, {
            name: h.name,
            target_value: h.target,
            unit: h.unit,
            category: h.category,
            schedule_type: 'daily',
            schedule_days: [0, 1, 2, 3, 4, 5, 6],
            rest_days: [],
            contributes_to_daily_success: true,
          });
        } catch {
          // Ignore if table not yet migrated
        }
      }

      // 4. Provision starter task
      try {
        await createTask(user.id, {
          title: selectedPersona.starterTask,
          priority: 'high',
          is_priority_task: true,
          due_date: new Date().toISOString().split('T')[0],
        });
      } catch {
        // Ignore
      }

      await refreshProfile();
      await refreshPreferences();

      router.push('/app');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      // Navigate anyway to avoid trapping user
      router.push('/app');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-regent-obsidian flex flex-col items-center justify-center p-4 py-12 overflow-hidden">
      <AmbientAtmosphere />
      <div className="relative z-10 w-full max-w-2xl space-y-8 animate-in fade-in duration-300">
        {/* Logo & Headline */}
        <div className="text-center space-y-3">
          <div className="flex justify-center mb-6">
            <RegentLogo variant="full" size="md" />
          </div>
          {/* Gold accent rule */}
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-regent-gold/50" />
            <span className="text-[10px] font-medium text-regent-gold tracking-[0.2em] uppercase">Setup</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-regent-gold/50" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-light text-regent-ivory leading-tight tracking-tight">
            Calibrate Your Command Center
          </h1>
          <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
            Select your primary objective. REGENT will tailor your modules, starter habits, and dashboard accordingly.
          </p>
        </div>

        {/* Display Name Input */}
        <div className="regent-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              What should we address you as?
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name or callsign"
              className="regent-input w-full text-sm"
            />
          </div>

          {/* Persona Selection */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
              Select Workspace Discipline
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERSONAS.map((p) => {
                const isSelected = selectedPersonaId === p.id;
                const Icon = p.icon;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPersonaId(p.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-surface-2 border-regent-gold shadow-md ring-1 ring-regent-gold/30'
                        : 'bg-surface-1 border-border-subtle hover:bg-surface-2 hover:border-border-subtle/80'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                          isSelected
                            ? 'bg-regent-gold/20 text-regent-gold'
                            : 'bg-surface-3 text-text-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-regent-gold text-regent-obsidian flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-semibold text-text-primary">
                      {p.title}
                    </h3>
                    <p className="text-xs text-text-muted mt-1 leading-relaxed">
                      {p.desc}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Starter Pack Preview */}
          <div className="p-4 rounded-xl bg-surface-2/60 border border-border-subtle space-y-2">
            <span className="text-[11px] font-semibold text-regent-gold uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Automated Starter Configuration
            </span>
            <p className="text-xs text-text-secondary">
              Includes starter habits ({selectedPersona.starterHabits.map((h) => h.name).join(', ')}) and pre-configured modules ({selectedPersona.modules.join(', ')}).
            </p>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              onClick={handleFinish}
              disabled={isFinishing}
              className="regent-btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-medium"
            >
              {isFinishing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Enter Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
