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
  isConfigured: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
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

  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder.supabase.co') &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );

  const fetchProfile = useCallback(async (userId: string, email?: string, metaName?: string, avatarUrl?: string) => {
    try {
      const { data: initialData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      let data = initialData;

      if (!data || error) {
        // Auto-provision profile row if missing for authenticated user
        const userEmail = email || '';
        const displayName = metaName || (userEmail ? userEmail.split('@')[0] : 'Member');
        const { data: createdProfile } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email: userEmail,
              display_name: displayName,
              avatar_url: avatarUrl || null,
            },
            { onConflict: 'id' }
          )
          .select()
          .maybeSingle();
        if (createdProfile) data = createdProfile;
      }

      if (data) setProfile(data as Profile);
    } catch (err) {
      console.warn('REGENT: Notice during profile synchronization:', err);
    }
  }, [supabase]);

  const fetchPreferences = useCallback(async (userId: string) => {
    try {
      const { data: initialData, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      let data = initialData;

      if (!data || error) {
        const { data: createdPrefs } = await supabase
          .from('user_preferences')
          .upsert(
            { user_id: userId },
            { onConflict: 'user_id' }
          )
          .select()
          .maybeSingle();
        if (createdPrefs) data = createdPrefs;
      }

      if (data) setPreferences(data as UserPreferences);
    } catch (err) {
      console.warn('REGENT: Notice during preferences synchronization:', err);
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(
        user.id,
        user.email,
        user.user_metadata?.display_name || user.user_metadata?.full_name,
        user.user_metadata?.avatar_url
      );
    }
  }, [user, fetchProfile]);

  const refreshPreferences = useCallback(async () => {
    if (user) await fetchPreferences(user.id);
  }, [user, fetchPreferences]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userMeta = session.user.user_metadata;
          await fetchProfile(
            session.user.id,
            session.user.email,
            userMeta?.display_name || userMeta?.full_name,
            userMeta?.avatar_url
          );
          await fetchPreferences(session.user.id);
        }
      } catch (error) {
        console.error('REGENT Auth initialization error:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const userMeta = session.user.user_metadata;
          await fetchProfile(
            session.user.id,
            session.user.email,
            userMeta?.display_name || userMeta?.full_name,
            userMeta?.avatar_url
          );
          await fetchPreferences(session.user.id);
        } else {
          setProfile(null);
          setPreferences(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, fetchPreferences]);

  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase environment variables are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your settings.'
        ),
      };
    }
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName || email.split('@')[0] },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase environment variables are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your settings.'
        ),
      };
    }
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signInWithGoogle = async () => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase environment variables are missing. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in your settings.'
        ),
      };
    }
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('SignOut warning:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setPreferences(null);
    }
  };

  const resetPassword = async (email: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment.'
        ),
      };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  const updatePassword = async (password: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase credentials are not configured.'
        ),
      };
    }
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error ? new Error(error.message) : null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        preferences,
        loading,
        isConfigured,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
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
