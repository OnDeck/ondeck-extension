import { useEffect, useRef, useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  activeLogin: string;
  onSwitch: (login: string) => void;
  onRemove: (login: string) => void;
  onAddAccount: () => void;
}

export function AccountSwitcher({
  accounts,
  activeLogin,
  onSwitch,
  onRemove,
  onAddAccount,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        aria-haspopup="menu"
      >
        ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-md border border-gh-border-default bg-gh-canvas-default shadow-lg">
          <ul className="max-h-48 overflow-y-auto">
            {accounts.map((account) => {
              const isActive = account.login === activeLogin;
              return (
                <li key={account.login} className="flex items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (!isActive) onSwitch(account.login);
                    }}
                    className="flex flex-1 items-center gap-2 px-2 py-1.5 text-left hover:bg-gh-canvas-subtle"
                  >
                    <img
                      src={account.viewer.avatar_url}
                      alt={account.login}
                      className="h-5 w-5 rounded-full border border-gh-border-default"
                    />
                    <span className="flex-1 truncate text-[11px] text-gh-fg-default">
                      @{account.login}
                    </span>
                    {isActive && (
                      <span className="text-[10px] text-gh-success-emphasis">active</span>
                    )}
                  </button>
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => onRemove(account.login)}
                      title="Remove account"
                      className="px-2 py-1.5 text-[10px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onAddAccount();
            }}
            className="block w-full border-t border-gh-border-default px-2 py-1.5 text-left text-[11px] text-gh-fg-default hover:bg-gh-canvas-subtle"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
