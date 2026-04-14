import { useCallback, useEffect, useState } from 'react';
import {
  getActiveAccountId,
  listAccounts,
  removeAccount,
  setActiveAccount,
  type StoredAccount,
} from '../../lib/accounts';

interface Props {
  onSwitch?: (id: string) => void;
  onAddAccount?: () => void;
}

export function AccountSwitcher({ onSwitch, onAddAccount }: Props) {
  const [accounts, setAccounts] = useState<StoredAccount[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    const [list, active] = await Promise.all([listAccounts(), getActiveAccountId()]);
    setAccounts(list);
    setActiveId(active);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = accounts.find((a) => a.id === activeId) ?? null;

  const onPick = async (id: string) => {
    await setActiveAccount(id);
    setActiveId(id);
    setOpen(false);
    onSwitch?.(id);
  };

  const onRemove = async (id: string) => {
    await removeAccount(id);
    await refresh();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
      >
        {active ? (
          <>
            <img
              src={active.viewer.avatar_url}
              alt={active.viewer.login}
              className="h-4 w-4 rounded-full"
            />
            <span className="font-mono">@{active.viewer.login}</span>
          </>
        ) : (
          <span className="text-gh-fg-muted">No account</span>
        )}
        <span className="text-gh-fg-muted">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-default shadow-lg">
          <ul className="max-h-48 overflow-y-auto py-1">
            {accounts.length === 0 && (
              <li className="px-3 py-2 text-[11px] text-gh-fg-muted">
                No accounts saved yet.
              </li>
            )}
            {accounts.map((acc) => (
              <li key={acc.id} className="flex items-center justify-between px-2 py-1">
                <button
                  type="button"
                  onClick={() => void onPick(acc.id)}
                  className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-[11px] hover:bg-gh-canvas-subtle ${
                    acc.id === activeId ? 'text-gh-fg-default' : 'text-gh-fg-muted'
                  }`}
                >
                  <img
                    src={acc.viewer.avatar_url}
                    alt={acc.viewer.login}
                    className="h-5 w-5 rounded-full"
                  />
                  <span className="font-mono">@{acc.viewer.login}</span>
                  {acc.id === activeId && (
                    <span className="ml-auto text-gh-success-emphasis">●</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => void onRemove(acc.id)}
                  title="Remove account"
                  className="px-2 py-1 text-[11px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-gh-border-default p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onAddAccount?.();
              }}
              className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
            >
              Add account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
