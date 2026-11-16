import { useState } from 'react';
import type { DeviceFlowState } from '../../shared/auth/deviceFlowState';
import { GITHUB_CLIENT_ID } from '../../shared/constants';
import type { UseAuth } from '../hooks/useAuth';
import { useDeviceFlow } from '../hooks/useDeviceFlow';

const TOKEN_URL =
  'https://github.com/settings/tokens/new?description=OnDeck&scopes=notifications,repo';

interface Props {
  auth: UseAuth;
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-tg-line-strong text-[10.5px] text-tg-fg2 font-mono">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-medium text-tg-fg0">{title}</div>
        {children}
      </div>
    </li>
  );
}

function PatSteps({ auth }: Props) {
  const [token, setToken] = useState('');
  const canSubmit = !auth.busy && token.trim().length > 0;

  return (
    <form
      className="mt-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void auth.signInWithPat(token);
      }}
    >
      <ol className="m-0 flex list-none flex-col gap-4 p-0">
        <Step n={1} title="Create a classic token on GitHub">
          <p className="mb-2 mt-1 text-[11.5px] leading-[1.45] text-tg-fg2">
            The link pre-selects the <code className="font-mono">notifications</code> and{' '}
            <code className="font-mono">repo</code> scopes. Fine-grained tokens can&rsquo;t read
            notifications yet.
          </p>
          <a
            href={TOKEN_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-tg-accent px-3 text-[12px] font-semibold text-white no-underline hover:brightness-110"
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
            className="mt-2 h-8 w-full rounded-md border border-tg-line-strong bg-tg-bg1 px-2.5 text-[12px] text-tg-fg0 outline-none placeholder:text-tg-fg3 focus:border-tg-accent-border font-mono"
          />
        </Step>

        <Step n={3} title="Connect">
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-2 h-8 w-full rounded-md border border-tg-line-strong bg-tg-bg2 text-[12px] font-semibold text-tg-fg0 enabled:hover:border-tg-accent-border disabled:opacity-50"
          >
            {auth.busy ? 'Verifying…' : 'Connect to GitHub'}
          </button>
        </Step>
      </ol>
    </form>
  );
}

const primaryButton =
  'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border-none bg-tg-accent text-[12.5px] font-semibold text-white no-underline enabled:hover:brightness-110 disabled:opacity-60';
const linkButton =
  'cursor-pointer border-none bg-transparent p-0 text-[11.5px] text-tg-fg2 underline-offset-2 hover:underline';

function CompactPat({ auth }: Props) {
  const [token, setToken] = useState('');
  const canSubmit = !auth.busy && token.trim().length > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void auth.signInWithPat(token);
      }}
    >
      <label htmlFor="pat" className="sr-only">
        Personal access token
      </label>
      <div className="flex gap-2">
        <input
          id="pat"
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="ghp_…"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-tg-line-strong bg-tg-bg1 px-2.5 text-[12px] text-tg-fg0 outline-none placeholder:text-tg-fg3 focus:border-tg-accent-border font-mono"
        />
        <button
          type="submit"
          disabled={!canSubmit}
          className="h-8 shrink-0 rounded-md border border-tg-line-strong bg-tg-bg2 px-3 text-[12px] font-semibold text-tg-fg0 enabled:hover:border-tg-accent-border disabled:opacity-50"
        >
          {auth.busy ? 'Verifying…' : 'Connect'}
        </button>
      </div>
      <p className="mb-0 mt-2 text-[11.5px] leading-[1.45] text-tg-fg2">
        <a
          href={TOKEN_URL}
          target="_blank"
          rel="noreferrer"
          className="text-tg-accent no-underline hover:underline"
        >
          Create a classic token
        </a>{' '}
        with the <code className="font-mono">notifications</code> and{' '}
        <code className="font-mono">repo</code> scopes.
      </p>
    </form>
  );
}

async function copyAndOpen(state: Extract<DeviceFlowState, { status: 'waiting' }>): Promise<void> {
  // If the clipboard is unavailable the code is still on screen to type.
  await navigator.clipboard.writeText(state.userCode).catch(() => undefined);
  await chrome.tabs.create({ url: state.verificationUri });
}

function WaitingForCode({
  state,
  onCancel,
}: {
  state: Extract<DeviceFlowState, { status: 'waiting' }>;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex flex-col gap-3">
      <div className="text-[12.5px] font-medium text-tg-fg0">Enter this code on GitHub</div>
      <output
        aria-label="One-time code"
        className="block rounded-md border border-tg-line-strong bg-tg-bg1 py-3 text-center font-mono text-[22px] font-semibold tracking-[3px] text-tg-fg0 select-all"
      >
        {state.userCode}
      </output>
      <button type="button" className={primaryButton} onClick={() => void copyAndOpen(state)}>
        Copy code and open GitHub
        <span aria-hidden="true" className="opacity-70">
          ↗
        </span>
      </button>
      <div className="flex items-center justify-between text-[11.5px] text-tg-fg2">
        <span className="tg-skel">Waiting for you to approve OnDeck…</span>
        <button type="button" className={linkButton} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function DeviceSignIn({ auth }: Props) {
  const { state, start, cancel } = useDeviceFlow();

  if (state?.status === 'waiting') return <WaitingForCode state={state} onCancel={cancel} />;

  return (
    <div className="mt-6 flex flex-col">
      {state?.status === 'failed' && (
        <div
          role="alert"
          className="mb-3 rounded-md border border-tg-critical bg-tg-critical-soft px-3 py-2 text-[12px] text-tg-critical"
        >
          {state.message}
        </div>
      )}
      <button
        type="button"
        className={primaryButton}
        disabled={state?.status === 'starting'}
        onClick={start}
      >
        {state?.status === 'starting'
          ? 'Getting a code…'
          : state?.status === 'failed'
            ? 'Try again'
            : 'Sign in with GitHub'}
      </button>
      <p className="mb-0 mt-2 text-[11.5px] leading-[1.45] text-tg-fg2">
        You&rsquo;ll approve OnDeck on github.com with a one-time code.
      </p>

      <div className="my-5 flex items-center gap-3 text-[11px] text-tg-fg3">
        <span className="h-px flex-1 bg-tg-line" />
        or use a personal access token
        <span className="h-px flex-1 bg-tg-line" />
      </div>

      <CompactPat auth={auth} />
    </div>
  );
}

export function SignIn({ auth }: Props) {
  return (
    <div className="flex h-full flex-col bg-tg-bg0 px-5 pb-4 pt-6">
      <div className="flex items-center gap-2">
        <img src="/icons/icon48.png" alt="" width={24} height={24} />
        <span className="text-[15px] font-semibold tracking-[-0.2px] text-tg-fg0">OnDeck</span>
      </div>

      <h1 className="mb-1 mt-6 text-[20px] font-semibold leading-tight tracking-[-0.4px] text-tg-fg0">
        Your GitHub inbox, without the noise.
      </h1>
      <p className="m-0 text-[12.5px] leading-[1.5] text-tg-fg2">
        Review requests, mentions and assignments in one popup, with a desktop alert when something
        needs you.
      </p>

      {GITHUB_CLIENT_ID ? <DeviceSignIn auth={auth} /> : <PatSteps auth={auth} />}

      {auth.error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-tg-critical bg-tg-critical-soft px-3 py-2 text-[12px] text-tg-critical"
        >
          {auth.error}
        </div>
      )}

      <p className="m-0 mt-auto pt-4 text-[11px] leading-[1.45] text-tg-fg3">
        Your token stays in this browser, encrypted, and is only ever sent to api.github.com.
      </p>
    </div>
  );
}
