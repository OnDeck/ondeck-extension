import type { Viewer } from '../../lib/github-api';

interface Props {
  viewer: Viewer;
  unreadCount: number;
  onSearch: () => void;
  onRefresh: () => void;
  onSettingsClick: () => void;
}

function OnDeckLogo() {
  return (
    <img
      src="/icons/icon32.png"
      alt="OnDeck"
      width="16"
      height="16"
      style={{ display: 'block' }}
    />
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="6" cy="6" r="4" />
      <path d="M9 9l3.5 3.5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4.5C11.2 2.7 9.4 1.5 7.3 1.5c-2.8 0-5 2.2-5 5M2 9.5C2.8 11.3 4.6 12.5 6.7 12.5c2.8 0 5-2.2 5-5" />
      <path d="M2 4.5V1M2 4.5H5.5M12 9.5V13M12 9.5H8.5" />
    </svg>
  );
}

function CogIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="7" cy="7" r="2.2" />
      <path d="M7 1v1.4M7 11.6V13M1 7h1.4M11.6 7H13M2.7 2.7l1 1M10.3 10.3l1 1M11.3 2.7l-1 1M3.7 10.3l-1 1" />
    </svg>
  );
}

const iconBtnBase: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 4,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 80ms, color 80ms',
};

export function Header({
  viewer,
  unreadCount,
  onSearch,
  onRefresh,
  onSettingsClick,
}: Props) {
  return (
    <header
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px 0 12px',
        borderBottom: '1px solid var(--tg-line)',
        background: 'var(--tg-bg1)',
        flexShrink: 0,
        gap: 0,
      }}
    >
      {/* Brand mark */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          flexShrink: 0,
        }}
      >
        <OnDeckLogo />
      </div>

      {/* Viewer avatar — sign-out lives in Settings, not behind a hidden click */}
      <a
        href={viewer.html_url}
        target="_blank"
        rel="noreferrer"
        title={`@${viewer.login}`}
        style={{ display: 'flex', marginLeft: 8, marginRight: 8, flexShrink: 0 }}
      >
        <img
          src={viewer.avatar_url}
          alt={viewer.login}
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            border: '1px solid var(--tg-line-strong)',
          }}
        />
      </a>

      {unreadCount > 0 && (
        <span
          style={{
            padding: '1.5px 6px',
            borderRadius: 4,
            background: 'var(--tg-bg3)',
            color: 'var(--tg-fg2)',
            fontSize: 10.5,
            fontFamily: 'var(--tg-mono)',
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {unreadCount}
        </span>
      )}

      <div style={{ flex: 1 }} />

      {/* Refresh */}
      <button
        type="button"
        onClick={onRefresh}
        title="Refresh notifications"
        aria-label="Refresh notifications"
        style={{ ...iconBtnBase, color: 'var(--tg-fg2)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg0)';
          (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg2)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <RefreshIcon />
      </button>

      {/* Search */}
      <button
        type="button"
        onClick={onSearch}
        title="Search · ⌘K"
        aria-label="Search notifications"
        style={{ ...iconBtnBase, color: 'var(--tg-fg2)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg0)';
          (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg2)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <SearchIcon />
      </button>

      {/* Settings */}
      <button
        type="button"
        data-testid="settings-button"
        onClick={onSettingsClick}
        title="Settings"
        aria-label="Settings"
        style={{ ...iconBtnBase, color: 'var(--tg-fg2)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg0)';
          (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg2)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <CogIcon />
      </button>
    </header>
  );
}
