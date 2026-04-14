import { TABS, type TabId } from '../tabs';

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="flex border-b border-gh-border-default bg-gh-canvas-default"
      role="tablist"
      aria-label="Sections"
    >
      {TABS.map((tab) => {
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={
              'flex-1 px-2 py-2 text-[11px] font-medium transition-colors ' +
              (selected
                ? 'border-b-2 border-gh-accent-emphasis text-gh-fg-default'
                : 'border-b-2 border-transparent text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {tab.shortLabel}
          </button>
        );
      })}
    </nav>
  );
}
