export type TabKey = 'home' | 'assigned' | 'mentions' | 'reviews' | 'notifications';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'home', label: 'Home' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'notifications', label: 'Inbox' },
];

interface Props {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="flex border-b border-gh-border-default bg-gh-canvas-default">
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={
              'flex-1 border-b-2 px-2 py-2 text-[11px] font-medium transition-colors ' +
              (isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
