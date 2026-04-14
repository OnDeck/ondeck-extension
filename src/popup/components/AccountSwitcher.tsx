import { useState } from 'react';
import type { AccountSummary } from '../../lib/auth';

interface Props {
  accounts: AccountSummary[];
  activeId: number | null;
  busy: boolean;
  onSwitch: (id: number) => void;
  onAddAccount: (token: string) => Promise<void>;
  onRemove: (id: number) => void;
}

export function AccountSwitcher({
  accounts,
  activeId,
  busy,
  onSwitch,
  onAddAccount,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [token, setToken] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const active = accounts.find((a) => a.id === activeId);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Switch account"
        className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
      >
        {accounts.length > 1 ? `${accounts.length} accounts` : 'Account'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-md border border-gh-border-default bg-gh-canvas-default p-1 text-[11px] shadow-lg">
          <ul className="flex flex-col gap-0.5">
            {accounts.map((a) => {
              const isActive = a.id === activeId;
              return (
                <li key={a.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busy || isActive}
                    onClick={() => {
                      onSwitch(a.id);
                      setOpen(false);
                    }}
                    className={[
                      'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-gh-canvas-subtle',
                      isActive ? 'text-gh-accent-emphasis' : 'text-gh-fg-default',
                    ].join(' ')}
                  >
                    <img
                      src={a.avatar_url}
                      alt={a.login}
                      className="h-5 w-5 rounded-full border border-gh-border-default"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold">
                        {a.name ?? a.login}
                      </div>
                      <div className="truncate text-[10px] text-gh-fg-muted">
                        @{a.login}
                      </div>
                    </div>
                    {isActive && <span className="text-[10px]">●</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(a.id)}
                    title="Remove account"
                    disabled={busy}
                    className="rounded-md border border-gh-border-default px-1.5 py-0.5 text-[10px] text-gh-fg-muted hover:border-gh-danger-emphasis hover:text-gh-danger-emphasis"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 border-t border-gh-border-default pt-1">
            {!addOpen ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="block w-full rounded-md px-2 py-1 text-left text-gh-fg-default hover:bg-gh-canvas-subtle"
              >
                + Add account…
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  placeholder="ghp_…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 font-mono text-[11px] text-gh-fg-default outline-none focus:border-gh-accent-emphasis"
                />
                <button
                  type="button"
                  disabled={busy || !token.trim()}
                  onClick={async () => {
                    setErr(null);
                    try {
                      await onAddAccount(token);
                      setToken('');
                      setAddOpen(false);
                      setOpen(false);
                    } catch (e) {
                      setErr(e instanceof Error ? e.message : 'Failed');
                    }
                  }}
                  className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1 text-[11px] font-semibold text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
                >
                  Verify & add
                </button>
                {err && (
                  <div className="rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-2 py-1 text-[10px] text-gh-danger-emphasis">
                    {err}
                  </div>
                )}
              </div>
            )}
          </div>

          {active && (
            <div className="mt-1 truncate border-t border-gh-border-default pt-1 text-[10px] text-gh-fg-muted">
              Active: @{active.login}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
