import { useCallback, useEffect, useState } from 'react';
import { listAccounts, type AccountSummary } from '../../lib/accounts';
import { setActiveAccount } from '../../lib/auth';

export interface UseAccounts {
  accounts: AccountSummary[];
  refresh: () => Promise<void>;
  switchTo: (login: string) => Promise<void>;
}

export function useAccounts(trigger: unknown): UseAccounts {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);

  const refresh = useCallback(async () => {
    const next = await listAccounts();
    setAccounts(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, trigger]);

  const switchTo = useCallback(
    async (login: string) => {
      await setActiveAccount(login);
      await refresh();
    },
    [refresh],
  );

  return { accounts, refresh, switchTo };
}
