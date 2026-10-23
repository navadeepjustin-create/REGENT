import React from 'react';
import Link from 'next/link';
import { RegentLogo } from '@/components/ui/regent-logo';
import { ArrowLeft, Shield } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | REGENT',
  description: 'Our commitment to data sovereignty, encryption, and zero-compromise privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-regent-obsidian text-text-secondary py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-border-subtle pb-6">
          <RegentLogo variant="full" size="md" />
          <Link
            href="/"
            className="text-xs text-text-muted hover:text-regent-gold flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>

        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-semibold text-regent-gold tracking-widest uppercase">
            <Shield className="w-4 h-4" />
            <span>Data Sovereignty</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-text-primary">
            Privacy Policy
          </h1>
          <p className="text-sm text-text-muted">
            Last updated: October 2026
          </p>
        </div>

        <div className="prose prose-invert space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              1. Our Foundational Principle
            </h2>
            <p>
              REGENT is built for ambitious individuals whose plans, habits, reflections, and strategic milestones demand absolute confidentiality. We believe your productivity data belongs exclusively to you. We do not sell your personal data, monetize your behavior, or serve advertisements.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              2. Information We Collect
            </h2>
            <p>
              We collect information necessary to operate your productivity command center:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-text-secondary">
              <li><strong>Account Credentials:</strong> Email address and authentication tokens via Supabase.</li>
              <li><strong>User Content:</strong> Tasks, habits, numeric logs, focus sessions, projects, milestones, syllabi, and daily reflections you intentionally author.</li>
              <li><strong>Technical Metadata:</strong> System timestamps and basic telemetry required to ensure reliability and sync state.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              3. Data Security & Storage Architecture
            </h2>
            <p>
              All application data is securely hosted in cloud PostgreSQL clusters managed by Supabase. Every database row is protected by PostgreSQL <strong>Row Level Security (RLS)</strong> policies enforcing that only authenticated requests bearing your cryptographic UID can read, create, modify, or delete your records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              4. Data Portability & Deletion
            </h2>
            <p>
              You maintain uninhibited sovereignty over your data. Under your Account Settings, you may trigger a full JSON export of all your workspace tables at any time. You may also request complete and irreversible deletion of your account and associated records.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              5. Contact Us
            </h2>
            <p>
              For security disclosures or privacy inquiries, contact the REGENT engineering security team at <span className="text-regent-gold font-mono">security@regent.app</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
