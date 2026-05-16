import { useEffect, useState } from 'react';
import type { UserSettings, BadgeCountFormula, SyncInterval } from '../../shared/settings/types';
import type { TabId } from '../tabs';
import { DEFAULT_SETTINGS } from '../../shared/settings/defaults';
import { getSettings, saveSettings } from '../../lib/settings';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: Props) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      getSettings().then(setSettings);
    }
  }, [isOpen]);

  // Auto-save on change (debounced)
  useEffect(() => {
    if (!isOpen) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      await saveSettings(settings);
      setIsSaving(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [settings, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-80 bg-gh-canvas-default overflow-y-auto border-l border-gh-border-default">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gh-canvas-default border-b border-gh-border-default px-4 py-3 flex items-center justify-between">
          <button
            onClick={onClose}
            className="text-gh-fg-muted hover:text-gh-fg-default transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z"></path>
            </svg>
          </button>
          <h2 className="text-gh-fg-default font-semibold text-sm">Settings</h2>
          <div className="w-4" />
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Sync & Updates Section */}
          <section>
            <h3 className="text-gh-fg-default font-semibold text-xs mb-3">Sync & Updates</h3>

            <label className="flex items-center gap-2 mb-3">
              <input
                type="checkbox"
                checked={settings.sync.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  sync: { ...settings.sync, enabled: e.target.checked }
                })}
                className="rounded border-gh-border-default"
              />
              <span className="text-gh-fg-default text-xs">Auto-sync enabled</span>
            </label>

            <div>
              <label className="text-gh-fg-muted text-xs block mb-1">Sync interval</label>
              <select
                value={settings.sync.intervalMinutes}
                onChange={(e) => setSettings({
                  ...settings,
                  sync: { ...settings.sync, intervalMinutes: Number(e.target.value) as SyncInterval }
                })}
                disabled={!settings.sync.enabled}
                className="w-full bg-gh-canvas-subtle border border-gh-border-default rounded px-2 py-1 text-xs text-gh-fg-default disabled:opacity-50"
              >
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </section>

          {/* Badge Count Section */}
          <section>
            <h3 className="text-gh-fg-default font-semibold text-xs mb-3">Badge Count</h3>

            <div className="space-y-2">
              {(['all', 'actionable', 'reviews-only', 'custom'] as BadgeCountFormula[]).map((formula) => (
                <label key={formula} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name="badge-formula"
                    checked={settings.badge.formula === formula}
                    onChange={() => setSettings({
                      ...settings,
                      badge: { ...settings.badge, formula }
                    })}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="text-gh-fg-default text-xs block">
                      {formula === 'all' && 'All items'}
                      {formula === 'actionable' && 'Actionable (PRs + Reviews)'}
                      {formula === 'reviews-only' && 'Reviews only'}
                      {formula === 'custom' && 'Custom...'}
                    </span>
                    {formula === 'all' && (
                      <span className="text-gh-fg-muted text-[10px]">PRs + Reviews + Mentions + Inbox</span>
                    )}
                    {formula === 'actionable' && (
                      <span className="text-gh-fg-muted text-[10px]">Only actionable items</span>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {settings.badge.formula === 'custom' && (
              <div className="mt-3 ml-5 space-y-1">
                {(['prs', 'reviews', 'mentions', 'notifications'] as TabId[]).map((tab) => (
                  <label key={tab} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.badge.customTabs?.includes(tab)}
                      onChange={(e) => {
                        const current = settings.badge.customTabs || [];
                        const updated = e.target.checked
                          ? [...current, tab]
                          : current.filter(t => t !== tab);
                        setSettings({
                          ...settings,
                          badge: { ...settings.badge, customTabs: updated }
                        });
                      }}
                      className="rounded border-gh-border-default"
                    />
                    <span className="text-gh-fg-default text-xs capitalize">{tab}</span>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Display Section */}
          <section>
            <h3 className="text-gh-fg-default font-semibold text-xs mb-3">Display</h3>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.display.showTabCounts}
                onChange={(e) => setSettings({
                  ...settings,
                  display: { ...settings.display, showTabCounts: e.target.checked }
                })}
                className="rounded border-gh-border-default"
              />
              <span className="text-gh-fg-default text-xs">Show counts in tabs</span>
            </label>
          </section>

          {/* Filters Section (UI only, not functional) */}
          <section>
            <h3 className="text-gh-fg-default font-semibold text-xs mb-3">Filters</h3>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.filters.includeDraftPrs}
                onChange={(e) => setSettings({
                  ...settings,
                  filters: { ...settings.filters, includeDraftPrs: e.target.checked }
                })}
                className="rounded border-gh-border-default"
              />
              <span className="text-gh-fg-default text-xs">Include draft PRs</span>
            </label>

            <p className="text-gh-fg-muted text-[10px] mt-2">
              Filter options are saved but not yet applied to counts.
            </p>
          </section>
        </div>

        {/* Save indicator */}
        {isSaving && (
          <div className="fixed bottom-4 right-4 bg-gh-success-emphasis text-white text-xs px-3 py-1 rounded-full">
            Saved
          </div>
        )}
      </div>
    </div>
  );
}
