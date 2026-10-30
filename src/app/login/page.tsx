'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import { sanitizeRedirectPath } from '@/lib/utils';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, signInWithGoogle, resetPassword, isConfigured } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');
  const callbackError = searchParams.get('error');

  useEffect(() => {
    if (callbackError) {
      if (callbackError === 'auth_callback_failed') {
        setError('Authentication callback encountered an error. Please try signing in again.');
      } else if (callbackError === 'missing_credentials') {
        setError('Supabase environment credentials are not configured.');
      } else {
        setError(decodeURIComponent(callbackError));
      }
    }
  }, [callbackError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      if (
        error.message.includes('Failed to fetch') ||
        error.message.includes('Load failed') ||
        error.message.includes('placeholder')
      ) {
        setError('Unable to connect to Supabase. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are configured.');
      } else {
        setError(error.message);
      }
    } else {
      const destination = sanitizeRedirectPath(redirectedFrom, '/app');
      router.push(destination);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    if (error) {
      setGoogleLoading(false);
      setError(error.message);
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
      <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <AmbientAtmosphere />
        <div className="relative z-10 max-w-md w-full text-center">
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
    <div className="relative min-h-screen bg-regent-obsidian flex overflow-hidden">
      <AmbientAtmosphere />

      {/* Left panel */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-border-subtle" style={{background: 'linear-gradient(135deg, rgba(17,18,16,0.95) 0%, rgba(11,12,10,0.98) 100%)'}}>
        <div className="absolute top-0 left-0 w-full h-64 bg-[radial-gradient(ellipse_at_top_left,rgba(194,168,120,0.10),transparent_70%)] pointer-events-none" />
        <RegentLogo variant="full" size="md" />
        <div>
          <div className="w-10 h-px bg-gradient-to-r from-regent-gold/60 to-transparent mb-8" />
          <h2 className="font-serif text-[3.25rem] font-light leading-[1.1] tracking-[-0.03em] text-regent-ivory mb-5">
            Welcome back.
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            Your command center awaits.
          </p>
        </div>
        <p className="text-caption">© 2026 REGENT</p>
      </div>

      {/* Right panel */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
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

          {!resetMode && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || !isConfigured}
                className="regent-btn regent-btn-secondary w-full py-3 mb-5 flex items-center justify-center gap-3 border-border-subtle hover:border-regent-gold/40 hover:bg-surface-3 transition-all disabled:opacity-50"
              >
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-regent-gold" />
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>

              <div className="relative flex items-center justify-center mb-5">
                <div className="border-t border-border-subtle w-full" />
                <span className="bg-regent-obsidian px-3 text-xs text-text-muted uppercase tracking-wider font-mono">
                  or with email
                </span>
                <div className="border-t border-border-subtle w-full" />
              </div>
            </>
          )}

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
              <div className="p-3 rounded-lg bg-regent-error/10 border border-regent-error/20 text-regent-error text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
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
