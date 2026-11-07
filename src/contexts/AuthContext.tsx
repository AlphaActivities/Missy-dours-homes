import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {clearCrmAttentionPreload,preloadCrmAttention} from '../lib/crmAttentionPreload';

const APPROVED_EMAILS = [
  'yourcustomerflowguy@gmail.com',
  'missydourshomes@gmail.com',
  'heberherrera92@gmail.com',
];

// Keep the personalized greeting consistent between overview and entry animation.
export function getDashboardGreeting(email: string | undefined): string | null {
  const names: Record<string,string> = {
    'yourcustomerflowguy@gmail.com': 'Josh',
    'missydourshomes@gmail.com': 'Missy',
    'heberherrera92@gmail.com': 'Heber',
  };
  const name = email ? names[email.toLowerCase()] : undefined;
  if (!name) return null;
  const hour = new Date().getHours();
  const salutation = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return `${salutation}, ${name}.`;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  retrySession: () => Promise<void>;
  isApproved: boolean;
  avatarUrl: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const retrySession = useCallback(async () => {
    setLoading(true);
    setAuthError(null);
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new Error('Session check timed out. Check your connection and retry.')), 12000);
        }),
      ]);
      if (result.error) throw result.error;
      if(result.data.session?.user.id&&APPROVED_EMAILS.includes(result.data.session.user.email??'')) {
        void preloadCrmAttention(result.data.session.user.id).catch(()=>{});
      }
      setSession(result.data.session);
    } catch {
      // Do not erase a session received by the auth-change listener.
      setAuthError('Unable to verify your session. Check your connection and try again.');
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      if(newSession?.user.id&&APPROVED_EMAILS.includes(newSession.user.email??'')) {
        // Defer network work outside Supabase's auth-state callback.
        window.setTimeout(()=>void preloadCrmAttention(newSession.user.id).catch(()=>{}),0);
      } else if(!newSession)clearCrmAttentionPreload();
      setSession(newSession);
      setAuthError(null);
      setLoading(false);
    });
    void retrySession();
    return () => { active = false; subscription.unsubscribe(); };
  }, [retrySession]);

  const signIn = async (email: string, password: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    // Authentication is established; warm the count while the route changes.
    const current=await supabase.auth.getUser();
    if(current.data.user?.id&&APPROVED_EMAILS.includes(current.data.user.email??''))void preloadCrmAttention(current.data.user.id).catch(()=>{});
    return { error: null };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    clearCrmAttentionPreload();
    setSession(null);
    setAuthError(null);
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
    <AuthContext.Provider value={{ session, user, loading, authError, retrySession, isApproved, avatarUrl, signIn, signOut }}>
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
