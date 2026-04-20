import type { TabId } from '../tabs';
import { cn } from '../lib/cn';

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
  return (
    <nav
      role="tablist"
      className="flex border-b border-gh-border-default bg-gh-canvas-default"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
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
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
