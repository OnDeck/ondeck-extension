import { useState } from 'react';
import { isOAuthConfigured } from '../../lib/auth';
import type { UseAuth } from '../hooks/useAuth';

interface Props {
  auth: UseAuth;
  onCancel?: () => void;
  onSignedIn?: () => void;
}

export function SignIn({ auth, onCancel, onSignedIn }: Props) {
  const [token, setToken] = useState('');
  const oauthAvailable = isOAuthConfigured();

  const handlePat = async () => {
    await auth.signInWithPat(token);
    if (!auth.error) onSignedIn?.();
  };

  const handleOAuth = async () => {
    await auth.signInWithOAuth();
    if (!auth.error) onSignedIn?.();
  };

  return (
    <div className="flex h-full flex-col px-4 py-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gh-fg-default">Sign in to GitHub</h2>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] text-gh-fg-muted hover:text-gh-fg-default"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gh-fg-muted">
        Connect your GitHub account to see assigned PRs, mentions, and reviews.
      </p>

      {oauthAvailable && (
        <button
          type="button"
          disabled={auth.busy}
          onClick={() => void handleOAuth()}
          className="mt-4 rounded-md border border-gh-border-default bg-gh-accent-emphasis px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
        >
          {auth.busy ? 'Connecting…' : 'Sign in with GitHub'}
        </button>
      )}

      <div className="mt-4">
        <label htmlFor="pat" className="block text-xs font-semibold">
          Personal Access Token
        </label>
        <p className="mt-1 text-[11px] text-gh-fg-muted">
          Scopes: <code className="font-mono">read:user</code>,{' '}
          <code className="font-mono">notifications</code>,{' '}
          <code className="font-mono">repo</code>.{' '}
          <a
            className="text-gh-accent-emphasis hover:underline"
            href="https://github.com/settings/tokens/new"
            target="_blank"
            rel="noreferrer"
          >
            Create one
          </a>
          .
        </p>
        <input
          id="pat"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="ghp_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="mt-2 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-2 py-1.5 font-mono text-xs text-gh-fg-default outline-none placeholder:text-gh-fg-muted focus:border-gh-accent-emphasis"
        />
        <button
          type="button"
          disabled={auth.busy || !token.trim()}
          onClick={() => void handlePat()}
          className="mt-2 w-full rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-xs font-semibold text-gh-fg-default hover:border-gh-accent-emphasis disabled:opacity-60"
        >
          {auth.busy ? 'Verifying…' : 'Connect with token'}
        </button>
      </div>

      {auth.error && (
        <div className="mt-3 rounded-md border border-gh-danger-emphasis bg-gh-canvas-subtle px-3 py-2 text-xs text-gh-danger-emphasis">
          {auth.error}
        </div>
      )}

      <p className="mt-auto pt-4 text-[11px] text-gh-fg-muted">
        Tokens are encrypted with AES-GCM before being written to
        <code className="font-mono"> chrome.storage</code>.
      </p>
    </div>
  );
}
