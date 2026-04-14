import { useWeeklyStats } from '../hooks/useWeeklyStats';

interface Props {
  accountId: number;
  tick: number;
}

export function WeeklyStats({ accountId, tick }: Props) {
  const stats = useWeeklyStats(accountId, tick);
  return (
    <div className="rounded-md border border-gh-border-default bg-gh-canvas-subtle px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-gh-fg-muted">
        Weekly review
      </div>
      <div className="mt-0.5 text-sm text-gh-fg-default">
        You've reviewed{' '}
        <span className="font-semibold text-gh-accent-emphasis">{stats.week}</span> PR
        {stats.week === 1 ? '' : 's'} this week.
      </div>
      {stats.lifetime > 0 && (
        <div className="text-[11px] text-gh-fg-muted">
          {stats.lifetime} lifetime on this account
        </div>
      )}
    </div>
  );
}
