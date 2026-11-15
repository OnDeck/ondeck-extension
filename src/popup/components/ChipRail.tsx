export type ChipId = 'all' | 'unread' | 'participating' | 'mentions' | 'reviews' | 'assigned';

export interface ChipFilter {
  id: ChipId;
  label: string;
}

export const CHIP_FILTERS: ChipFilter[] = [
  { id: 'all',           label: 'Inbox'         },
  { id: 'unread',        label: 'Unread'        },
  { id: 'participating', label: 'Participating' },
  { id: 'mentions',      label: 'Mentions'      },
  { id: 'reviews',       label: 'Reviews'       },
  { id: 'assigned',      label: 'Assigned'      },
];

interface Props {
  active: ChipId;
  counts: Partial<Record<ChipId, number>>;
  onChange: (id: ChipId) => void;
}

export function ChipRail({ active, counts, onChange }: Props) {
  return (
    <div
      className="flex gap-1 px-3 py-[7px] border-b border-[var(--tg-line)] bg-[var(--tg-bg1)] overflow-x-auto shrink-0"
      style={{
        scrollbarWidth: 'thin', // Show scrollbar so users know it's scrollable
        scrollbarColor: 'var(--tg-line) transparent',
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
            className={`h-[26px] px-[9px] rounded-[5px] border font-medium text-[11.5px] cursor-pointer inline-flex items-center gap-[5px] whitespace-nowrap shrink-0 tracking-[-0.1px] transition-[background,border-color,color] duration-[80ms] ${
              on
                ? 'border-[var(--tg-accent-border)] bg-[var(--tg-accent-soft)] text-[var(--tg-accent)]'
                : 'border-[var(--tg-line)] bg-transparent text-[var(--tg-fg1)]'
            }`}
            style={{ fontFamily: 'var(--tg-sans)' }}
          >
            <span>{f.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] opacity-90 ${on ? 'text-[var(--tg-accent)]' : 'text-[var(--tg-fg3)]'}`}
                style={{ fontFamily: 'var(--tg-mono)' }}
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
