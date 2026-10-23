'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.push(redirectedFrom || '/app');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await resetPassword(email);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
  };

  if (resetSent) {
    return (
      <div className="min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <RegentLogo variant="monogram" size="lg" className="mx-auto mb-8" />
          <h1 className="text-heading-1 text-regent-ivory mb-4">Check your email</h1>
          <p className="text-text-secondary mb-6">
            If an account exists for <span className="text-regent-ivory">{email}</span>,
            we&apos;ve sent a password reset link.
          </p>
          <button
            onClick={() => { setResetMode(false); setResetSent(false); }}
            className="regent-btn regent-btn-secondary"
          >
            Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-regent-obsidian flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-border-subtle bg-surface-1">
        <RegentLogo variant="full" size="md" />
        <div>
          <h2 className="text-display text-regent-ivory mb-4">
            Welcome back.
          </h2>
          <p className="text-text-secondary text-lg">
            Your command center awaits.
          </p>
        </div>
        <p className="text-caption">© 2026 REGENT</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <RegentLogo variant="full" size="md" />
          </div>

          <h1 className="text-heading-1 text-regent-ivory mb-2">
            {resetMode ? 'Reset password' : 'Sign in'}
          </h1>
          <p className="text-text-secondary mb-8">
            {resetMode
              ? 'Enter your email and we\'ll send a reset link.'
              : 'Enter your credentials to continue.'}
          </p>

          <form onSubmit={resetMode ? handleResetPassword : handleLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="text-sm text-text-secondary block mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="regent-input pl-10"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            {!resetMode && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-sm text-text-secondary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetMode(true)}
                    className="text-xs text-regent-gold hover:text-regent-gold-light transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="regent-input pl-10"
                    placeholder="Your password"
                    required
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 rounded-lg bg-regent-error/10 border border-regent-error/20 text-regent-error text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="regent-btn regent-btn-primary w-full py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {resetMode ? 'Send Reset Link' : 'Sign In'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {resetMode && (
              <button
                type="button"
                onClick={() => setResetMode(false)}
                className="regent-btn regent-btn-ghost w-full"
              >
                Back to sign in
              </button>
            )}
          </form>

          {!resetMode && (
            <p className="mt-6 text-center text-caption">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-regent-gold hover:text-regent-gold-light transition-colors">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-regent-obsidian flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-regent-gold animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
