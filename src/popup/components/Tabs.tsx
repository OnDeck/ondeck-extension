export type Tab = 'home' | 'assigned' | 'reviews' | 'mentions' | 'notifications';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'notifications', label: 'Inbox' },
];

export function Tabs({ active, onChange }: Props) {
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
              'flex-1 px-2 py-2 text-[11px] font-medium transition-colors ' +
              (isActive
                ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
                : 'text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
