import { useCallback, useEffect, useState } from 'react';
import {
  addAccount,
  getStoredAuth,
  listAccounts,
  removeAccount,
  setActiveAccount,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
  type AccountSummary,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  token: string | null;
  accounts: AccountSummary[];
  activeAccountId: number | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  addAccountWithPat: (token: string) => Promise<void>;
  switchAccount: (id: number) => Promise<void>;
  removeStoredAccount: (id: number) => Promise<void>;
  signOut: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    const summary = await listAccounts();
    setAccounts(summary.accounts);
    setActiveAccountId(summary.active?.id ?? null);
  }, []);

  const syncActive = useCallback(async () => {
    const { token: activeToken, viewer: activeViewer } = await getStoredAuth();
    if (activeToken && activeViewer) {
      setToken(activeToken);
      setViewer(activeViewer);
      setStatus('signed-in');
    } else {
      setToken(null);
      setViewer(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await syncActive();
      await refreshAccounts();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [syncActive, refreshAccounts]);

  const signInWithPat = useCallback(
    async (rawToken: string) => {
      setBusy(true);
      setError(null);
      try {
        const v = await signInWithToken(rawToken);
        setViewer(v);
        setToken(rawToken.trim());
        setStatus('signed-in');
        await refreshAccounts();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [refreshAccounts],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      setViewer(v);
      await syncActive();
      await refreshAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [syncActive, refreshAccounts]);

  const addAccountWithPat = useCallback(
    async (rawToken: string) => {
      setBusy(true);
      setError(null);
      try {
        await addAccount(rawToken);
        await syncActive();
        await refreshAccounts();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add account');
      } finally {
        setBusy(false);
      }
    },
    [syncActive, refreshAccounts],
  );

  const switchAccount = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await setActiveAccount(id);
        await syncActive();
        await refreshAccounts();
      } finally {
        setBusy(false);
      }
    },
    [syncActive, refreshAccounts],
  );

  const removeStoredAccount = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        await removeAccount(id);
        await syncActive();
        await refreshAccounts();
      } finally {
        setBusy(false);
      }
    },
    [syncActive, refreshAccounts],
  );

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      await syncActive();
      await refreshAccounts();
      setError(null);
    } finally {
      setBusy(false);
    }
  }, [syncActive, refreshAccounts]);

  return {
    status,
    viewer,
    token,
    accounts,
    activeAccountId,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    addAccountWithPat,
    switchAccount,
    removeStoredAccount,
    signOut,
  };
}
