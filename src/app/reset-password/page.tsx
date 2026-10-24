'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

function ResetPasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verifyingSession, setVerifyingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          // Listen for PASSWORD_RECOVERY event if token exchange is still resolving
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event: AuthChangeEvent, currentSession: Session | null) => {
              if (event === 'PASSWORD_RECOVERY' || currentSession) {
                setHasValidSession(true);
              }
            }
          );
          // Give it a brief window to process hash fragments
          setTimeout(() => {
            setVerifyingSession(false);
          }, 1000);

          return () => {
            subscription.unsubscribe();
          };
        }
      } catch {
        setHasValidSession(false);
      } finally {
        setVerifyingSession(false);
      }
    };

    checkSession();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        if (
          updateError.message.includes('Failed to fetch') ||
          updateError.message.includes('Load failed') ||
          updateError.message.includes('NetworkError')
        ) {
          setError('Unable to connect to authentication server. Please check your network connection.');
        } else {
          setError(updateError.message);
        }
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/app');
        }, 2000);
      }
    } catch {
      setError('An unexpected error occurred while updating your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (verifyingSession) {
    return (
      <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <AmbientAtmosphere />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <RegentLogo variant="monogram" size="lg" />
          <Loader2 className="w-5 h-5 text-regent-gold animate-spin" />
          <p className="text-text-muted text-xs tracking-wider uppercase">Verifying recovery credentials...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <AmbientAtmosphere />
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h1 className="text-heading-1 text-regent-ivory mb-3 font-serif">Password Updated</h1>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Your credentials have been securely updated. Redirecting to your command center...
          </p>
          <Link href="/app" className="regent-btn regent-btn-primary">
            <span>Proceed to Dashboard</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6 py-12 overflow-hidden">
      <AmbientAtmosphere />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <RegentLogo variant="full" size="md" />
          </div>
          <h1 className="font-serif text-3xl font-light text-regent-ivory mb-2">
            Reset Password
          </h1>
          <p className="text-text-secondary text-sm">
            Choose a strong, unique password for your account.
          </p>
        </div>

        {!hasValidSession && (
          <div className="p-4 rounded-xl bg-surface-2 border border-border-subtle mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-regent-gold shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary space-y-1">
              <p className="font-semibold text-regent-ivory">Recovery link required</p>
              <p>
                To reset your password, please use the link sent to your email. If you have arrived here directly or your link has expired, please request a new reset link.
              </p>
              <div className="pt-2">
                <Link href="/login" className="text-regent-gold hover:underline font-medium">
                  Return to sign in →
                </Link>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="newPassword" className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="regent-input pl-10"
                placeholder="At least 8 characters"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-medium text-text-secondary uppercase tracking-wider block mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="regent-input pl-10"
                placeholder="Re-enter password"
                required
                minLength={8}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-regent-error/10 border border-regent-error/20 text-regent-error text-xs leading-relaxed">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="regent-btn regent-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-text-muted">
          Remember your password?{' '}
          <Link href="/login" className="text-regent-gold hover:text-regent-gold-light transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-regent-obsidian flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
