import { useEffect, useRef, useState } from 'react';
import type { AccountSummary } from '../../lib/auth';

interface Props {
  accounts: AccountSummary[];
  activeId: string | null;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function AccountSwitcher({
  accounts,
  activeId,
  onSwitch,
  onAdd,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Switch account"
        aria-label="Switch account"
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
      >
        ▾
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 w-56 rounded-md border border-gh-border-default bg-gh-canvas-subtle shadow-lg">
          <ul className="max-h-56 overflow-y-auto">
            {accounts.map((a) => {
              const isActive = a.id === activeId;
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-2 px-3 py-2 text-xs ${
                    isActive ? 'bg-gh-canvas-default' : ''
                  }`}
                >
                  {a.viewer ? (
                    <img
                      src={a.viewer.avatar_url}
                      alt={a.login}
                      className="h-5 w-5 rounded-full border border-gh-border-default"
                    />
                  ) : (
                    <div className="h-5 w-5 rounded-full border border-gh-border-default bg-gh-canvas-default" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSwitch(a.id);
                      setOpen(false);
                    }}
                    className="flex-1 truncate text-left text-gh-fg-default"
                  >
                    @{a.login}
                    {isActive ? (
                      <span className="ml-1 text-gh-success-emphasis">●</span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    title={`Remove @${a.login}`}
                    className="text-gh-fg-muted hover:text-gh-danger-emphasis"
                  >
                    ×
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
            className="w-full border-t border-gh-border-default px-3 py-2 text-left text-xs text-gh-accent-emphasis hover:bg-gh-canvas-default"
          >
            + Add account
          </button>
        </div>
      ) : null}
    </div>
  );
}
