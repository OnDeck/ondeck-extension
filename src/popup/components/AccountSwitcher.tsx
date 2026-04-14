import { useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  activeId: string | null;
  busy: boolean;
  onSwitch: (accountId: string) => void;
  onAddAccount: () => void;
  onSignOut: (accountId: string) => void;
}

export function AccountSwitcher({
  accounts,
  activeId,
  busy,
  onSwitch,
  onAddAccount,
  onSignOut,
}: Props) {
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0];
  if (!active) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex items-center gap-2 rounded-md border border-transparent px-1 py-0.5 text-left hover:border-gh-border-default disabled:opacity-60"
      >
        <img
          src={active.viewer.avatar_url}
          alt={active.viewer.login}
          className="h-8 w-8 rounded-full border border-gh-border-default"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {active.viewer.name ?? active.viewer.login}
          </span>
          <span className="block truncate text-xs text-gh-fg-muted">
            @{active.viewer.login}
          </span>
        </span>
        <span className="text-gh-fg-muted" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute left-0 top-12 z-20 w-[260px] rounded-md border border-gh-border-default bg-gh-canvas-subtle p-1 shadow-lg">
          <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-gh-fg-muted">
            Accounts
          </div>
          <ul className="flex flex-col gap-0.5">
            {accounts.map((account) => {
              const isActive = account.id === activeId;
              return (
                <li key={account.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(account.id);
                      setOpen(false);
                    }}
                    className={`flex flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-gh-border-muted/40 ${
                      isActive ? 'bg-gh-border-muted/40' : ''
                    }`}
                  >
                    <img
                      src={account.viewer.avatar_url}
                      alt={account.viewer.login}
                      className="h-5 w-5 rounded-full border border-gh-border-default"
                    />
                    <span className="min-w-0 flex-1 truncate">
                      @{account.viewer.login}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-gh-success-emphasis">
                        active
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut(account.id);
                      setOpen(false);
                    }}
                    title="Sign out of this account"
                    className="rounded-md border border-transparent px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              onAddAccount();
              setOpen(false);
            }}
            className="mt-1 w-full rounded-md border border-gh-border-default px-2 py-1 text-left text-xs text-gh-fg-default hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
          >
            + Add another account
          </button>
        </div>
      )}
    </div>
  );
}
