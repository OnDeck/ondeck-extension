const bellPulseStyle = `
  @keyframes bellPulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.7;
    }
  }
`;

// Animated bell icon for notification badge. Decorative only — semantic meaning provided by adjacent unread count.
export function BellIcon(): JSX.Element {
  return (
    <>
      <style>{bellPulseStyle}</style>
      <svg
        aria-hidden="true"
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'bellPulse 2s ease-in-out infinite',
          color: 'var(--tg-fg2)',
        }}
      >
        <path d="M10.5 5.5A3.5 3.5 0 0 0 3.5 5.5c0 3.5-1.5 4.5-1.5 4.5h10s-1.5-1-1.5-4.5" />
        <path d="M8.5 12a1.5 1.5 0 0 1-3 0" />
      </svg>
    </>
  );
}
