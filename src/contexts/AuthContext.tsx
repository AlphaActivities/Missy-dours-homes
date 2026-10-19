import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const APPROVED_EMAILS = [
  'yourcustomerflowguy@gmail.com',
  'missydourshomes@gmail.com',
  'heberherrera92@gmail.com',
];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isApproved: boolean;
  avatarUrl: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, newSession) => {
      (async () => {
        setSession(newSession);
        setLoading(false);
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const user = session?.user ?? null;
  const isApproved = user ? APPROVED_EMAILS.includes(user.email ?? '') : false;

  // Extract a trustworthy Google OAuth profile picture from the
  // authenticated identity metadata, if present. We do NOT guess
  // or scrape — only use what Supabase Auth provides. Identity data
  // comes from the provider (Google) via the verified OAuth flow.
  const avatarUrl = (() => {
    if (!user) return null;
    // user_metadata is user-mutable, but avatar_url from Google
    // OAuth is set by the provider during sign-in. Prefer the
    // identity_data which is provider-managed.
    const identities = user.identities ?? [];
    const googleIdentity = identities.find(i => i.provider === 'google');
    const identityAvatar = googleIdentity?.identity_data?.avatar_url as string | undefined;
    if (identityAvatar) return identityAvatar;
    const metaAvatar = user.user_metadata?.avatar_url as string | undefined;
    if (metaAvatar) return metaAvatar;
    return null;
  })();

  return (
    <AuthContext.Provider value={{ session, user, loading, isApproved, avatarUrl, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { APPROVED_EMAILS };
