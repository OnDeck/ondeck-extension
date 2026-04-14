import { useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  activeId: number | null;
  onSwitch: (id: number) => void;
  onSignOut: (id: number) => void;
  onAddAccount: () => void;
}

/**
 * Compact account switcher: shows the active account's avatar and
 * exposes a dropdown with the other signed-in identities. Each entry
 * offers a sign-out button, and an "Add account" row lets the user
 * kick off another PAT / OAuth flow.
 */
export function AccountSwitcher({
  accounts,
  activeId,
  onSwitch,
  onSignOut,
  onAddAccount,
}: Props) {
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.id === activeId) ?? null;
  if (!active) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
      >
        <img
          src={active.avatar_url}
          alt={active.login}
          className="h-4 w-4 rounded-full border border-gh-border-default"
        />
        <span className="max-w-[80px] truncate">@{active.login}</span>
        <span aria-hidden="true" className="text-gh-fg-muted">
          ▾
        </span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-default shadow-lg"
        >
          <ul className="divide-y divide-gh-border-muted">
            {accounts.map((a) => {
              const isActive = a.id === activeId;
              return (
                <li key={a.id} className="flex items-center gap-2 px-2 py-1.5 text-[11px]">
                  <img
                    src={a.avatar_url}
                    alt={a.login}
                    className="h-5 w-5 rounded-full border border-gh-border-default"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(a.id);
                      setOpen(false);
                    }}
                    className="min-w-0 flex-1 truncate text-left text-gh-fg-default hover:underline"
                  >
                    @{a.login}
                    {isActive && (
                      <span className="ml-1 text-[10px] text-gh-accent-emphasis">(active)</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSignOut(a.id);
                      setOpen(false);
                    }}
                    className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
                  >
                    Sign out
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
            className="block w-full border-t border-gh-border-muted px-3 py-2 text-left text-[11px] font-semibold text-gh-accent-emphasis hover:bg-gh-canvas-subtle"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
