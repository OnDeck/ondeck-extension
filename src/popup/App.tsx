import { useEffect, useState } from 'react';
import { Header } from './components/Header';
import { Notifications } from './components/Notifications';
import { PopupFooter } from './components/PopupFooter';
import { SettingsPanel } from './components/SettingsPanel';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import { useFilterSettings } from './hooks/useFilterSettings';
import { useNotificationSettings } from './hooks/useNotificationSettings';
import { useNotificationSounds } from './hooks/useNotificationSounds';
import { useTabVisibility } from './hooks/useTabVisibility';

export default function App() {
  const auth = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const notificationSettings = useNotificationSettings();
  const tabVisibility = useTabVisibility();
  const filterSettings = useFilterSettings();

  // Enable notification sounds
  useNotificationSounds(notificationSettings.settings);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
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

  const handleSettingsSignOut = () => {
    const confirmed = window.confirm(
      'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
    );

    if (confirmed) {
      void auth.signOut();
      setSettingsOpen(false);
    }
  };

  if (auth.status === 'loading') {
    return (
      <div
        style={{
          display: 'flex',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          color: 'var(--tg-fg3)',
          background: 'var(--tg-bg0)',
          fontFamily: 'var(--tg-mono)',
        }}
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
      style={{
        display: 'flex',
        height: '100%',
        width: '100%',
        flexDirection: 'column',
        background: 'var(--tg-bg0)',
      }}
    >
      <Header
        viewer={auth.viewer}
        unreadCount={unreadCount}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        onSearch={() => setSearchOpen(true)}
        onRefresh={() => window.location.reload()}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Notifications
          token={token}
          onUnreadCountChange={setUnreadCount}
          searchOpen={searchOpen}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchClose={closeSearch}
        />
      </div>

      <PopupFooter selectedCount={0} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={notificationSettings.settings}
        loading={notificationSettings.loading}
        onUpdateSound={notificationSettings.updateSound}
        onSignOut={handleSettingsSignOut}
        tabVisibility={tabVisibility}
        filterSettings={filterSettings}
      />
    </div>
  );
}
