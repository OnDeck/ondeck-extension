import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  token: string | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  reload: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token, viewer } = await getStoredAuth();
      if (cancelled) return;
      if (token && viewer) {
        setToken(token);
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

  const signInWithPat = useCallback(async (rawToken: string) => {
    setBusy(true);
    setError(null);
    try {
      const v = await signInWithToken(rawToken);
      setToken(rawToken.trim());
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
      // oauthSignIn persists the token; re-read storage to pick it up.
      const stored = await getStoredAuth();
      setToken(stored.token);
      setViewer(v);
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
      // After signing out of the active account there may still be
      // another account in the bag. Re-read storage so we land on it.
      const stored = await getStoredAuth();
      if (stored.token && stored.viewer) {
        setToken(stored.token);
        setViewer(stored.viewer);
        setStatus('signed-in');
      } else {
        setToken(null);
        setViewer(null);
        setStatus('signed-out');
      }
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  const reload = useCallback(async () => {
    const stored = await getStoredAuth();
    if (stored.token && stored.viewer) {
      setToken(stored.token);
      setViewer(stored.viewer);
      setStatus('signed-in');
    } else {
      setToken(null);
      setViewer(null);
      setStatus('signed-out');
    }
  }, []);

  return {
    status,
    viewer,
    token,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    reload,
  };
}
