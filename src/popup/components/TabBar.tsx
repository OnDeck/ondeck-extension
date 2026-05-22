import { useEffect, useState } from 'react';
import type { TabId } from '../tabs';
import { cn } from '../lib/cn';
import { useTabVisibility } from '../hooks/useTabVisibility';

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

const mapCountsToState = (cached: CountsCache): Record<TabId, number> => ({
  dashboard: 0,
  prs: cached.prs || 0,
  mentions: cached.mentions || 0,
  reviews: cached.reviews || 0,
  notifications: cached.notifications || 0,
});

export function TabBar({ active, onChange }: Props) {
  const { settings, loading } = useTabVisibility();

  if (loading || !settings) {
    // Show skeleton while loading
    return (
      <nav
        role="tablist"
        className="flex border-b border-gh-border-default bg-gh-canvas-default"
        style={{ height: 33 }}
      />
    );
  }

  const visibleTabs = TABS.filter((tab) => settings.visible[tab.id]);

  return (
    <nav
      role="tablist"
      className="flex border-b border-gh-border-default bg-gh-canvas-default"
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.id === active;
        const count = counts[tab.id];
        const shouldShowBadge = showCounts && count > 0 && tabsToShow.includes(tab.id);

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
