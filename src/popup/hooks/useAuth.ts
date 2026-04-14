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
  accountId: string | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { token, viewer, accountId } = await getStoredAuth();
    if (token && viewer) {
      setViewer(viewer);
      setAccountId(accountId);
      setStatus('signed-in');
    } else {
      setViewer(null);
      setAccountId(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const signInWithPat = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        const v = await signInWithToken(token);
        setViewer(v);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      setViewer(v);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      setViewer(null);
      setAccountId(null);
      setStatus('signed-out');
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    status,
    viewer,
    accountId,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    refresh,
  };
}
