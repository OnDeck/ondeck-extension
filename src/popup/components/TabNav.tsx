export type TabKey =
  | 'dashboard'
  | 'assigned'
  | 'mentions'
  | 'reviews'
  | 'notifications';

interface Props {
  active: TabKey;
  onChange: (key: TabKey) => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'dashboard', label: 'Home' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'mentions', label: 'Mentions' },
  { key: 'reviews', label: 'Reviews' },
  { key: 'notifications', label: 'Inbox' },
];

export function TabNav({ active, onChange }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Workflow sections"
      className="flex items-center gap-1 border-b border-gh-border-default px-2"
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-t-md border-b-2 px-2 py-1.5 text-[11px] transition-colors ${
              isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
