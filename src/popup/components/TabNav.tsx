import type { TabKey } from '../tabs';

interface Props {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'notifications', label: 'Inbox' },
];

export function TabNav({ active, onChange }: Props) {
  return (
    <nav className="flex border-b border-gh-border-default bg-gh-canvas-default">
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex-1 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ${
              isActive
                ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
                : 'border-b-2 border-transparent text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
