import { useEffect, useState } from 'react';
import type { TabId } from '../tabs';
import { cn } from '../lib/cn';
import { getSettings } from '../../lib/settings';
import type { CountsCache } from '../../shared/settings/types';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'prs', label: 'PRs' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'notifications', label: 'Inbox' },
];

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  const [counts, setCounts] = useState<Record<TabId, number>>({
    dashboard: 0,
    prs: 0,
    mentions: 0,
    reviews: 0,
    notifications: 0,
  });
  const [showCounts, setShowCounts] = useState(false);

  useEffect(() => {
    // Load initial counts and settings
    const loadData = async () => {
      const [storageCounts, settings] = await Promise.all([
        chrome.storage.local.get('counts'),
        getSettings(),
      ]);

      const cached = storageCounts.counts as CountsCache | undefined;
      if (cached) {
        setCounts({
          dashboard: 0,
          prs: cached.prs,
          mentions: cached.mentions,
          reviews: cached.reviews,
          notifications: cached.notifications,
        });
      }

      setShowCounts(settings.display.showTabCounts);
    };

    loadData();

    // Listen for storage changes
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes.counts?.newValue) {
        const cached = changes.counts.newValue as CountsCache;
        setCounts({
          dashboard: 0,
          prs: cached.prs,
          mentions: cached.mentions,
          reviews: cached.reviews,
          notifications: cached.notifications,
        });
      }

      if (areaName === 'sync' && changes.settings?.newValue) {
        const settings = changes.settings.newValue;
        setShowCounts(settings.display.showTabCounts);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  return (
    <nav
      role="tablist"
      className="flex border-b border-gh-border-default bg-gh-canvas-default"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const count = counts[tab.id];
        const shouldShowBadge = showCounts && count > 0;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 border-b-2 px-1 py-2 text-[11px] font-semibold transition-colors',
              isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default',
            )}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              {shouldShowBadge && (
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none min-w-[18px]',
                    isActive
                      ? 'bg-gh-accent-emphasis text-white'
                      : 'bg-gh-neutral-muted text-gh-fg-muted',
                  )}
                >
                  {count}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
