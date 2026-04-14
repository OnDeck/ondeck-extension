import { useState } from 'react';
import { DEFAULT_FILTERS, type FilterState } from '../../lib/filters';
import { FilterBar } from './FilterBar';

/**
 * Demo / discoverability surface for the quick actions and filter
 * primitives. List tabs (assigned, mentions, reviews, notifications)
 * compose the same FilterBar from their own data sets.
 */
export function QuickActionsPanel() {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  return (
    <section className="flex flex-col gap-3">
      <header className="px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gh-fg-muted">
          Quick actions
        </h2>
      </header>

      <ul className="flex flex-col gap-1 px-2">
        <ActionRow
          label="Open with keyboard"
          hint="Cmd+Shift+G (Mac) · Ctrl+Shift+G (Win/Linux)"
        />
        <ActionRow
          label="Mark PR as reviewed"
          hint="Available on review-request rows"
        />
        <ActionRow label="React to a comment" hint="👍 ❤️ 🚀 from any mention" />
        <ActionRow label="Draft a quick reply" hint="From the mentions or reviews tab" />
      </ul>

      <div>
        <h3 className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
          Filters
        </h3>
        <FilterBar state={filters} repos={[]} labels={[]} onChange={setFilters} />
        <p className="px-4 text-[11px] text-gh-fg-muted">
          Filter by repo, label, or date range — wires into list tabs as they
          ship.
        </p>
      </div>
    </section>
  );
}

function ActionRow({ label, hint }: { label: string; hint: string }) {
  return (
    <li className="rounded-md border border-transparent px-3 py-2 hover:border-gh-border-default hover:bg-gh-canvas-subtle">
      <div className="text-sm font-semibold text-gh-fg-default">{label}</div>
      <div className="text-[11px] text-gh-fg-muted">{hint}</div>
    </li>
  );
}
