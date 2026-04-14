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
      const stored = await getStoredAuth();
      if (cancelled) return;
      if (stored.token && stored.viewer) {
        setToken(stored.token);
        setViewer(stored.viewer);
        setStatus('signed-in');
      } else {
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithPat = useCallback(async (raw: string) => {
    setBusy(true);
    setError(null);
    try {
      const v = await signInWithToken(raw);
      setToken(raw.trim());
      setViewer(v);
      setStatus('signed-in');
      void chrome.runtime.sendMessage({ type: 'workflow:refresh' }).catch(() => {});
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
      // Re-read storage so we pick up the token freshly written by the OAuth flow.
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
      setToken(null);
      setViewer(null);
      setStatus('signed-out');
      setError(null);
      void chrome.runtime.sendMessage({ type: 'workflow:signed-out' }).catch(() => {});
    } finally {
      setBusy(false);
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
  };
}
