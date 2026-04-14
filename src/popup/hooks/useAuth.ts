import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

// Fire-and-forget messages to the background worker. Swallow errors so the
// popup never blocks on service-worker wake-up races.
function tellWorker(type: string): void {
  try {
    void chrome.runtime.sendMessage({ type });
  } catch {
    /* ignore */
  }
}

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
      tellWorker('workflow:refresh');
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
      tellWorker('workflow:refresh');
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
      setStatus('signed-out');
      setError(null);
      tellWorker('workflow:signed-out');
    } finally {
      setBusy(false);
    }
  }, []);

  return { status, viewer, error, busy, signInWithPat, signInWithOAuth, signOut };
}
