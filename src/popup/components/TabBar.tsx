export type TabId = 'home' | 'assigned' | 'mentions' | 'reviews' | 'notifications';

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'notifications', label: 'Inbox' },
];

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="flex border-b border-gh-border-default bg-gh-canvas-default">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={
              'flex-1 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide transition-colors ' +
              (isActive
                ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
                : 'border-b-2 border-transparent text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
