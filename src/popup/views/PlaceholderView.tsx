interface Props {
  title: string;
  message: string;
}

export function PlaceholderView({ title, message }: Props) {
  return (
    <section className="flex h-full items-center justify-center px-6 text-center">
      <div>
        <h2 className="text-sm font-semibold text-gh-fg-default">{title}</h2>
        <p className="mt-1 text-[11px] text-gh-fg-muted">{message}</p>
      </div>
    </section>
  );
}
