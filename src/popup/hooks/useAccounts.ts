import { useCallback, useEffect, useState } from 'react';
import { forgetAccount, getAllAccounts, switchActiveAccount } from '../../lib/auth';
import type { AccountSummary } from '../../lib/accounts';

export interface UseAccounts {
  accounts: AccountSummary[];
  activeId: string | null;
  switchTo: (id: string) => Promise<void>;
  forget: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Small hook that surfaces the multi-account state to the popup.
 * Combines listAccounts + the currently-active account id so the
 * Header can render a picker.
 */
export function useAccounts(activeAccountId: string | null): UseAccounts {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);

  const refresh = useCallback(async () => {
    const list = await getAllAccounts();
    setAccounts(list);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchTo = useCallback(
    async (id: string) => {
      await switchActiveAccount(id);
      await refresh();
    },
    [refresh],
  );

  const forget = useCallback(
    async (id: string) => {
      await forgetAccount(id);
      await refresh();
    },
    [refresh],
  );

  return { accounts, activeId: activeAccountId, switchTo, forget, refresh };
}
