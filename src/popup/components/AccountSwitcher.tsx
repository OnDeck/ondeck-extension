import { useEffect, useRef, useState } from 'react';
import type { AccountSummary } from '../../lib/accounts';

interface Props {
  accounts: AccountSummary[];
  activeLogin: string;
  onSwitch: (login: string) => void;
  onAddAccount: () => void;
}

export function AccountSwitcher({ accounts, activeLogin, onSwitch, onAddAccount }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch account"
      >
        Accounts ▾
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-default shadow-lg">
          <ul className="max-h-48 overflow-y-auto">
            {accounts.map((account) => {
              const isActive = account.login === activeLogin;
              return (
                <li key={account.login}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (!isActive) onSwitch(account.login);
                    }}
                    className={
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-gh-canvas-subtle ' +
                      (isActive ? 'bg-gh-canvas-subtle' : '')
                    }
                  >
                    <img
                      src={account.avatar_url}
                      alt={account.login}
                      className="h-5 w-5 rounded-full border border-gh-border-default"
                    />
                    <span className="flex-1 truncate">{account.name ?? account.login}</span>
                    {isActive && (
                      <span className="text-[10px] text-gh-success-emphasis">Active</span>
                    )}
                  </button>
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
            className="block w-full border-t border-gh-border-muted px-3 py-2 text-left text-xs text-gh-accent-emphasis hover:bg-gh-canvas-subtle"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
