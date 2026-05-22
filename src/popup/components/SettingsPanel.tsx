import { useEffect, useRef, type CSSProperties } from 'react';
import type { NotificationSettings } from '../hooks/useNotificationSettings';
import type { TabId } from '../tabs';
import type { TabVisibilitySettings } from '../hooks/useTabVisibility';

const TAB_LABELS: Record<TabId, string> = {
  dashboard: 'Home',
  prs: 'PRs',
  mentions: 'Mentions',
  reviews: 'Reviews',
  notifications: 'Inbox',
};

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: NotificationSettings | null;
  loading: boolean;
  onUpdateSound: (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => void;
  onSignOut: () => void;
  tabVisibility: {
    settings: TabVisibilitySettings | null;
    loading: boolean;
    toggleTab: (tabId: TabId, visible: boolean) => void;
  };
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  loading,
  onUpdateSound,
  onSignOut,
  tabVisibility,
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

              {/* Visible Tabs Section */}
              <Section title="Visible Tabs" style={{ marginTop: 24 }} />
              {tabVisibility.loading ? (
                <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
              ) : (
                tabVisibility.settings && (
                  <>
                    {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => (
                      <ToggleRow
                        key={tabId}
                        label={TAB_LABELS[tabId]}
                        checked={tabVisibility.settings!.visible[tabId]}
                        onChange={(checked) => tabVisibility.toggleTab(tabId, checked)}
                      />
                    ))}
                  </>
                )
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
