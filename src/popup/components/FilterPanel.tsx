import { useState, useEffect } from 'react';

interface FilterPanelProps {
  open: boolean;
  onClose: () => void;
  repositories: string[];
  selectedRepos: string[];
  dateFrom: string;
  dateTo: string;
  onRepoChange: (repos: string[]) => void;
  onDateChange: (from: string, to: string) => void;
  onReset: () => void;
}

export function FilterPanel({
  open,
  onClose,
  repositories,
  selectedRepos,
  dateFrom,
  dateTo,
  onRepoChange,
  onDateChange,
  onReset,
}: FilterPanelProps) {
  const [localRepos, setLocalRepos] = useState<Set<string>>(new Set(selectedRepos));
  const [localFrom, setLocalFrom] = useState(dateFrom);
  const [localTo, setLocalTo] = useState(dateTo);

  useEffect(() => {
    setLocalRepos(new Set(selectedRepos));
  }, [selectedRepos]);

  useEffect(() => {
    setLocalFrom(dateFrom);
    setLocalTo(dateTo);
  }, [dateFrom, dateTo]);

  // ESC key handler
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleRepoToggle = (repo: string) => {
    const newRepos = new Set(localRepos);
    if (newRepos.has(repo)) {
      newRepos.delete(repo);
    } else {
      newRepos.add(repo);
    }
    setLocalRepos(newRepos);
  };

  const handleApply = () => {
    onRepoChange(Array.from(localRepos));
    onDateChange(localFrom, localTo);
    onClose();
  };

  const handleResetLocal = () => {
    setLocalRepos(new Set());
    setLocalFrom('');
    setLocalTo('');
    onReset();
    onClose();
  };

  const activeFilterCount =
    localRepos.size + (localFrom ? 1 : 0) + (localTo ? 1 : 0);

  const dateInput =
    'rounded border border-tg-line bg-tg-bg0 px-2 py-1.5 font-mono text-[12px] text-tg-fg0';
  const footerButton = 'flex-1 cursor-pointer rounded px-3 py-2 font-sans text-[13px] font-medium';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="filter-title" className="fixed inset-0 z-[1000]">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/40" />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute bottom-0 right-0 top-0 flex w-[320px] animate-[tg-slide-in_250ms_ease-out] flex-col border-l border-tg-line bg-tg-bg1"
      >
        {/* Header */}
        <div className="flex h-[44px] shrink-0 items-center border-b border-tg-line px-3">
          <h2 id="filter-title" className="m-0 flex-1 font-sans text-[14px] font-semibold text-tg-fg0">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 text-[11px] font-medium text-tg-accent">({activeFilterCount})</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="flex h-6 w-6 cursor-pointer items-center justify-center border-none bg-transparent text-[18px] text-tg-fg2"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <Section title="Date Range" />
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="font-sans text-[12px] text-tg-fg2">From</span>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                className={dateInput}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-sans text-[12px] text-tg-fg2">To</span>
              <input type="date" value={localTo} onChange={(e) => setLocalTo(e.target.value)} className={dateInput} />
            </label>
          </div>

          <Section title="Repositories" className="mt-6" />
          <div className="flex flex-col gap-1">
            {repositories.length === 0 ? (
              <div className="py-2 text-[12px] text-tg-fg3">No repositories</div>
            ) : (
              repositories.map((repo) => (
                <RepoCheckbox
                  key={repo}
                  repo={repo}
                  checked={localRepos.has(repo)}
                  onChange={() => handleRepoToggle(repo)}
                />
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 gap-2 border-t border-tg-line p-3">
          <button
            type="button"
            onClick={handleResetLocal}
            className={`${footerButton} border border-tg-line bg-transparent text-tg-fg0`}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className={`${footerButton} border-none bg-tg-accent text-white`}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, className = '' }: { title: string; className?: string }) {
  return (
    <div className={`mb-2 font-sans text-[11px] font-semibold uppercase tracking-[0.5px] text-tg-fg3 ${className}`}>
      {title}
    </div>
  );
}

function RepoCheckbox({
  repo,
  checked,
  onChange,
}: {
  repo: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center py-1.5">
      <input type="checkbox" checked={checked} onChange={onChange} className="mr-2 h-3.5 w-3.5 cursor-pointer" />
      <span
        className="overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[12px] text-tg-fg0"
        title={repo}
      >
        {repo}
      </span>
    </label>
  );
}
