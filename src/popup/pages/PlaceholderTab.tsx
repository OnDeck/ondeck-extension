interface Props {
  title: string;
  description: string;
}

export function PlaceholderTab({ title, description }: Props) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
      <div className="text-sm font-semibold text-gh-fg-default">{title}</div>
      <div className="text-xs text-gh-fg-muted">{description}</div>
    </div>
  );
}
