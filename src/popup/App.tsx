import { useState } from 'react';
import { AssignedPrsTab } from './components/AssignedPrsTab';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { MentionsTab } from './components/MentionsTab';
import { NotificationsTab } from './components/NotificationsTab';
import { ReviewsTab } from './components/ReviewsTab';
import { SignIn } from './components/SignIn';
import { TabBar, type TabId } from './components/TabBar';
import { useAccounts } from './hooks/useAccounts';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';

const PrGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.5.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0ZM11 2.5h-1V.75a.75.75 0 0 0-1.28-.53L6.97 1.97a.75.75 0 0 0 0 1.06l1.75 1.75a.751.751 0 0 0 1.042-.018.751.751 0 0 0 .218-.532V3h1a1 1 0 0 1 1 1v6.628a2.251 2.251 0 1 0 1.5 0V4A2.5 2.5 0 0 0 11 2.5Z" />
  </svg>
);

const HomeGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M6.906.664a1.749 1.749 0 0 1 2.187 0l5.25 4.2c.415.332.657.835.657 1.367v7.019A1.75 1.75 0 0 1 13.25 15h-3.5a.75.75 0 0 1-.75-.75V9H7v5.25a.75.75 0 0 1-.75.75h-3.5A1.75 1.75 0 0 1 1 13.25V6.23c0-.531.242-1.034.657-1.366Z" />
  </svg>
);

const BellGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.519 1.519 0 0 1 13.482 13H2.518a1.516 1.516 0 0 1-1.263-2.36l1.703-2.554A.255.255 0 0 0 3 7.947Z" />
  </svg>
);

const EyeGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M8 2c1.981 0 3.671.992 4.933 2.078 1.27 1.091 2.187 2.345 2.637 3.023a1.62 1.62 0 0 1 0 1.798c-.45.678-1.367 1.932-2.637 3.023C11.67 13.008 9.981 14 8 14c-1.981 0-3.671-.992-4.933-2.078C1.797 10.83.88 9.576.43 8.898a1.62 1.62 0 0 1 0-1.798c.45-.678 1.367-1.932 2.637-3.023C4.33 2.992 6.019 2 8 2ZM1.679 7.932a.12.12 0 0 0 0 .136c.411.622 1.241 1.75 2.366 2.717C5.176 11.758 6.527 12.5 8 12.5c1.473 0 2.825-.742 3.955-1.715 1.124-.967 1.954-2.096 2.366-2.717a.12.12 0 0 0 0-.136c-.412-.622-1.242-1.75-2.366-2.717C10.824 4.242 9.473 3.5 8 3.5c-1.473 0-2.825.742-3.955 1.715-1.124.967-1.954 2.096-2.366 2.717ZM8 10a2 2 0 1 1-.001-3.999A2 2 0 0 1 8 10Z" />
  </svg>
);

const AtGlyph = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
    <path d="M5.5 8a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z" />
    <path d="M8 0a8 8 0 0 1 7.906 6.914c.064.39.094.779.094 1.172 0 1.98-.969 3.414-2.719 3.414-.953 0-1.66-.395-2.063-1.133-.679.73-1.648 1.133-2.719 1.133-2.125 0-3.75-1.617-3.75-4s1.625-4 3.75-4c.875 0 1.68.28 2.313.75V4.5h1.5v5.25c0 .5.312.75.937.75.938 0 1.5-.938 1.5-2.422 0-.297-.023-.59-.07-.879A6.496 6.496 0 1 0 13.5 13.016l.984 1.136A7.999 7.999 0 1 1 8 0Z" />
  </svg>
);

export default function App() {
  const auth = useAuth();
  const theme = useTheme();
  const accounts = useAccounts(auth.accountId);
  const [tab, setTab] = useState<TabId>('home');
  // `addingAccount` short-circuits the signed-in view to show the
  // SignIn screen again, so the user can paste a token for a second
  // identity without losing the active one.
  const [addingAccount, setAddingAccount] = useState(false);

  if (auth.status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-xs text-gh-fg-muted">
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer || addingAccount) {
    return (
      <SignIn
        auth={auth}
        onDone={async () => {
          setAddingAccount(false);
          await accounts.refresh();
        }}
        headline={addingAccount ? 'Add another account' : undefined}
      />
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <Header
        viewer={auth.viewer}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        themeMode={theme.mode}
        onThemeChange={theme.setMode}
        accounts={accounts.accounts}
        activeAccountId={accounts.activeId}
        onSwitchAccount={async (id) => {
          await accounts.switchTo(id);
          await auth.refresh();
        }}
        onForgetAccount={async (id) => {
          await accounts.forget(id);
          await auth.refresh();
        }}
        onAddAccount={() => setAddingAccount(true)}
      />
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && (
          <Dashboard viewer={auth.viewer} accountId={auth.accountId} onNavigate={setTab} />
        )}
        {tab === 'assigned' && <AssignedPrsTab viewer={auth.viewer} />}
        {tab === 'reviews' && <ReviewsTab viewer={auth.viewer} />}
        {tab === 'mentions' && <MentionsTab viewer={auth.viewer} />}
        {tab === 'notifications' && <NotificationsTab />}
      </main>
      <TabBar
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'home', label: 'Home', icon: HomeGlyph },
          { id: 'assigned', label: 'Assigned', icon: PrGlyph },
          { id: 'reviews', label: 'Reviews', icon: EyeGlyph },
          { id: 'mentions', label: 'Mentions', icon: AtGlyph },
          { id: 'notifications', label: 'Inbox', icon: BellGlyph },
        ]}
      />
    </div>
  );
}
