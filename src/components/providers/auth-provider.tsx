'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { Profile, UserPreferences } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  preferences: UserPreferences | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (redirectTo?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  refreshPreferences: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string, email?: string, metaName?: string) => {
    const { data: initialData, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    let data = initialData;

    if (!data || error) {
      // Auto-provision profile row if missing for authenticated user
      const userEmail = email || '';
      const displayName = metaName || (userEmail ? userEmail.split('@')[0] : 'User');
      const { data: createdProfile } = await supabase
        .from('profiles')
        .upsert(
          {
            id: userId,
            email: userEmail,
            display_name: displayName,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();
      if (createdProfile) data = createdProfile;
    }

    if (data) setProfile(data as Profile);
  }, [supabase]);

  const fetchPreferences = useCallback(async (userId: string) => {
    const { data: initialData, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    let data = initialData;

    if (!data || error) {
      const { data: createdPrefs } = await supabase
        .from('user_preferences')
        .upsert(
          { user_id: userId },
          { onConflict: 'user_id' }
        )
        .select()
        .single();
      if (createdPrefs) data = createdPrefs;
    }

    if (data) setPreferences(data as UserPreferences);
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id, user.email, user.user_metadata?.display_name);
  }, [user, fetchProfile]);

  const refreshPreferences = useCallback(async () => {
    if (user) await fetchPreferences(user.id);
  }, [user, fetchPreferences]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userMeta = session.user.user_metadata;
          await fetchProfile(session.user.id, session.user.email, userMeta?.display_name);
          await fetchPreferences(session.user.id);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userMeta = session.user.user_metadata;
          await fetchProfile(session.user.id, session.user.email, userMeta?.display_name);
          await fetchPreferences(session.user.id);
        } else {
          setProfile(null);
          setPreferences(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, fetchPreferences]);

  const isConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    return Boolean(url && !url.includes('placeholder.supabase.co') && key && !key.includes('placeholder'));
  };

  const getMissingConfigError = () =>
    new Error(
      'Supabase credentials are not configured in Vercel. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in your Vercel Project Settings and redeploy.'
    );

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isConfigured()) {
      return { error: getMissingConfigError() };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split('@')[0] },
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured()) {
      return { error: getMissingConfigError() };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async (redirectTo?: string) => {
    if (!isConfigured()) {
      return { error: getMissingConfigError() };
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const safeNext = redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/app';
    const callbackUrl = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setPreferences(null);
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured()) {
      return { error: getMissingConfigError() };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error ? new Error(error.message) : null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        preferences,
        loading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        refreshProfile,
        refreshPreferences,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
