import { useEffect, useState } from 'react';
import {
  listAccounts,
  removeAccount,
  switchActiveAccount,
  type AccountSummary,
} from '../../lib/accounts';

interface Props {
  onSwitch: () => void;
  onAdd: () => void;
}

export function AccountSwitcher({ onSwitch, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    listAccounts().then((list) => {
      if (!cancelled) setAccounts(list);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSwitch = async (id: number) => {
    await switchActiveAccount(id);
    setOpen(false);
    onSwitch();
  };

  const handleRemove = async (id: number) => {
    await removeAccount(id);
    const next = await listAccounts();
    setAccounts(next);
    onSwitch();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
      >
        Accounts ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-overlay shadow-lg">
          <ul className="max-h-60 overflow-y-auto">
            {accounts.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-gh-fg-muted">No accounts saved.</li>
            )}
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex items-center gap-2 border-b border-gh-border-muted px-3 py-2 last:border-b-0"
              >
                <img
                  src={account.viewer.avatar_url}
                  alt={account.viewer.login}
                  className="h-5 w-5 rounded-full border border-gh-border-default"
                />
                <button
                  type="button"
                  onClick={() => void handleSwitch(account.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="truncate text-[11px] text-gh-fg-default">
                    @{account.viewer.login}
                  </div>
                  {account.active && (
                    <div className="text-[10px] text-gh-accent-emphasis">Active</div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void handleRemove(account.id)}
                  title="Remove account"
                  className="text-[10px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAdd();
            }}
            className="block w-full border-t border-gh-border-default px-3 py-2 text-left text-[11px] text-gh-accent-emphasis hover:bg-gh-canvas-subtle"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
