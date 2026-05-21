import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { Header } from './components/Header';
import { Notifications } from './components/Notifications';
import { PopupFooter } from './components/PopupFooter';
import { SettingsPanel } from './components/SettingsPanel';
import { SignIn } from './components/SignIn';
import { useAuth } from './hooks/useAuth';
import { useNotificationSettings } from './hooks/useNotificationSettings';
import { useNotificationSounds } from './hooks/useNotificationSounds';

export default function App() {
  const auth = useAuth();
  const [dashboardActive, setDashboardActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notificationSettings = useNotificationSettings();

  // Enable notification sounds
  useNotificationSounds(notificationSettings.settings);

  const handleSettingsSignOut = () => {
    const confirmed = confirm(
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
  const login = auth.viewer.login;

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
        onSearch={() => void 0}
        onDashboard={() => setDashboardActive((v) => !v)}
        dashboardActive={dashboardActive}
        onSettingsClick={() => setSettingsOpen(true)}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {dashboardActive ? (
          <Dashboard token={token} login={login} />
        ) : (
          <Notifications token={token} onUnreadCountChange={setUnreadCount} />
        )}
      </div>

      <PopupFooter selectedCount={0} />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={notificationSettings.settings}
        loading={notificationSettings.loading}
        onUpdateSound={notificationSettings.updateSound}
        onSignOut={handleSettingsSignOut}
      />
    </div>
  );
}
