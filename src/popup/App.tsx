export default function App() {
  return (
    <div className="flex h-full w-full flex-col">
      <header className="border-b border-gh-border-default px-4 py-3">
        <h1 className="text-sm font-semibold">GitHub Workflow Assistant</h1>
        <p className="text-xs text-gh-fg-muted">Scaffold ready. Auth and tabs coming next.</p>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-3">
        <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3 text-xs text-gh-fg-muted">
          This is a placeholder popup. Subsequent tickets add authentication, the dashboard, and
          tab views for PRs, mentions, reviews, and notifications.
        </div>
      </main>
    </div>
  );
}
