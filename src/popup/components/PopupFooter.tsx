export function PopupFooter() {
  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        borderTop: '1px solid var(--tg-line)',
        background: 'var(--tg-bg1)',
        fontSize: 10.5,
        fontFamily: 'var(--tg-mono)',
        color: 'var(--tg-fg3)',
        flexShrink: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <a
        href="https://github.com/notifications"
        target="_blank"
        rel="noreferrer"
        className="hover:text-[var(--tg-fg1)]"
        style={{ marginLeft: 'auto', color: 'var(--tg-fg2)', textDecoration: 'none' }}
      >
        Open GitHub inbox ↗
      </a>
    </div>
  );
}
