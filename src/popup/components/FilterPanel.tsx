import { useState, useEffect, type CSSProperties } from 'react';

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="filter-title"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: 'var(--tg-bg1)',
          borderLeft: '1px solid var(--tg-line)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 250ms ease-out',
        }}
      >
        <style>
          {`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}
        </style>

        {/* Header */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--tg-line)',
            flexShrink: 0,
          }}
        >
          <h2
            id="filter-title"
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--tg-fg0)',
              margin: 0,
              flex: 1,
              fontFamily: 'var(--tg-sans)',
            }}
          >
            Filters
            {activeFilterCount > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 11,
                  fontWeight: 500,
                  color: 'var(--tg-accent)',
                }}
              >
                ({activeFilterCount})
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tg-fg2)',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
          }}
        >
          {/* Date Range Section */}
          <Section title="Date Range" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label style={labelStyle}>
              <span style={labelTextStyle}>From</span>
              <input
                type="date"
                value={localFrom}
                onChange={(e) => setLocalFrom(e.target.value)}
                style={inputStyle}
              />
            </label>
            <label style={labelStyle}>
              <span style={labelTextStyle}>To</span>
              <input
                type="date"
                value={localTo}
                onChange={(e) => setLocalTo(e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          {/* Repository Section */}
          <Section title="Repositories" style={{ marginTop: 24 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {repositories.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--tg-fg3)', padding: '8px 0' }}>
                No repositories
              </div>
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
        <div
          style={{
            padding: 12,
            borderTop: '1px solid var(--tg-line)',
            display: 'flex',
            gap: 8,
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={handleResetLocal}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: '1px solid var(--tg-line)',
              borderRadius: 4,
              background: 'transparent',
              color: 'var(--tg-fg0)',
              fontSize: 13,
              fontFamily: 'var(--tg-sans)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 4,
              background: 'var(--tg-accent)',
              color: 'white',
              fontSize: 13,
              fontFamily: 'var(--tg-sans)',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, style }: { title: string; style?: CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--tg-fg3)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        fontFamily: 'var(--tg-sans)',
        ...style,
      }}
    >
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
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 0',
        cursor: 'pointer',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        style={{
          width: 14,
          height: 14,
          cursor: 'pointer',
          marginRight: 8,
        }}
      />
      <span
        style={{
          fontSize: 12,
          color: 'var(--tg-fg0)',
          fontFamily: 'var(--tg-mono)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={repo}
      >
        {repo}
      </span>
    </label>
  );
}

const labelStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};

const labelTextStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--tg-fg2)',
  fontFamily: 'var(--tg-sans)',
};

const inputStyle: CSSProperties = {
  padding: '6px 8px',
  border: '1px solid var(--tg-line)',
  borderRadius: 4,
  background: 'var(--tg-bg0)',
  color: 'var(--tg-fg0)',
  fontSize: 12,
  fontFamily: 'var(--tg-mono)',
};
