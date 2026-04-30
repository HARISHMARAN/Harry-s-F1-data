"use client";

import { useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { LogOut, ShieldCheck } from 'lucide-react';
import {
  buildMinimalUserProfile,
  getSupabaseBrowserClient,
  isSupabaseAuthConfigured,
  shouldBypassAuthGate,
  upsertMinimalUserProfile,
} from '../services/supabaseAuth';

type AuthGateProps = {
  children: ReactNode;
};

type AuthState = 'loading' | 'signed_out' | 'signed_in' | 'misconfigured';

function getDisplayName(user: User | null) {
  if (!user) return 'Signed in';
  return buildMinimalUserProfile(user)?.full_name ?? user.email ?? 'Signed in';
}

export default function AuthGate({ children }: AuthGateProps) {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (shouldBypassAuthGate()) return 'signed_in';
    return isSupabaseAuthConfigured() ? 'loading' : 'misconfigured';
  });
  const [user, setUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    if (!supabase) return undefined;

    let active = true;

    const syncProfile = async (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setAuthState(nextUser ? 'signed_in' : 'signed_out');

      if (!nextUser) return;

      try {
        await upsertMinimalUserProfile(supabase, nextUser);
        if (active) setAuthError(null);
      } catch {
        if (active) {
          setAuthError('Signed in, but profile storage is not ready. Check the Supabase table migration.');
        }
      }
    };

    supabase.auth.getSession()
      .then(({ data }) => syncProfile(data.session?.user ?? null))
      .catch(() => {
        if (active) {
          setAuthState('signed_out');
          setAuthError('Unable to read the current sign-in session.');
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncProfile(session?.user ?? null);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [supabase]);

  const signInWithGoogle = async () => {
    if (!supabase || typeof window === 'undefined') return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });
    if (error) setAuthError(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setAuthState('signed_out');
  };

  if (authState === 'signed_in') {
    return (
      <>
        {children}
        {supabase && (
          <div className="auth-user-pill" aria-label="Signed in user">
            <ShieldCheck size={16} aria-hidden="true" />
            <span>{getDisplayName(user)}</span>
            <button type="button" onClick={signOut} aria-label="Sign out">
              <LogOut size={15} aria-hidden="true" />
            </button>
          </div>
        )}
      </>
    );
  }

  if (authState === 'loading') {
    return (
      <main className="auth-shell">
        <section className="auth-card" aria-live="polite">
          <div className="auth-kicker">Grid access</div>
          <h1>Checking your race pass</h1>
          <p>Loading Google sign-in before opening the F1 dashboard.</p>
        </section>
      </main>
    );
  }

  if (authState === 'misconfigured') {
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <div className="auth-kicker">Supabase required</div>
          <h1>Set Supabase env vars before sharing</h1>
          <p>
            Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel, then redeploy.
            Production access is locked until Supabase Auth is configured.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-kicker">Harry's F1 dashboard</div>
        <h1>Sign in with Google</h1>
        <p>
          Friends can enter with Google. This app stores only their name and email address in Supabase.
        </p>
        <button type="button" className="auth-google-button" onClick={signInWithGoogle}>
          Continue with Google
        </button>
        {authError && <p className="auth-error">{authError}</p>}
      </section>
    </main>
  );
}
