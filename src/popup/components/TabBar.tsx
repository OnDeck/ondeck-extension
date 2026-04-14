import { TABS, type TabId } from '../tabs';

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export function TabBar({ active, onSelect }: Props) {
  return (
    <nav
      role="tablist"
      aria-label="Views"
      className="flex shrink-0 border-b border-gh-border-default bg-gh-canvas-subtle"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(tab.id)}
            className={[
              'flex-1 px-2 py-2 text-[11px] font-semibold transition-colors',
              isActive
                ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
                : 'border-b-2 border-transparent text-gh-fg-muted hover:text-gh-fg-default',
            ].join(' ')}
          >
            {tab.shortLabel}
          </button>
        );
      })}
    </nav>
  );
}
