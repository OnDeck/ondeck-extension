import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  removeAccount as doRemoveAccount,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
  switchActiveAccount,
  type AccountSummary,
} from '../../lib/auth';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  token: string | null;
  activeId: number | null;
  accounts: AccountSummary[];
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (id: number) => Promise<void>;
  removeAccount: (id: number) => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyState = useCallback(
    (next: Awaited<ReturnType<typeof getStoredAuth>>) => {
      setToken(next.token);
      setViewer(next.viewer);
      setActiveId(next.activeId);
      setAccounts(next.accounts);
      setStatus(next.token && next.viewer ? 'signed-in' : 'signed-out');
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredAuth();
      if (cancelled) return;
      applyState(stored);
    })();
    return () => {
      cancelled = true;
    };
  }, [applyState]);

  const signInWithPat = useCallback(
    async (raw: string) => {
      setBusy(true);
      setError(null);
      try {
        await signInWithToken(raw);
        const next = await getStoredAuth();
        applyState(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [applyState],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await oauthSignIn();
      const next = await getStoredAuth();
      applyState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [applyState]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      const next = await getStoredAuth();
      applyState(next);
      setError(null);
    } finally {
      setBusy(false);
    }
  }, [applyState]);

  const switchAccount = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        const next = await switchActiveAccount(id);
        applyState(next);
      } finally {
        setBusy(false);
      }
    },
    [applyState],
  );

  const removeAccount = useCallback(
    async (id: number) => {
      setBusy(true);
      try {
        const next = await doRemoveAccount(id);
        applyState(next);
      } finally {
        setBusy(false);
      }
    },
    [applyState],
  );

  return {
    status,
    viewer,
    token,
    activeId,
    accounts,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    switchAccount,
    removeAccount,
  };
}
