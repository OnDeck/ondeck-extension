import { recordReview, type AccountStats } from '../../lib/accounts';

interface Props {
  stats: AccountStats | null;
  onChange: () => void;
}

export function AnalyticsCard({ stats, onChange }: Props) {
  const handleLogReview = async () => {
    await recordReview();
    onChange();
  };

  if (!stats) {
    return (
      <section className="px-4 py-3 text-[11px] text-gh-fg-muted">
        Add an account to start tracking review analytics.
      </section>
    );
  }

  return (
    <section className="px-4 py-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gh-fg-muted">
        Weekly review
      </h3>
      <div className="mt-2 rounded-md border border-gh-border-default bg-gh-canvas-subtle p-3">
        <p className="text-sm text-gh-fg-default">
          You&rsquo;ve reviewed{' '}
          <span className="font-semibold text-gh-accent-emphasis">
            {stats.reviews_this_week}
          </span>{' '}
          PR{stats.reviews_this_week === 1 ? '' : 's'} this week.
        </p>
        <p className="mt-1 text-[11px] text-gh-fg-muted">
          {stats.reviews_lifetime} reviews logged all-time · week of{' '}
          {new Date(stats.week_start).toLocaleDateString()}
        </p>
        <button
          type="button"
          onClick={() => void handleLogReview()}
          className="mt-2 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-muted hover:border-gh-accent-emphasis hover:text-gh-fg-default"
        >
          Log a review
        </button>
      </div>
    </section>
  );
}
