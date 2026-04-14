import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
  setActiveAccount as doSetActiveAccount,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  error: string | null;
  busy: boolean;
  /** Increments whenever the account set or active account changes. */
  accountsVersion: number;
  /** Whether the popup is currently showing the add-account sign-in form. */
  addingAccount: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (login: string) => Promise<void>;
  beginAddAccount: () => void;
  cancelAddAccount: () => void;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [accountsVersion, setAccountsVersion] = useState(0);
  const [addingAccount, setAddingAccount] = useState(false);

  const bump = useCallback(() => setAccountsVersion((v) => v + 1), []);

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

  const signInWithPat = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        const v = await signInWithToken(token);
        setViewer(v);
        setStatus('signed-in');
        setAddingAccount(false);
        bump();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [bump],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      setViewer(v);
      setStatus('signed-in');
      setAddingAccount(false);
      bump();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [bump]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      // After sign-out, a different account may still be active.
      const { token, viewer: nextViewer } = await getStoredAuth();
      if (token && nextViewer) {
        setViewer(nextViewer);
        setStatus('signed-in');
      } else {
        setViewer(null);
        setStatus('signed-out');
      }
      setError(null);
      bump();
    } finally {
      setBusy(false);
    }
  }, [bump]);

  const switchAccount = useCallback(
    async (login: string) => {
      setBusy(true);
      try {
        const v = await doSetActiveAccount(login);
        if (v) {
          setViewer(v);
          setStatus('signed-in');
        }
        bump();
      } finally {
        setBusy(false);
      }
    },
    [bump],
  );

  const beginAddAccount = useCallback(() => setAddingAccount(true), []);
  const cancelAddAccount = useCallback(() => setAddingAccount(false), []);

  return {
    status,
    viewer,
    error,
    busy,
    accountsVersion,
    addingAccount,
    signInWithPat,
    signInWithOAuth,
    signOut,
    switchAccount,
    beginAddAccount,
    cancelAddAccount,
  };
}
