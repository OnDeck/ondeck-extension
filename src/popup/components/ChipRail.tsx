export type ChipId = 'all' | 'unread' | 'reviews' | 'mentions' | 'assigned' | 'ci' | 'security';

export interface ChipFilter {
  id: ChipId;
  label: string;
}

export const CHIP_FILTERS: ChipFilter[] = [
  { id: 'all',      label: 'Inbox'    },
  { id: 'unread',   label: 'Unread'   },
  { id: 'reviews',  label: 'Reviews'  },
  { id: 'mentions', label: 'Mentions' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'ci',       label: 'CI'       },
  { id: 'security', label: 'Security' },
];

interface Props {
  active: ChipId;
  counts: Partial<Record<ChipId, number>>;
  onChange: (id: ChipId) => void;
}

export function ChipRail({ active, counts, onChange }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '7px 12px',
        borderBottom: '1px solid var(--tg-line)',
        background: 'var(--tg-bg1)',
        overflowX: 'auto',
        flexShrink: 0,
        scrollbarWidth: 'none',
      }}
    >
      {CHIP_FILTERS.map((f) => {
        const on = active === f.id;
        const count = counts[f.id];
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            style={{
              height: 26,
              padding: '0 9px',
              borderRadius: 5,
              border: `1px solid ${on ? 'var(--tg-accent-border)' : 'var(--tg-line)'}`,
              background: on ? 'var(--tg-accent-soft)' : 'transparent',
              color: on ? 'var(--tg-accent)' : 'var(--tg-fg1)',
              fontSize: 11.5,
              fontWeight: 500,
              fontFamily: 'var(--tg-sans)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              letterSpacing: -0.1,
              transition: 'background 80ms, border-color 80ms, color 80ms',
            }}
          >
            <span>{f.label}</span>
            {count !== undefined && count > 0 && (
              <span
                style={{
                  fontFamily: 'var(--tg-mono)',
                  fontSize: 10,
                  color: on ? 'var(--tg-accent)' : 'var(--tg-fg3)',
                  opacity: 0.9,
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
