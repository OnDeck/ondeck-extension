interface Props {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      style={{
        transform: collapsed ? 'rotate(-90deg)' : 'none',
        transition: 'transform 120ms',
        opacity: 0.7,
        flexShrink: 0,
      }}
    >
      <path d="M2.5 3.5l2.5 2.5 2.5-2.5" />
    </svg>
  );
}

export function GroupHeader({ label, count, collapsed, onToggle }: Props) {
  return (
    <div
      onClick={onToggle}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onToggle(); }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px 6px 10px',
        fontSize: 10.5,
        fontFamily: 'var(--tg-mono)',
        color: 'var(--tg-fg2)',
        fontWeight: 600,
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        cursor: 'pointer',
        userSelect: 'none',
        background: 'var(--tg-bg1)',
        borderBottom: '1px solid var(--tg-line)',
        position: 'sticky',
        top: 0,
        zIndex: 1,
        lineHeight: 1,
      }}
    >
      <ChevronIcon collapsed={collapsed} />
      <span>{label}</span>
      <span style={{ color: 'var(--tg-fg3)', fontWeight: 500 }}>{count}</span>
    </div>
  );
}
