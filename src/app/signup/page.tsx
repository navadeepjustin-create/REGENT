'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import { Mail, Lock, User, ArrowRight, Loader2 } from 'lucide-react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, displayName);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <AmbientAtmosphere />
        <div className="relative z-10 max-w-md w-full text-center">
          <RegentLogo variant="monogram" size="lg" className="mx-auto mb-8" />
          <h1 className="text-heading-1 text-regent-ivory mb-4">Check your email</h1>
          <p className="text-text-secondary mb-6">
            We&apos;ve sent a confirmation link to <span className="text-regent-ivory">{email}</span>.
            Click the link to activate your account.
          </p>
          <Link href="/login" className="regent-btn regent-btn-secondary">
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-regent-obsidian flex overflow-hidden">
      <AmbientAtmosphere />

      {/* Left panel — Branding */}
      <div className="relative z-10 hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-border-subtle" style={{background: 'linear-gradient(135deg, rgba(17,18,16,0.95) 0%, rgba(11,12,10,0.98) 100%)'}}>
        {/* Ambient top-left gold wash */}
        <div className="absolute top-0 left-0 w-full h-64 bg-[radial-gradient(ellipse_at_top_left,rgba(194,168,120,0.10),transparent_70%)] pointer-events-none" />
        <RegentLogo variant="full" size="md" />
        <div>
          <div className="w-10 h-px bg-gradient-to-r from-regent-gold/60 to-transparent mb-8" />
          <h2 className="font-serif text-[3.25rem] font-light leading-[1.1] tracking-[-0.03em] text-regent-ivory mb-5">
            Build a life<br />you are proud of.
          </h2>
          <p className="text-text-secondary text-lg leading-relaxed">
            Plan with intent. Execute with discipline.
          </p>
        </div>
        <p className="text-caption">© 2026 REGENT</p>
      </div>

      {/* Right panel — Form */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-10">
            <RegentLogo variant="full" size="md" />
          </div>

          <h1 className="text-heading-1 text-regent-ivory mb-2">Create your account</h1>
          <p className="text-text-secondary mb-8">Start your journey with REGENT.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="text-sm text-text-secondary block mb-1.5">
                Display Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="regent-input pl-10"
                  placeholder="Your name"
                />
              </div>
            </div>

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

            <div>
              <label htmlFor="password" className="text-sm text-text-secondary block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="regent-input pl-10"
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
              </div>
            </div>

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
                  Create Account
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-caption">
            Already have an account?{' '}
            <Link href="/login" className="text-regent-gold hover:text-regent-gold-light transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
