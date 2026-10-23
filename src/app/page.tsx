'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { RegentLogo } from '@/components/ui/regent-logo';
import {
  CalendarDays,
  Target,
  Timer,
  BookOpen,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Flame,
  FolderKanban,
  Sparkles,
  Clock,
  TrendingUp,
} from 'lucide-react';

import { KineticSphereField } from '@/components/ui/kinetic-sphere-field';

const features = [
  {
    icon: CalendarDays,
    title: 'Consistency Calendar',
    description: 'A beautiful monthly calendar that reveals your patterns. See your productive days clearly — black for success, white for gaps.',
  },
  {
    icon: Target,
    title: 'Habits & Fitness',
    description: 'Track numeric habits like push-ups, reading minutes, or study hours. See partial progress, streaks, and weekly performance.',
  },
  {
    icon: BookOpen,
    title: 'Study Planning',
    description: 'Manage subjects, syllabus units, assignments, and study sessions. Built for students who take their academic work seriously.',
  },
  {
    icon: FolderKanban,
    title: 'Projects & Goals',
    description: 'Break ambitious goals into milestones and tasks. Track progress across personal, academic, and creative projects.',
  },
  {
    icon: Timer,
    title: 'Focus Timer',
    description: 'A precision focus timer with work/break cycles. Associate sessions with tasks. Accurate even when your tab is in the background.',
  },
  {
    icon: BarChart3,
    title: 'Real Insights',
    description: 'Analytics built from your actual records. Weekly comparisons, completion rates, focus time trends, and honest progress reports.',
  },
];

const principles = [
  {
    icon: CheckCircle2,
    label: 'Real Data',
    text: 'Every metric comes from your actual records. No fabricated stats.',
  },
  {
    icon: Clock,
    label: 'Precision',
    text: 'Timezone-aware. Timestamp-accurate. Your history is reliable.',
  },
  {
    icon: Flame,
    label: 'Consistency',
    text: 'Streaks respect rest days. Future dates are never marked as failures.',
  },
  {
    icon: TrendingUp,
    label: 'Progress',
    text: 'Week-over-week. Month-over-month. See the trajectory, not just today.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-regent-obsidian text-regent-ivory">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-regent-obsidian/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <RegentLogo variant="full" size="sm" />
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm text-text-secondary hover:text-regent-ivory transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="regent-btn regent-btn-primary text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-36 pb-24 px-6 overflow-hidden">
        {/* Three.js Cinematic Background Field */}
        <KineticSphereField />

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border-default bg-surface-1/80 backdrop-blur-md mb-8">
              <Sparkles className="w-3.5 h-3.5 text-regent-gold" />
              <span className="text-[11px] font-mono tracking-widest uppercase text-regent-gold font-medium">
                Personal Command Center
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold tracking-tight mb-6 leading-[1.1]">
              A Higher Standard<br />
              <span className="text-regent-gold">for Your Time.</span>
            </h1>

            <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
              Bring your days, habits, goals, and projects into one carefully designed workspace.
              Make your progress visible, and turn intention into consistency.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/signup"
                className="regent-btn regent-btn-primary text-base px-8 py-3"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="regent-btn regent-btn-secondary text-base px-8 py-3"
              >
                Explore REGENT
              </a>
            </div>
          </motion.div>

          {/* Hero Visual — App Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            className="mt-20 relative"
          >
            <div className="regent-card-elevated p-6 md:p-10 max-w-4xl mx-auto">
              {/* Mock dashboard preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="regent-card text-left">
                  <p className="text-label mb-2">Tasks Completed</p>
                  <p className="text-metric text-regent-ivory">12</p>
                  <p className="text-caption mt-1">of 15 today</p>
                </div>
                <div className="regent-card text-left">
                  <p className="text-label mb-2">Habits</p>
                  <p className="text-metric text-regent-gold">7/8</p>
                  <p className="text-caption mt-1">87% completion</p>
                </div>
                <div className="regent-card text-left">
                  <p className="text-label mb-2">Focus Time</p>
                  <p className="text-metric text-regent-ivory">2h 45m</p>
                  <p className="text-caption mt-1">3 sessions</p>
                </div>
              </div>
              
              {/* Mini calendar preview */}
              <div className="regent-card">
                <p className="text-label mb-4">October Consistency</p>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: 31 }, (_, i) => {
                    const isSuccess = i < 20 ? (i % 4 !== 2) : false;
                    const isFuture = i >= 22;
                    return (
                      <div
                        key={i}
                        className={`aspect-square rounded-sm flex items-center justify-center text-xs ${
                          isFuture
                            ? 'bg-surface-2 text-text-muted'
                            : isSuccess
                            ? 'bg-regent-ivory text-regent-obsidian font-medium'
                            : 'bg-surface-2 text-text-muted'
                        }`}
                      >
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-b from-regent-gold/5 via-transparent to-transparent rounded-3xl -z-10 blur-2xl" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-label mb-3">Features</p>
            <h2 className="text-heading-1 mb-4">
              Everything in its place.
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              Six integrated modules that work together. No context switching. No scattered tools.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="regent-card group"
              >
                <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center mb-4 group-hover:border-regent-gold/30 transition-colors">
                  <feature.icon className="w-5 h-5 text-regent-gold" />
                </div>
                <h3 className="text-heading-3 mb-2">{feature.title}</h3>
                <p className="text-caption leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-6 border-t border-border-subtle bg-surface-1">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-label mb-3">Principles</p>
            <h2 className="text-heading-1 mb-4">
              Built on honest foundations.
            </h2>
            <p className="text-text-secondary max-w-xl mx-auto">
              REGENT never fabricates progress, manipulates streaks, or marks a future day as missed.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {principles.map((p, i) => (
              <motion.div
                key={p.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="flex items-start gap-4 p-6 regent-card-elevated"
              >
                <div className="w-10 h-10 rounded-lg bg-regent-obsidian border border-border-subtle flex items-center justify-center shrink-0">
                  <p.icon className="w-5 h-5 text-regent-gold" />
                </div>
                <div>
                  <h3 className="text-heading-3 mb-1">{p.label}</h3>
                  <p className="text-caption">{p.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 border-t border-border-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-heading-1 mb-4">
              Ready to set a higher standard?
            </h2>
            <p className="text-text-secondary mb-8 max-w-lg mx-auto">
              Plan with intent. Execute with discipline. Build a life you are proud of.
            </p>
            <Link
              href="/signup"
              className="regent-btn regent-btn-primary text-base px-8 py-3"
            >
              Get Started — Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border-subtle bg-surface-1">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <RegentLogo variant="monogram" size="sm" />
              <span className="text-caption">A Higher Standard for Your Time.</span>
            </div>
            <div className="flex items-center gap-6 text-caption">
              <Link href="/privacy" className="hover:text-regent-ivory transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-regent-ivory transition-colors">
                Terms
              </Link>
              <span>© 2026 REGENT</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
