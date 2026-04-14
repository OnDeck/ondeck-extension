import { useEffect, useRef, useState } from 'react';
import type { AccountSummary } from '../hooks/useAuth';

interface Props {
  accounts: AccountSummary[];
  activeLogin: string | null;
  onSwitch: (login: string) => void;
  onAdd: () => void;
  onRemove: (login: string) => void;
}

export function AccountSwitcher({
  accounts,
  activeLogin,
  onSwitch,
  onAdd,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const active = accounts.find((a) => a.login === activeLogin);
  if (!active) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Switch account"
        className="flex items-center gap-1 rounded-md border border-gh-border-default px-1.5 py-1 text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
      >
        <img
          src={active.viewer.avatar_url}
          alt={active.login}
          className="h-4 w-4 rounded-full"
        />
        <span className="max-w-[70px] truncate">{active.login}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-subtle shadow-lg">
          <ul role="listbox" className="max-h-60 overflow-y-auto py-1">
            {accounts.map((a) => {
              const isActive = a.login === activeLogin;
              return (
                <li key={a.login}>
                  <div className="flex items-center gap-2 px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onSwitch(a.login);
                        setOpen(false);
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <img
                        src={a.viewer.avatar_url}
                        alt={a.login}
                        className="h-5 w-5 shrink-0 rounded-full"
                      />
                      <span className="min-w-0 flex-1 truncate text-xs text-gh-fg-default">
                        {a.viewer.name ?? a.login}
                      </span>
                      {isActive && (
                        <span className="shrink-0 text-[10px] text-gh-success-emphasis">
                          ✓
                        </span>
                      )}
                    </button>
                    {!isActive && (
                      <button
                        type="button"
                        onClick={() => onRemove(a.login)}
                        title="Remove account"
                        aria-label={`Remove ${a.login}`}
                        className="rounded-md px-1 text-[11px] text-gh-fg-muted hover:text-gh-danger-emphasis"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gh-border-default px-2 py-1.5">
            <button
              type="button"
              onClick={() => {
                onAdd();
                setOpen(false);
              }}
              className="w-full rounded-md bg-gh-accent-emphasis px-2 py-1 text-[11px] font-semibold text-white hover:brightness-110"
            >
              + Add account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
