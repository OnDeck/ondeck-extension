interface Props {
  title: string;
  description: string;
  onBack: () => void;
}

export function TabPlaceholder({ title, description, onBack }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gh-border-default px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-accent-emphasis"
        >
          ← Home
        </button>
        <div className="text-sm font-semibold">{title}</div>
      </div>
      <div className="flex flex-1 items-center justify-center px-6 text-center text-xs text-gh-fg-muted">
        {description}
      </div>
    </div>
  );
}
