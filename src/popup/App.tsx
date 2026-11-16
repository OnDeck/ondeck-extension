import { useCallback, useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Notifications } from './components/Notifications';
import { SettingsPanel } from './components/SettingsPanel';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import { useDesktopNotificationSettings } from './hooks/useDesktopNotificationSettings';
import { useSyncSettings } from './hooks/useSyncSettings';
import { shouldIgnoreShortcut } from './lib/keyboard';

export default function App() {
  const auth = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshSignal, setRefreshSignal] = useState(0);
  const desktopNotifications = useDesktopNotificationSettings();
  const syncSettings = useSyncSettings();

  // ⌘K / Ctrl+K and / open search; row shortcuts live in Notifications.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === '/' && !shouldIgnoreShortcut(e)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
  };

  const handleRefresh = useCallback(() => {
    setRefreshSignal((n) => n + 1);
    chrome.runtime.sendMessage({ type: 'REQUEST_SYNC' }).catch(() => {
      // Background worker not awake yet; the next alarm will update the badge.
    });
  }, []);

  const handleSettingsSignOut = () => {
    const confirmed = window.confirm(
      'Sign out of OnDeck? Your personal access token will be removed.'
    );

    if (confirmed) {
      void auth.signOut();
      setSettingsOpen(false);
    }
  };

  if (auth.status === 'loading') {
    return (
      <div
        className="flex h-full items-center justify-center bg-tg-bg0 font-mono text-[12px] text-tg-fg3"
      >
        Loading…
      </div>
    );
  }

  if (auth.status === 'signed-out' || !auth.viewer) {
    return <SignIn auth={auth} />;
  }

  const token = auth.token ?? '';

  return (
    <div
      className="flex h-full w-full flex-col bg-tg-bg0"
    >
      <Header
        viewer={auth.viewer}
        unreadCount={unreadCount}
        onSearch={() => setSearchOpen(true)}
        onRefresh={handleRefresh}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <Notifications
          token={token}
          onUnreadCountChange={setUnreadCount}
          refreshSignal={refreshSignal}
          onReconnect={() => void auth.signOut()}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClose={closeSearch}
        />
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSignOut={handleSettingsSignOut}
        syncSettings={syncSettings}
        desktopNotifications={desktopNotifications}
      />
    </div>
  );
}
