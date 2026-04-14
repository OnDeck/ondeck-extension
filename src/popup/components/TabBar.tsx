import { TABS, type TabId } from '../tabs';

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export function TabBar({ active, onSelect }: Props) {
  return (
    <nav
      role="tablist"
      className="flex items-center gap-1 border-b border-gh-border-default bg-gh-canvas-default px-2"
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={
              'relative px-2 py-2 text-[11px] font-semibold transition-colors ' +
              (isActive
                ? 'text-gh-fg-default after:absolute after:inset-x-1 after:-bottom-px after:h-[2px] after:rounded-full after:bg-gh-accent-emphasis'
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
