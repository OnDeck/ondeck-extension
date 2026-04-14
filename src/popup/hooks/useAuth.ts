import { useCallback, useEffect, useState } from 'react';
import {
  getStoredAuth,
  signInWithOAuth as oauthSignIn,
  signInWithToken,
  signOut as doSignOut,
} from '../../lib/auth';
import {
  getActiveAccount,
  listAccounts,
  removeAccount as removeStoredAccount,
  setActiveLogin,
  type AccountSummary,
} from '../../lib/accounts';
import type { Viewer } from '../../lib/github-api';

export type AuthStatus = 'loading' | 'signed-out' | 'signed-in' | 'add-account';

export interface UseAuth {
  status: AuthStatus;
  viewer: Viewer | null;
  token: string | null;
  accounts: AccountSummary[];
  error: string | null;
  busy: boolean;
  signInWithPat: (token: string) => Promise<void>;
  signInWithOAuth: () => Promise<void>;
  signOut: () => Promise<void>;
  switchAccount: (login: string) => Promise<void>;
  removeAccount: (login: string) => Promise<void>;
  beginAddAccount: () => void;
  cancelAddAccount: () => void;
}

export function useAuth(): UseAuth {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshAccounts = useCallback(async () => {
    setAccounts(await listAccounts());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredAuth();
      if (cancelled) return;
      await refreshAccounts();
      if (cancelled) return;
      if (stored.token && stored.viewer) {
        setToken(stored.token);
        setViewer(stored.viewer);
        setStatus('signed-in');
      } else {
        setStatus('signed-out');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAccounts]);

  const finishSignIn = useCallback(
    async (v: Viewer) => {
      const active = await getActiveAccount();
      if (active) {
        setToken(active.token);
        setViewer(active.viewer);
      } else {
        setViewer(v);
      }
      setStatus('signed-in');
      await refreshAccounts();
      void chrome.runtime.sendMessage({ type: 'workflow:refresh' }).catch(() => {});
    },
    [refreshAccounts],
  );

  const signInWithPat = useCallback(
    async (raw: string) => {
      setBusy(true);
      setError(null);
      try {
        const v = await signInWithToken(raw);
        await finishSignIn(v);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Sign-in failed');
      } finally {
        setBusy(false);
      }
    },
    [finishSignIn],
  );

  const signInWithOAuth = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const v = await oauthSignIn();
      await finishSignIn(v);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setBusy(false);
    }
  }, [finishSignIn]);

  const signOut = useCallback(async () => {
    setBusy(true);
    try {
      await doSignOut();
      const stored = await getStoredAuth();
      await refreshAccounts();
      if (stored.token && stored.viewer) {
        setToken(stored.token);
        setViewer(stored.viewer);
        setStatus('signed-in');
        void chrome.runtime.sendMessage({ type: 'workflow:refresh' }).catch(() => {});
      } else {
        setToken(null);
        setViewer(null);
        setStatus('signed-out');
        setError(null);
        void chrome.runtime.sendMessage({ type: 'workflow:signed-out' }).catch(() => {});
      }
    } finally {
      setBusy(false);
    }
  }, [refreshAccounts]);

  const switchAccount = useCallback(
    async (login: string) => {
      setBusy(true);
      try {
        await setActiveLogin(login);
        const stored = await getStoredAuth();
        if (stored.token && stored.viewer) {
          setToken(stored.token);
          setViewer(stored.viewer);
          setStatus('signed-in');
          void chrome.runtime.sendMessage({ type: 'workflow:refresh' }).catch(() => {});
        }
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const removeAccount = useCallback(
    async (login: string) => {
      setBusy(true);
      try {
        await removeStoredAccount(login);
        await refreshAccounts();
        const stored = await getStoredAuth();
        if (stored.token && stored.viewer) {
          setToken(stored.token);
          setViewer(stored.viewer);
          setStatus('signed-in');
        } else {
          setToken(null);
          setViewer(null);
          setStatus('signed-out');
          void chrome.runtime.sendMessage({ type: 'workflow:signed-out' }).catch(() => {});
        }
      } finally {
        setBusy(false);
      }
    },
    [refreshAccounts],
  );

  const beginAddAccount = useCallback(() => {
    setError(null);
    setStatus('add-account');
  }, []);

  const cancelAddAccount = useCallback(() => {
    setError(null);
    setStatus(viewer && token ? 'signed-in' : 'signed-out');
  }, [viewer, token]);

  return {
    status,
    viewer,
    token,
    accounts,
    error,
    busy,
    signInWithPat,
    signInWithOAuth,
    signOut,
    switchAccount,
    removeAccount,
    beginAddAccount,
    cancelAddAccount,
  };
}
