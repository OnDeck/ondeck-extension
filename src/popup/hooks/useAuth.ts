import { useCallback, useEffect, useState } from 'react';
import { addAccount, getActiveAccount, removeAccount } from '../../lib/accounts';
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
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Prefer multi-account store; fall back to legacy single-account.
      const active = await getActiveAccount();
      if (cancelled) return;
      if (active) {
        setViewer(active.account.viewer);
        setStatus('signed-in');
        return;
      }
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
      await addAccount(token, v);
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
      // OAuth path also persists via the accounts layer where possible.
      const active = await getActiveAccount();
      if (active) setViewer(active.account.viewer);
      else setViewer(v);
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
      // Remove the currently active account from the multi-account store
      // (if any), then clear legacy single-account storage as well.
      const active = await getActiveAccount();
      if (active) {
        await removeAccount(active.account.id);
      }
      await doSignOut();
      setViewer(null);
      setStatus('signed-out');
      setError(null);
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, viewer, error, busy, signInWithPat, signInWithOAuth, signOut };
}
