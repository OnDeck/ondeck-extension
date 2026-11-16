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
      className="block"
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

const iconButton =
  'flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded border-none bg-transparent text-tg-fg2 transition-[background,color] duration-[80ms] hover:bg-tg-bg3 hover:text-tg-fg0';

export function Header({
  viewer,
  unreadCount,
  onSearch,
  onRefresh,
  onSettingsClick,
}: Props) {
  return (
    <header className="flex h-[44px] shrink-0 items-center border-b border-tg-line bg-tg-bg1 pl-3 pr-2.5">
      {/* Brand mark */}
      <div className="mr-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-[5px]">
        <OnDeckLogo />
      </div>

      {/* Viewer avatar — sign-out lives in Settings, not behind a hidden click */}
      <a
        href={viewer.html_url}
        target="_blank"
        rel="noreferrer"
        title={`@${viewer.login}`}
        className="mx-2 flex shrink-0"
      >
        <img
          src={viewer.avatar_url}
          alt={viewer.login}
          className="h-5 w-5 rounded-[10px] border border-tg-line-strong"
        />
      </a>

      {unreadCount > 0 && (
        <span className="rounded bg-tg-bg3 px-1.5 py-[1.5px] font-mono text-[10.5px] font-medium leading-none text-tg-fg2">
          {unreadCount}
        </span>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onRefresh}
        title="Refresh notifications"
        aria-label="Refresh notifications"
        className={iconButton}
      >
        <RefreshIcon />
      </button>

      <button
        type="button"
        onClick={onSearch}
        title="Search · ⌘K"
        aria-label="Search notifications"
        className={iconButton}
      >
        <SearchIcon />
      </button>

      <button
        type="button"
        data-testid="settings-button"
        onClick={onSettingsClick}
        title="Settings"
        aria-label="Settings"
        className={iconButton}
      >
        <CogIcon />
      </button>
    </header>
  );
}
