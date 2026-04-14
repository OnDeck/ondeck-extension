import type { ReactNode } from 'react';

export type TabId = 'home' | 'assigned' | 'reviews' | 'mentions' | 'notifications';

interface Tab {
  id: TabId;
  label: string;
  icon: ReactNode;
}

interface Props {
  active: TabId;
  onChange: (id: TabId) => void;
  tabs: Tab[];
}

/**
 * Bottom tab bar that mirrors GitHub's mobile nav. Switches between the
 * top-level views in the popup. Labels are hidden on smaller popups
 * (which, for this extension, is always) to keep the bar height low.
 */
export function TabBar({ active, onChange, tabs }: Props) {
  return (
    <nav className="flex shrink-0 border-t border-gh-border-default bg-gh-canvas-default">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition ${
              isActive
                ? 'text-gh-accent-emphasis'
                : 'text-gh-fg-muted hover:text-gh-fg-default'
            }`}
            aria-pressed={isActive}
          >
            <span aria-hidden="true">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
