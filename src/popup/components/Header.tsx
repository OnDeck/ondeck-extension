import { useState } from 'react';
import type { Viewer } from '../../lib/github-api';
import { BellIcon } from './BellIcon';

interface Props {
  viewer: Viewer;
  unreadCount: number;
  onSignOut: () => void;
  busy: boolean;
  onSearch: () => void;
  onDashboard: () => void;
  dashboardActive: boolean;
  onSettingsClick: () => void;
}

function TriageLogo() {
  return (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor">
      <rect x="1" y="2" width="12" height="2.4" rx="0.6" />
      <rect x="5.8" y="4.4" width="2.4" height="7.6" rx="0.6" />
    </svg>
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

function ChartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1.5" y="9" width="2.5" height="3.5" rx="0.5" />
      <rect x="5.75" y="5.5" width="2.5" height="7" rx="0.5" />
      <rect x="10" y="2" width="2.5" height="10.5" rx="0.5" />
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
  onSignOut,
  busy,
  onSearch,
  onDashboard,
  dashboardActive,
  onSettingsClick,
}: Props) {
  const handleAvatarSignOut = () => {
    if (busy) return;

    const confirmed = window.confirm(
      'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
    );

    if (confirmed) {
      onSignOut();
    }
  };
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
          width: 22,
          height: 22,
          borderRadius: 5,
          background: 'linear-gradient(180deg, #1d2128 0%, #11141a 100%)',
          border: '1px solid var(--tg-line-strong)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--tg-fg0)',
          marginRight: 8,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          flexShrink: 0,
        }}
      >
        <TriageLogo />
      </div>

      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--tg-fg0)',
          letterSpacing: -0.2,
          fontFamily: 'var(--tg-sans)',
          marginRight: 6,
        }}
      >
        Triage
      </span>

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

      {unreadCount > 0 && (
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
          <BellIcon />
        </div>
      )}

      {/* Viewer avatar */}
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        title={`@${viewer.login} · click to sign out`}
        onClick={handleAvatarSignOut}
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          border: '1px solid var(--tg-line-strong)',
          marginLeft: 8,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.5 : 1,
          transition: 'opacity 80ms',
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1 }} />

      {/* Search */}
      <button
        type="button"
        onClick={onSearch}
        title="Search · ⌘K"
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

      {/* Dashboard toggle */}
      <button
        type="button"
        onClick={onDashboard}
        title="Dashboard"
        style={{
          ...iconBtnBase,
          color: dashboardActive ? 'var(--tg-accent)' : 'var(--tg-fg2)',
          background: dashboardActive ? 'var(--tg-accent-soft)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!dashboardActive) {
            (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg0)';
            (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg3)';
          }
        }}
        onMouseLeave={(e) => {
          if (!dashboardActive) {
            (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg2)';
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          }
        }}
      >
        <ChartIcon />
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

      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </header>
  );
}
