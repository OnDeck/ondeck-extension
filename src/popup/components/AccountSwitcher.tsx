import { useState } from 'react';
import type { AccountSummary } from '../../lib/auth';

interface Props {
  accounts: AccountSummary[];
  activeId: number | null;
  onSwitch: (id: number) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
}

export function AccountSwitcher({ accounts, activeId, onSwitch, onRemove, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const active = accounts.find((a) => a.id === activeId) ?? null;

  if (accounts.length === 0) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        title="Switch account"
      >
        {active && (
          <img
            src={active.avatar_url}
            alt={active.login}
            className="h-4 w-4 rounded-full"
          />
        )}
        <span className="max-w-[72px] truncate">{active?.login ?? 'Accounts'}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-[28px] z-10 w-56 rounded-md border border-gh-border-default bg-gh-canvas-default p-1 shadow-lg">
          <ul>
            {accounts.map((a) => {
              const isActive = a.id === activeId;
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-gh-canvas-subtle"
                >
                  <img
                    src={a.avatar_url}
                    alt={a.login}
                    className="h-5 w-5 rounded-full"
                  />
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => {
                      onSwitch(a.id);
                      setOpen(false);
                    }}
                  >
                    <div className="truncate text-[12px] text-gh-fg-default">
                      {a.name ?? a.login}
                    </div>
                    <div className="truncate text-[10px] text-gh-fg-muted">@{a.login}</div>
                  </button>
                  {isActive && (
                    <span className="text-[10px] text-gh-success-emphasis">active</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    className="rounded-md px-1 text-[10px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                    title="Remove account"
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
              onAdd();
              setOpen(false);
            }}
            className="mt-1 w-full rounded-md border border-dashed border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
          >
            + Add account
          </button>
        </div>
      )}
    </div>
  );
}
