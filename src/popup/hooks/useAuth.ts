import { useCallback, useEffect, useState } from 'react';
import {
  type AccountSummary,
  listAccounts,
  setActiveAccount,
} from '../../lib/accounts';
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
  accounts: AccountSummary[];
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: (accountId?: string) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    const list = await listAccounts();
    setAccounts(list);
  }, []);

  const hydrate = useCallback(async () => {
    const auth = await getStoredAuth();
    await refreshAccounts();
    if (auth.token && auth.viewer) {
      setViewer(auth.viewer);
      setAccountId(auth.accountId);
      setStatus('signed-in');
    } else {
      setViewer(null);
      setAccountId(null);
      setStatus('signed-out');
    }
  }, [refreshAccounts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await hydrate();
    })();
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  const signInWithPat = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        await signInWithToken(token);
        await hydrate();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [hydrate],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await oauthSignIn();
      await hydrate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [hydrate]);

  const signOut = useCallback(
    async (id?: string) => {
      setBusy(true);
      try {
        await doSignOut(id);
        await hydrate();
        setError(null);
      } finally {
        setBusy(false);
      }
    },
    [hydrate],
  );

  const switchAccount = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await setActiveAccount(id);
        await hydrate();
      } finally {
        setBusy(false);
      }
    },
    [hydrate],
  );

  return {
    status,
    viewer,
    accountId,
    accounts,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    switchAccount,
  };
}
