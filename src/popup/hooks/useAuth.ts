import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithToken,
  signOut as doSignOut,
  TOKEN_STORAGE_KEY,
  type AuthState,
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
    const apply = (stored: AuthState) => {
      if (cancelled) return;
      if (stored.token && stored.viewer) {
        setToken(stored.token);
        setViewer(stored.viewer);
        setStatus('signed-in');
      } else {
        setToken(null);
        setViewer(null);
        setStatus('signed-out');
      }
    };
    void getStoredAuth().then(apply);

    // Device-flow sign-in finishes in the service worker, possibly while the
    // popup is open.
    const onChanged = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && TOKEN_STORAGE_KEY in changes) void getStoredAuth().then(apply);
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const signInWithPat = useCallback(async (pat: string) => {
    setBusy(true);
    setError(null);
    try {
      const v = await signInWithToken(pat);
      setViewer(v);
      setToken(pat.trim());
      setStatus('signed-in');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      setViewer(null);
      setToken(null);
      setStatus('signed-out');
      setError(null);
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
    signOut,
  };
}
