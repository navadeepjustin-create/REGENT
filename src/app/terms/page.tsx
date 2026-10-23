import React from 'react';
import Link from 'next/link';
import { RegentLogo } from '@/components/ui/regent-logo';
import { ArrowLeft, FileText } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service | REGENT',
  description: 'Terms and conditions governing the use of REGENT productivity platform.',
};

export default function TermsPage() {
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
            <FileText className="w-4 h-4" />
            <span>Legal Framework</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-text-primary">
            Terms of Service
          </h1>
          <p className="text-sm text-text-muted">
            Last updated: October 2026
          </p>
        </div>

        <div className="prose prose-invert space-y-6 text-sm leading-relaxed">
          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using REGENT, you agree to be bound by these Terms of Service. If you do not agree with any portion of these terms, you must discontinue use of the platform.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              2. User Accounts & Integrity
            </h2>
            <p>
              You are responsible for maintaining the confidentiality of your login credentials and for all activities that occur under your account. You agree to immediately notify us of any unauthorized use or security breach.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              3. Acceptable Use
            </h2>
            <p>
              You agree not to misuse REGENT services, interfere with server infrastructure, reverse engineer proprietary code, or attempt unauthorized access to other members&apos; partitioned data.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              4. Service Availability & Modifications
            </h2>
            <p>
              We continuously enhance REGENT. While we strive for 99.9% uptime, we reserve the right to alter features, perform maintenance, or deprecate endpoints with appropriate notice.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-serif font-semibold text-text-primary">
              5. Governing Law
            </h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable laws without regard to conflict of law principles.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
