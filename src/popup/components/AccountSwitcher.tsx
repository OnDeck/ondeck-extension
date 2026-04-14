import { useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  activeId: string | null;
  onSwitch: (id: string) => Promise<void>;
  onForget: (id: string) => Promise<void>;
  onAddAccount: () => void;
}

/**
 * Account switcher pill — lives in the popup header. Clicking opens a
 * dropdown listing all stored accounts. The active one is highlighted
 * and each row has a small × to forget that account. An "Add account"
 * entry jumps to the sign-in flow.
 */
export function AccountSwitcher({ accounts, activeId, onSwitch, onForget, onAddAccount }: Props) {
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.id === activeId) ?? accounts[0];

  if (!active) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {active.viewer && (
          <img
            src={active.viewer.avatar_url}
            alt=""
            className="h-4 w-4 rounded-full border border-gh-border-muted"
          />
        )}
        <span className="max-w-[90px] truncate">@{active.login}</span>
        <span aria-hidden="true" className="text-[8px]">▾</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 flex w-56 flex-col overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-subtle text-xs shadow-lg"
        >
          {accounts.map((account) => {
            const isActive = account.id === activeId;
            return (
              <div
                key={account.id}
                className={`flex items-center gap-2 border-b border-gh-border-muted px-2 py-2 last:border-b-0 ${
                  isActive ? 'bg-gh-canvas-default' : ''
                }`}
              >
                {account.viewer && (
                  <img
                    src={account.viewer.avatar_url}
                    alt=""
                    className="h-5 w-5 rounded-full border border-gh-border-muted"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    void onSwitch(account.id);
                    setOpen(false);
                  }}
                  className="flex-1 truncate text-left text-gh-fg-default hover:text-gh-accent-emphasis"
                >
                  @{account.login}
                  {isActive && (
                    <span className="ml-1 text-[10px] text-gh-fg-muted">(active)</span>
                  )}
                </button>
                <button
                  type="button"
                  title="Forget this account"
                  onClick={() => {
                    void onForget(account.id);
                  }}
                  className="text-[12px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                >
                  ×
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() => {
              onAddAccount();
              setOpen(false);
            }}
            className="border-t border-gh-border-muted px-2 py-2 text-left text-[11px] text-gh-accent-emphasis hover:underline"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
