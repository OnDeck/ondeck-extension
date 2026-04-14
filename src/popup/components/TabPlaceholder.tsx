interface Props {
  title: string;
  onBack: () => void;
}

export function TabPlaceholder({ title, onBack }: Props) {
  return (
    <section className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Back
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-4 text-xs text-gh-fg-muted">
          Coming soon. This tab is implemented in a follow-up ticket.
        </div>
      </div>
    </section>
  );
}
