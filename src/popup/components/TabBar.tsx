import { TABS, type TabId } from '../navigation';

interface Props {
  active: TabId;
  onChange: (tab: TabId) => void;
}

export function TabBar({ active, onChange }: Props) {
  return (
    <nav className="flex shrink-0 items-center gap-1 border-b border-gh-border-default bg-gh-canvas-default px-2 py-1">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={
              'rounded-md px-2 py-1 text-[11px] font-medium transition ' +
              (isActive
                ? 'bg-gh-canvas-subtle text-gh-fg-default'
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
