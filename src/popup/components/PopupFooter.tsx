interface Props {
  selectedCount: number;
}

export function PopupFooter({ selectedCount }: Props) {
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
        gap: 10,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ marginLeft: 'auto', color: 'var(--tg-fg2)', flexShrink: 0 }}>
        {selectedCount > 0 ? `${selectedCount} selected` : ''}
      </span>
    </div>
  );
}
