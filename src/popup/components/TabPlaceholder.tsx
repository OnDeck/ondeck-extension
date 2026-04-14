interface Props {
  title: string;
  description: string;
}

export function TabPlaceholder({ title, description }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-gh-border-default bg-gh-canvas-subtle px-6 py-8 text-center">
      <div className="text-sm font-semibold text-gh-fg-default">{title}</div>
      <div className="text-xs text-gh-fg-muted">{description}</div>
    </div>
  );
}
