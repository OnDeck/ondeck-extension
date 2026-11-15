import { useEffect, useRef, type CSSProperties } from 'react';
import type { NotificationSettings } from '../hooks/useNotificationSettings';
import type { NotificationReasonFilter, UserSettings } from '../../shared/settings/types';

const REASON_LABELS: Record<NotificationReasonFilter, string> = {
  assign: 'Assigned to you',
  mention: 'Mentions',
  review_requested: 'Review requests',
  team_mention: 'Team mentions',
  security_alert: 'Security alerts',
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: NotificationSettings | null;
  loading: boolean;
  onUpdateSound: (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => void;
  onSignOut: () => void;
  filterSettings: {
    syncInterval: 5 | 15 | 30 | 60;
    loading: boolean;
    updateSyncInterval: (interval: 5 | 15 | 30 | 60) => void;
  };
  desktopNotifications: {
    settings: UserSettings['notifications'] | null;
    loading: boolean;
    updateEnabled: (enabled: boolean) => void;
    updateSound: (sound: boolean) => void;
    toggleReason: (reason: NotificationReasonFilter, enabled: boolean) => void;
  };
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  loading,
  onUpdateSound,
  onSignOut,
  filterSettings,
  desktopNotifications,
}: SettingsPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // ESC key handler
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  // Focus management
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: 'var(--tg-bg1)',
          borderLeft: '1px solid var(--tg-line)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 250ms ease-out',
        }}
      >
        <style>
          {`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}
        </style>

        {/* Header */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--tg-line)',
            flexShrink: 0,
          }}
        >
          <h2
            id="settings-title"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--tg-fg0)',
              margin: 0,
              flex: 1,
              fontFamily: 'var(--tg-sans)',
            }}
          >
            Settings
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tg-fg2)',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
          ) : (
            <>
              {/* Notification Sounds Section */}
              <Section title="Notification Sounds" />
              {settings && (
                <>
                  <ToggleRow
                    label="Pull Requests"
                    checked={settings.soundEnabled.PullRequest}
                    onChange={(checked) => onUpdateSound('PullRequest', checked)}
                  />
                  <ToggleRow
                    label="Issues"
                    checked={settings.soundEnabled.Issue}
                    onChange={(checked) => onUpdateSound('Issue', checked)}
                  />
                  <ToggleRow
                    label="Releases"
                    checked={settings.soundEnabled.Release}
                    onChange={(checked) => onUpdateSound('Release', checked)}
                  />
                  <ToggleRow
                    label="Discussions"
                    checked={settings.soundEnabled.Discussion}
                    onChange={(checked) => onUpdateSound('Discussion', checked)}
                  />
                  <ToggleRow
                    label="Commits"
                    checked={settings.soundEnabled.Commit}
                    onChange={(checked) => onUpdateSound('Commit', checked)}
                  />
                </>
              )}

              {/* Desktop Notifications Section */}
              <Section title="Desktop Notifications" style={{ marginTop: 24 }} />
              {desktopNotifications.loading ? (
                <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
              ) : (
                desktopNotifications.settings && (
                  <>
                    <ToggleRow
                      label="Enable desktop notifications"
                      checked={desktopNotifications.settings.enabled}
                      onChange={(checked) => desktopNotifications.updateEnabled(checked)}
                    />
                    <ToggleRow
                      label="Play sound"
                      checked={desktopNotifications.settings.sound}
                      onChange={(checked) => desktopNotifications.updateSound(checked)}
                    />
                    {desktopNotifications.settings.enabled &&
                      (Object.keys(REASON_LABELS) as NotificationReasonFilter[]).map((reason) => (
                        <ToggleRow
                          key={reason}
                          label={REASON_LABELS[reason]}
                          checked={desktopNotifications.settings!.reasons.includes(reason)}
                          onChange={(checked) => desktopNotifications.toggleReason(reason, checked)}
                        />
                      ))}
                  </>
                )
              )}

              {/* Sync Section */}
              <Section title="Sync" style={{ marginTop: 24 }} />
              {filterSettings.loading ? (
                <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  <div style={{
                    fontSize: 13,
                    color: 'var(--tg-fg0)',
                    fontFamily: 'var(--tg-sans)',
                    marginBottom: 8,
                  }}>
                    Refresh interval
                  </div>
                  <select
                    value={filterSettings.syncInterval}
                    onChange={(e) => filterSettings.updateSyncInterval(Number(e.target.value) as 5 | 15 | 30 | 60)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      fontFamily: 'var(--tg-sans)',
                      color: 'var(--tg-fg0)',
                      background: 'var(--tg-bg0)',
                      border: '1px solid var(--tg-line)',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <option value={5}>5 minutes</option>
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>60 minutes</option>
                  </select>
                </div>
              )}

              {/* Account Section */}
              <Section title="Account" style={{ marginTop: 24 }} />
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--tg-line)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: 'var(--tg-red, #ff4444)',
                  fontSize: 13,
                  fontFamily: 'var(--tg-sans)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, style }: { title: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--tg-fg3)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        fontFamily: 'var(--tg-sans)',
        ...style,
      }}
    >
      {title}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--tg-fg0)',
          fontFamily: 'var(--tg-sans)',
        }}
      >
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          cursor: 'pointer',
        }}
      />
    </label>
  );
}
