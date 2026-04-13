import { useEffect, useState } from 'react';
import { getStats, recordReview, reviewsThisWeek } from '../../lib/stats';

interface Props {
  accountId: string | null;
  login: string | null;
}

export function ReviewStats({ accountId, login }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!accountId) {
      setCount(0);
      return;
    }
    void getStats(accountId).then((s) => {
      if (!cancelled) setCount(reviewsThisWeek(s));
    });
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  if (!accountId) return null;

  const handleLog = async () => {
    const stats = await recordReview(accountId, `manual-${Date.now()}`);
    setCount(reviewsThisWeek(stats));
  };

  return (
    <section className="border-b border-gh-border-default px-4 py-3">
      <h2 className="text-xs font-semibold">Weekly review</h2>
      <p className="mt-1 text-[11px] text-gh-fg-muted">
        {login ? `Hey @${login}, ` : ''}you've reviewed{' '}
        <span className="font-mono text-gh-fg-default">{count}</span>{' '}
        {count === 1 ? 'PR' : 'PRs'} this week.
      </p>
      <button
        type="button"
        onClick={() => void handleLog()}
        className="mt-2 rounded-md border border-gh-border-default px-2 py-1 text-[11px] text-gh-fg-default hover:border-gh-accent-emphasis"
      >
        Log a review
      </button>
    </section>
  );
}
