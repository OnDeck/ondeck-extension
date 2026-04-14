interface Props {
  label: string;
  count: number;
  icon: string;
  onClick: () => void;
}

export function CountRow({ label, count, icon, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2 text-left transition-colors hover:border-gh-accent-emphasis"
    >
      <span
        aria-hidden
        className="flex h-7 w-7 items-center justify-center rounded-md border border-gh-border-muted text-sm"
      >
        {icon}
      </span>
      <span className="flex-1 text-xs font-semibold text-gh-fg-default">{label}</span>
      <span className="min-w-[1.5rem] rounded-full border border-gh-border-muted bg-gh-canvas-default px-2 text-center text-[11px] font-semibold text-gh-fg-default">
        {count}
      </span>
    </button>
  );
}
