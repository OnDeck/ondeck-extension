import { useState } from 'react';
import { isOAuthConfigured } from '../../lib/auth';
import type { UseAuth } from '../hooks/useAuth';

const TOKEN_URL =
  'https://github.com/settings/tokens/new?description=OnDeck&scopes=notifications,repo';

interface Props {
  auth: UseAuth;
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--tg-line-strong)] text-[10.5px] text-[var(--tg-fg2)]"
        style={{ fontFamily: 'var(--tg-mono)' }}
      >
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-[var(--tg-fg0)]">{title}</div>
        {children}
      </div>
    </li>
  );
}

export function SignIn({ auth }: Props) {
  const [token, setToken] = useState('');
  const canSubmit = !auth.busy && token.trim().length > 0;

  return (
    <div className="flex h-full flex-col bg-[var(--tg-bg0)] px-5 pb-4 pt-6">
      <div className="flex items-center gap-2">
        <img src="/icons/icon48.png" alt="" width={24} height={24} />
        <span className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--tg-fg0)]">OnDeck</span>
      </div>

      <h1 className="mb-1 mt-6 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-[var(--tg-fg0)]">
        Your GitHub inbox, without the noise.
      </h1>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[var(--tg-fg2)]">
        Review requests, mentions and assignments in one popup, with a desktop alert when something
        needs you.
      </p>

      {isOAuthConfigured() && (
        <button
          type="button"
          disabled={auth.busy}
          onClick={() => void auth.signInWithOAuth()}
          className="mt-5 h-9 rounded-md bg-[var(--tg-accent)] text-[12.5px] font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {auth.busy ? 'Connecting…' : 'Sign in with GitHub'}
        </button>
      )}

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) void auth.signInWithPat(token);
        }}
      >
        <ol className="m-0 flex list-none flex-col gap-4 p-0">
          <Step n={1} title="Create a classic token on GitHub">
            <p className="mb-2 mt-1 text-[11.5px] leading-[1.45] text-[var(--tg-fg2)]">
              The link pre-selects the <code style={{ fontFamily: 'var(--tg-mono)' }}>notifications</code> and{' '}
              <code style={{ fontFamily: 'var(--tg-mono)' }}>repo</code> scopes. Fine-grained tokens can&rsquo;t read
              notifications yet.
            </p>
            <a
              href={TOKEN_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--tg-accent)] px-3 text-[12px] font-semibold text-white no-underline hover:brightness-110"
            >
              Create token on GitHub
              <span aria-hidden="true" className="opacity-70">
                ↗
              </span>
            </a>
          </Step>

          <Step n={2} title="Paste it here">
            <label htmlFor="pat" className="sr-only">
              Personal access token
            </label>
            <input
              id="pat"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_…"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-2 h-8 w-full rounded-md border border-[var(--tg-line-strong)] bg-[var(--tg-bg1)] px-2.5 text-[12px] text-[var(--tg-fg0)] outline-none placeholder:text-[var(--tg-fg3)] focus:border-[var(--tg-accent-border)]"
              style={{ fontFamily: 'var(--tg-mono)' }}
            />
          </Step>

          <Step n={3} title="Connect">
            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-2 h-8 w-full rounded-md border border-[var(--tg-line-strong)] bg-[var(--tg-bg2)] text-[12px] font-semibold text-[var(--tg-fg0)] enabled:hover:border-[var(--tg-accent-border)] disabled:opacity-50"
            >
              {auth.busy ? 'Verifying…' : 'Connect to GitHub'}
            </button>
          </Step>
        </ol>
      </form>

      {auth.error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-[var(--tg-critical)] bg-[var(--tg-critical-soft)] px-3 py-2 text-[12px] text-[var(--tg-critical)]"
        >
          {auth.error}
        </div>
      )}

      <p className="m-0 mt-auto pt-4 text-[11px] leading-[1.45] text-[var(--tg-fg3)]">
        Your token stays in this browser, encrypted, and is only ever sent to api.github.com.
      </p>
    </div>
  );
}
