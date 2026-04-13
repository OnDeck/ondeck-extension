import { useState } from 'react';
import { AccountSwitcher } from './components/AccountSwitcher';
import { ReviewStats } from './components/ReviewStats';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import type { AccountSummary } from '../lib/accounts';

export default function App() {
  const auth = useAuth();
  const [activeAccount, setActiveAccount] = useState<AccountSummary | null>(null);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  // The popup still falls back to the single-token sign-in when no account
  // has been added yet. Once at least one account exists the multi-account
  // switcher takes over and signOut clears the legacy single-token store.
  if ((auth.status === 'signed-out' || !auth.viewer) && !activeAccount) {
    return (
      <div className="flex h-full w-full flex-col">
        <SignIn auth={auth} />
        <div className="border-t border-gh-border-default">
          <AccountSwitcher onActiveChanged={setActiveAccount} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <AccountSwitcher onActiveChanged={setActiveAccount} />
      <ReviewStats
        accountId={activeAccount?.id ?? null}
        login={activeAccount?.login ?? auth.viewer?.login ?? null}
      />
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          Signed in. Switch accounts above to swap workspaces. Per-account
          stats persist locally.
        </div>
      </main>
    </div>
  );
}
