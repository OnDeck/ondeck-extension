import { TABS, type TabId } from '../tabs';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="flex items-center gap-1 border-b border-gh-border-default bg-gh-canvas-default px-2"
      role="tablist"
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
            className={
              'relative px-2 py-2 text-[11px] font-semibold transition-colors ' +
              (isActive
                ? 'text-gh-fg-default after:absolute after:inset-x-1 after:-bottom-px after:h-[2px] after:bg-gh-accent-emphasis'
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
