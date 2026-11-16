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
      // A thin visible scrollbar tells people the chip row scrolls.
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-tg-line bg-tg-bg1 px-3 py-[7px] [scrollbar-color:var(--tg-line)_transparent] [scrollbar-width:thin]"
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
                ? 'border-tg-accent-border bg-tg-accent-soft text-tg-accent'
                : 'border-tg-line bg-transparent text-tg-fg1'
            } font-sans`}
          >
            <span>{f.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={`text-[10px] opacity-90 ${on ? 'text-tg-accent' : 'text-tg-fg3'} font-mono`}
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
