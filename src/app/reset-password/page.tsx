'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { RegentLogo } from '@/components/ui/regent-logo';
import { AmbientAtmosphere } from '@/components/ui/ambient-atmosphere';
import { Lock, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuth();
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        router.push('/app');
      }, 2500);
    }
  };

  if (success) {
    return (
      <div className="relative min-h-screen bg-regent-obsidian flex items-center justify-center px-6">
        <AmbientAtmosphere />
        <div className="relative z-10 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center mx-auto mb-6 shadow-md shadow-emerald-500/10">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <h1 className="text-2xl md:text-3xl font-serif text-regent-ivory mb-3 font-normal">
            Password updated
          </h1>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Your new password has been established. Redirecting you into your command center...
          </p>
          <Link href="/app" className="regent-btn regent-btn-primary">
            Go to Command Center
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
          <RegentLogo variant="monogram" size="md" className="mx-auto mb-4" />
          <h1 className="text-2xl md:text-3xl font-serif text-regent-ivory font-normal">
            Set new password
          </h1>
          <p className="text-sm text-text-secondary mt-2">
            Establish a secure password for your REGENT account.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="regent-card-elevated p-8 space-y-5">
          <div>
            <label htmlFor="newPassword" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-2">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="newPassword"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="regent-input pl-10"
                placeholder="At least 6 characters"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-mono uppercase tracking-wider text-text-secondary block mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="regent-input pl-10"
                placeholder="Re-enter password"
                required
                minLength={6}
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
            className="regent-btn regent-btn-primary w-full py-3 disabled:opacity-50"
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

          <div className="text-center pt-2">
            <Link href="/login" className="text-xs text-text-muted hover:text-regent-gold transition-colors">
              Return to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
