import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
} from '../../lib/auth';
import { addAccountFromToken } from '../../lib/accounts';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
  addAccountWithPat: (token: string) => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token, viewer } = await getStoredAuth();
      if (cancelled) return;
      if (token && viewer) {
        setViewer(viewer);
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
      const v = await signInWithToken(token);
      setViewer(v);
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
      setStatus('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const reload = useCallback(async () => {
    const { token, viewer } = await getStoredAuth();
    if (token && viewer) {
      setViewer(viewer);
      setStatus('signed-in');
    } else {
      setViewer(null);
      setStatus('signed-out');
    }
  }, []);

  const addAccountWithPat = useCallback(async (token: string) => {
    setBusy(true);
    setError(null);
    try {
      const account = await addAccountFromToken(token);
      setViewer(account.viewer);
      setStatus('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add account');
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      setViewer(null);
      setStatus('signed-out');
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    viewer,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    reload,
    addAccountWithPat,
  };
}
