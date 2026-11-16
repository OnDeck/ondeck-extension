import { useEffect, useRef } from 'react';
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
  onSignOut: () => void;
  syncSettings: {
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
  onSignOut,
  syncSettings,
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
    <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 right-0 top-0 flex w-[320px] animate-[tg-slide-in_250ms_ease-out] flex-col border-l border-tg-line bg-tg-bg1"
      >
        {/* Header */}
        <div className="flex h-[44px] shrink-0 items-center border-b border-tg-line px-3">
          <h2 id="settings-title" className="m-0 flex-1 font-sans text-[14px] font-semibold text-tg-fg0">
            Settings
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-6 w-6 cursor-pointer items-center justify-center border-none bg-transparent text-[18px] text-tg-fg2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Section title="Desktop Notifications" />
          {desktopNotifications.loading ? (
            <div className="text-[12px] text-tg-fg3">Loading...</div>
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
                {desktopNotifications.settings.enabled && (
                  <div className="mt-2.5 font-sans text-[11.5px] text-tg-fg2">Alert me for</div>
                )}
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

          <Section title="Sync" className="mt-6" />
          {syncSettings.loading ? (
            <div className="text-[12px] text-tg-fg3">Loading...</div>
          ) : (
            <div className="py-2">
              <div className="mb-2 font-sans text-[13px] text-tg-fg0">Refresh interval</div>
              <select
                value={syncSettings.syncInterval}
                onChange={(e) => syncSettings.updateSyncInterval(Number(e.target.value) as 5 | 15 | 30 | 60)}
                className="w-full cursor-pointer rounded border border-tg-line bg-tg-bg0 px-3 py-2 font-sans text-[13px] text-tg-fg0"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          )}

          <Section title="Account" className="mt-6" />
          <button
            type="button"
            onClick={onSignOut}
            className="w-full cursor-pointer rounded border border-tg-line bg-transparent px-3 py-2 font-sans text-[13px] font-medium text-tg-critical"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-tg-fg3 ${className}`}>
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
    <label className="flex cursor-pointer items-center justify-between py-2">
      <span className="font-sans text-[13px] text-tg-fg0">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 cursor-pointer"
      />
    </label>
  );
}
