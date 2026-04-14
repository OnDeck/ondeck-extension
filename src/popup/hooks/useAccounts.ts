import { useCallback, useEffect, useState } from 'react';
import {
  listAccounts,
  switchAccount as persistSwitch,
  removeAccount,
  type AccountSummary,
} from '../../lib/accounts';

export interface UseAccounts {
  accounts: AccountSummary[];
  activeId: number | null;
  refresh: () => Promise<void>;
  switchTo: (id: number) => Promise<void>;
  signOutAccount: (id: number) => Promise<void>;
}

/**
 * Reads the multi-account bag. Consumers call `refresh` after any
 * mutation that affects auth (sign-in, sign-out, switch) so the header
 * switcher stays in sync.
 */
export function useAccounts(): UseAccounts {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const { accounts: next, activeId: nextId } = await listAccounts();
    setAccounts(next);
    setActiveId(nextId);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const switchTo = useCallback(
    async (id: number) => {
      await persistSwitch(id);
      await refresh();
    },
    [refresh],
  );

  const signOutAccount = useCallback(
    async (id: number) => {
      await removeAccount(id);
      await refresh();
    },
    [refresh],
  );

  return { accounts, activeId, refresh, switchTo, signOutAccount };
}
