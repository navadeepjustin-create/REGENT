'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import { Loader2, ArrowRight, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

function SignUpForm() {
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signInWithGoogle } = useAuth();
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);

    const { error } = await signInWithGoogle('/onboarding');
    if (error) {
      if (
        error.message.includes('Unsupported provider') ||
        error.message.includes('provider is not enabled')
      ) {
        setError(
          'Google authentication is currently being calibrated in the Supabase Dashboard. Please enable the Google provider under Supabase -> Authentication -> Providers.'
        );
      } else if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('Load failed') ||
        error.message.includes('placeholder')
      ) {
        setError(
          'Unable to connect to Supabase. Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are configured in your Vercel Project Settings, then redeploy.'
        );
      } else {
        setError(error.message);
      }
      setGoogleLoading(false);
    }
  };

  const displayedError = error || (urlError === 'auth_callback_failed' ? 'Google signup was not completed. Please try again.' : urlError);

  return (
    <div className="relative min-h-screen bg-regent-obsidian flex overflow-hidden">
      <AmbientAtmosphere />

      {/* Left panel — Cinematic Brand Immersion */}
      <div
        className="relative z-10 hidden lg:flex flex-col justify-between w-1/2 p-12 lg:p-16 border-r border-border-subtle"
        style={{
          background: 'linear-gradient(135deg, rgba(17,18,16,0.95) 0%, rgba(11,12,10,0.98) 100%)',
        }}
      >
        <div className="absolute top-0 left-0 w-full h-80 bg-[radial-gradient(ellipse_at_top_left,rgba(194,168,120,0.12),transparent_70%)] pointer-events-none" />
        <RegentLogo variant="full" size="md" />

        <div className="max-w-lg">
          <div className="w-12 h-px bg-gradient-to-r from-regent-gold to-transparent mb-8" />
          <h2 className="font-serif text-[3.25rem] font-light leading-[1.1] tracking-[-0.03em] text-regent-ivory mb-5">
            Build a life<br />you are proud of.
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed mb-8">
            Plan with intent. Execute with discipline. REGENT crafts an unbroken rhythm for your daily ambitions.
          </p>

          <div className="space-y-3 pt-4 border-t border-border-subtle/60">
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-regent-gold shrink-0" />
              <span>Tailored workspaces for students, engineers, and executives</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-regent-gold shrink-0" />
              <span>Isolated database partitions with strict Row Level Security</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <CheckCircle2 className="w-4 h-4 text-regent-gold shrink-0" />
              <span>Realtime cross-device habit streaks and focus chambers</span>
            </div>
          </div>
        </div>

        <p className="text-caption text-text-muted">© 2026 REGENT. All rights reserved.</p>
      </div>

      {/* Right panel — Google Account Creation */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10 flex justify-center">
            <RegentLogo variant="full" size="md" />
          </div>

          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-2 border border-border-subtle text-[11px] font-medium text-regent-gold tracking-widest uppercase mb-4">
              <Sparkles className="w-3 h-3" />
              <span>Instant Onboarding</span>
            </div>
            <h1 className="font-serif text-3xl md:text-4xl font-light text-regent-ivory mb-3">
              Create Your Account
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed">
              Join REGENT in seconds. Authenticate with your Google account to auto-provision your personalized command center.
            </p>
          </div>

          {displayedError && (
            <div className="p-4 rounded-xl bg-regent-error/10 border border-regent-error/25 text-regent-error text-xs leading-relaxed mb-6 animate-in fade-in">
              {displayedError}
            </div>
          )}

          {/* Prominent Google Sign-Up Hero Button */}
          <div className="space-y-4">
            <button
              type="button"
              id="google-signup-btn"
              onClick={handleGoogleSignup}
              disabled={googleLoading}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-b from-surface-2 to-surface-1 border border-regent-gold/35 hover:border-regent-gold hover:shadow-[0_0_30px_rgba(194,168,120,0.18)] text-regent-ivory text-base font-medium transition-all duration-300 flex items-center justify-center gap-4 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {googleLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-regent-gold" />
                  <span className="text-text-secondary">Setting up your command center...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-regent-gold group-hover:translate-x-1 transition-all ml-auto" />
                </>
              )}
            </button>

            <div className="p-4 rounded-xl bg-surface-1/60 border border-border-subtle/80 text-[11px] text-text-muted leading-relaxed space-y-2">
              <p className="flex items-center gap-2 text-text-secondary font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-regent-gold" />
                <span>One-Click Registration</span>
              </p>
              <p>
                Your profile, starter habits, and workspace preferences will be automatically initialized from your Google credentials.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-border-subtle/60 text-center">
            <p className="text-xs text-text-muted">
              Already have an account?{' '}
              <Link
                href="/login"
                className="text-regent-gold hover:text-regent-gold-light font-medium transition-colors inline-flex items-center gap-1"
              >
                <span>Sign in with Google</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-regent-obsidian flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
