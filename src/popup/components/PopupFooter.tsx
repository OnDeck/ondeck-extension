interface Props {
  selectedCount: number;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: 'var(--tg-mono)',
        fontSize: 9.5,
        padding: '1px 4px',
        background: 'var(--tg-bg3)',
        border: '1px solid var(--tg-line-strong)',
        borderRadius: 3,
        color: 'var(--tg-fg1)',
        marginRight: 4,
      }}
    >
      {children}
    </kbd>
  );
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
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Kbd>↑↓</Kbd>navigate
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Kbd>E</Kbd>archive
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <Kbd>R</Kbd>reply
      </span>
      <span style={{ marginLeft: 'auto', color: 'var(--tg-fg2)', flexShrink: 0 }}>
        {selectedCount > 0 ? `${selectedCount} selected` : ''}
      </span>
    </div>
  );
}
