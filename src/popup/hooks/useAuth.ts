import { useCallback, useEffect, useState } from 'react';
import {
  addAccountFromToken,
  getActiveAccountId,
  syncActiveAccountFromLegacy,
} from '../../lib/accounts';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signOut as doSignOut,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  activeAccountId: string | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  setViewer: (viewer: Viewer) => void;
  requestAddAccount: () => void;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token, viewer } = await getStoredAuth();
      if (cancelled) return;
      if (token && viewer) {
        await syncActiveAccountFromLegacy(viewer);
        const id = await getActiveAccountId();
        if (cancelled) return;
        setViewer(viewer);
        setActiveAccountId(id);
        setStatus('signed-in');
      } else {
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithPat = useCallback(async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      const v = await addAccountFromToken(token);
      setViewer(v);
      setActiveAccountId(String(v.id));
      setStatus('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      setViewer(v);
      await syncActiveAccountFromLegacy(v);
      setActiveAccountId(String(v.id));
      setStatus('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      setViewer(null);
      setActiveAccountId(null);
      setStatus('signed-out');
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const requestAddAccount = useCallback(() => {
    // Temporarily surface the SignIn screen without clearing stored data.
    setStatus('signed-out');
    setError(null);
  }, []);

  const publicSetViewer = useCallback((next: Viewer) => {
    setViewer(next);
    setActiveAccountId(String(next.id));
    setStatus('signed-in');
  }, []);

  return {
    status,
    viewer,
    activeAccountId,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    setViewer: publicSetViewer,
    requestAddAccount,
  };
}
