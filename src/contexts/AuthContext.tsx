import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null; needsConfirmation: boolean }>;
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
        console.log('Auth event:', event, 'Session:', session ? 'present' : 'null');

        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Handle password recovery event - redirect to update password page
        if (event === 'PASSWORD_RECOVERY') {
          console.log('PASSWORD_RECOVERY event detected, redirecting to /update-password');
          // Use setTimeout to ensure state is updated before navigation
          setTimeout(() => {
            window.location.href = '/update-password';
          }, 100);
        }

        // Handle successful sign in from email confirmation
        if (event === 'SIGNED_IN' && session) {
          // Check if we're on a callback page or root with hash
          const path = window.location.pathname;
          const hash = window.location.hash;

          // If on root or auth/callback and hash contains tokens, redirect to chat
          if ((path === '/' || path === '/auth/callback') && hash.includes('access_token')) {
            console.log('SIGNED_IN from email link, redirecting to /chat');
            setTimeout(() => {
              window.location.href = '/chat';
            }, 100);
          }
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

  const signUp = async (email: string, password: string) => {
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
