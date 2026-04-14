import { useCallback, useEffect, useState } from 'react';
import {
  addAccount as doAddAccount,
  getActiveStats,
  listAccounts,
  removeAccount as doRemoveAccount,
  switchAccount as doSwitchAccount,
  type AccountStats,
  type AccountSummary,
} from '../../lib/accounts';

export interface UseAccounts {
  accounts: AccountSummary[];
  active: AccountSummary | null;
  stats: AccountStats | null;
  loading: boolean;
  error: string | null;
  addAccount: (token: string) => Promise<void>;
  switchAccount: (id: number) => Promise<void>;
  removeAccount: (id: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAccounts(): UseAccounts {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [stats, setStats] = useState<AccountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.all([listAccounts(), getActiveStats()]);
      setAccounts(list);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addAccount = useCallback(
    async (token: string) => {
      try {
        await doAddAccount(token);
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add account');
        throw err;
      }
    },
    [refresh],
  );

  const switchAccount = useCallback(
    async (id: number) => {
      await doSwitchAccount(id);
      await refresh();
    },
    [refresh],
  );

  const removeAccount = useCallback(
    async (id: number) => {
      await doRemoveAccount(id);
      await refresh();
    },
    [refresh],
  );

  const active = accounts.find((a) => a.active) ?? null;

  return {
    accounts,
    active,
    stats,
    loading,
    error,
    addAccount,
    switchAccount,
    removeAccount,
    refresh,
  };
}
