import type { TabId } from './types';

export interface TabDef {
  id: TabId;
  label: string;
}

interface Props {
  tabs: TabDef[];
  active: TabId;
  onSelect: (id: TabId) => void;
}

// Compact GitHub-styled tab bar that sits below the header. Each item
// shows a 1px accent underline when active to match Primer conventions.
export function TabBar({ tabs, active, onSelect }: Props) {
  return (
    <nav
      aria-label="Primary"
      className="flex border-b border-gh-border-default bg-gh-canvas-default text-[11px]"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={
              'relative flex-1 px-2 py-2 font-medium transition-colors ' +
              (isActive
                ? 'text-gh-fg-default'
                : 'text-gh-fg-muted hover:text-gh-fg-default')
            }
          >
            {tab.label}
            {isActive && (
              <span className="absolute inset-x-2 bottom-0 h-[2px] rounded-t bg-gh-accent-emphasis" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
