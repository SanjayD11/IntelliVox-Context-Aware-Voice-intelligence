import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session) => {
        console.log('[AuthContext] Auth event:', event, 'Session:', session ? 'present' : 'null');
        console.log('[AuthContext] Current path:', window.location.pathname);

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // IMPORTANT: Do NOT redirect if we're on the auth/callback or update-password page
        // Let those pages handle their own auth flow
        const path = window.location.pathname;
        if (path === '/auth/callback' || path === '/update-password') {
          console.log('[AuthContext] On callback/update-password page, skipping redirect');
          return;
        }

        // Handle password recovery event - redirect to update password page
        // This handles the case where user clicks email link that goes to root with hash
        if (event === 'PASSWORD_RECOVERY') {
          console.log('[AuthContext] PASSWORD_RECOVERY event detected, redirecting to /update-password');
          window.location.href = '/update-password';
          return;
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error, needsConfirmation: false };
    }

    // If signup successful and we have a user, save their profile
    if (data.user && (firstName || lastName)) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          first_name: firstName || '',
          last_name: lastName || '',
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('[AuthContext] Error saving profile:', profileError);
        // Don't fail signup if profile save fails - the user can update it later
      }
    }

    // Check if email confirmation is required
    const needsConfirmation = !data.session && data.user?.identities?.length === 0
      ? false // User already exists
      : !data.session; // Needs email confirmation

    return { error: null, needsConfirmation };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
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
