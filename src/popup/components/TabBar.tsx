import { TABS, type TabId } from '../navigation';

interface Props {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export function TabBar({ active, onSelect }: Props) {
  return (
    <nav className="flex items-stretch border-b border-gh-border-default bg-gh-canvas-default">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`flex-1 border-b-2 px-1 py-2 text-[11px] font-medium transition ${
              isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default'
            }`}
          >
            {tab.shortLabel}
          </button>
        );
      })}
    </nav>
  );
}
