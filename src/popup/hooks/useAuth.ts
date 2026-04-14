import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  listAccounts,
  removeAccount,
  setActiveAccountId,
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
  accountId: string | null;
  accounts: AccountSummary[];
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (id: string) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addAccount: () => void;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const refresh = useCallback(async () => {
    const [{ token, viewer: nextViewer, accountId: nextId }, list] = await Promise.all([
      getStoredAuth(),
      listAccounts(),
    ]);
    setAccounts(list);
    if (token && nextViewer) {
      setViewer(nextViewer);
      setAccountId(nextId);
      setStatus('signed-in');
    } else {
      setViewer(null);
      setAccountId(null);
      setStatus('signed-out');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInWithPat = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        await signInWithToken(token);
        setAddingAccount(false);
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
      await oauthSignIn();
      setAddingAccount(false);
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
      await refresh();
      setError(null);
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  const switchAccount = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await setActiveAccountId(id);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const removeAccountById = useCallback(
    async (id: string) => {
      setBusy(true);
      try {
        await removeAccount(id);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    [refresh],
  );

  const addAccount = useCallback(() => {
    setAddingAccount(true);
    setStatus('signed-out');
    setViewer(null);
  }, []);

  // Silence addingAccount lint until we surface it on the return (we use it
  // to force the sign-in screen when the user asks to add an account).
  void addingAccount;

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
    removeAccount: removeAccountById,
    addAccount,
  };
}
