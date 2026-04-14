import { useCallback, useEffect, useState } from 'react';
import {
  listAccounts,
  removeAccount as removeStoredAccount,
  switchAccount as switchStoredAccount,
} from '../../lib/accounts';
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

export interface AccountSummary {
  login: string;
  viewer: Viewer;
}

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  accounts: AccountSummary[];
  activeLogin: string | null;
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (login: string) => Promise<void>;
  removeAccount: (login: string) => Promise<void>;
  addAccount: () => void;
  addingAccount: boolean;
  cancelAddAccount: () => void;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [activeLogin, setActiveLogin] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [addingAccount, setAddingAccount] = useState(false);

  const refreshAccountList = useCallback(async () => {
    const { active, accounts: list } = await listAccounts();
    setAccounts(list);
    setActiveLogin(active);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { token, viewer } = await getStoredAuth();
      await refreshAccountList();
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
  }, [refreshAccountList]);

  const signInWithPat = useCallback(
    async (token: string) => {
      setBusy(true);
      setError(null);
      try {
        const v = await signInWithToken(token);
        setViewer(v);
        setStatus('signed-in');
        setAddingAccount(false);
        await refreshAccountList();
        tellWorker('workflow:refresh');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [refreshAccountList],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      setViewer(v);
      setStatus('signed-in');
      setAddingAccount(false);
      await refreshAccountList();
      tellWorker('workflow:refresh');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [refreshAccountList]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      const { token, viewer: nextViewer } = await getStoredAuth();
      await refreshAccountList();
      if (token && nextViewer) {
        setViewer(nextViewer);
        setStatus('signed-in');
      } else {
        setViewer(null);
        setStatus('signed-out');
      }
      setError(null);
      tellWorker('workflow:signed-out');
      tellWorker('workflow:refresh');
    } finally {
      setBusy(false);
    }
  }, [refreshAccountList]);

  const switchAccount = useCallback(
    async (login: string) => {
      setBusy(true);
      try {
        await switchStoredAccount(login);
        const { token, viewer: nextViewer } = await getStoredAuth();
        await refreshAccountList();
        if (token && nextViewer) {
          setViewer(nextViewer);
          setStatus('signed-in');
          tellWorker('workflow:refresh');
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshAccountList],
  );

  const removeAccount = useCallback(
    async (login: string) => {
      setBusy(true);
      try {
        await removeStoredAccount(login);
        const { token, viewer: nextViewer } = await getStoredAuth();
        await refreshAccountList();
        if (token && nextViewer) {
          setViewer(nextViewer);
          setStatus('signed-in');
        } else {
          setViewer(null);
          setStatus('signed-out');
        }
        tellWorker('workflow:refresh');
      } finally {
        setBusy(false);
      }
    },
    [refreshAccountList],
  );

  const addAccount = useCallback(() => {
    setAddingAccount(true);
    setError(null);
  }, []);

  const cancelAddAccount = useCallback(() => {
    setAddingAccount(false);
    setError(null);
  }, []);

  return {
    status,
    viewer,
    accounts,
    activeLogin,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    switchAccount,
    removeAccount,
    addAccount,
    addingAccount,
    cancelAddAccount,
  };
}
