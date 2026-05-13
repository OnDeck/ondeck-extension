import {
  listNotifications,
  searchAssignedPrs,
  searchMentions,
  searchReviewRequested,
} from '../../lib/github-api';
import { computeMetrics } from '../../shared/analytics/metrics';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import { ErrorState, Spinner } from './States';

interface Props {
  token: string;
  login: string;
}

// Tiny SVG sparkline
function Spark({
  values,
  color,
  w = 100,
  h = 20,
}: {
  values: number[];
  color: string;
  w?: number;
  h?: number;
}) {
  const max = Math.max(...values, 1);
  const step = w / (values.length - 1);
  const pts = values
    .map((v, i) => `${i * step},${h - (v / max) * (h - 2) - 1}`)
    .join(' ');
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={area} fill={color} fillOpacity="0.1" stroke="none" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Horizontal hour-bars
function HourBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 32 }}>
      {values.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max((v / max) * 100, v > 0 ? 8 : 0)}%`,
            minHeight: v > 0 ? 2 : 0,
            background: v === max ? color : v > max * 0.4 ? `${color}99` : 'var(--tg-bg3)',
            borderRadius: 1.5,
          }}
        />
      ))}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  subColor,
  children,
}: {
  label: string;
  value: string | number;
  sub?: string;
  subColor?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--tg-bg1)',
        border: '1px solid var(--tg-line)',
        borderRadius: 6,
        padding: '10px 11px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontFamily: 'var(--tg-mono)',
          color: 'var(--tg-fg3)',
          fontWeight: 600,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: 'var(--tg-fg0)',
            letterSpacing: -0.6,
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--tg-sans)',
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            style={{
              fontSize: 10.5,
              color: subColor ?? 'var(--tg-fg2)',
              fontFamily: 'var(--tg-mono)',
            }}
          >
            {sub}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

interface DashData {
  assigned: number;
  reviews: number;
  mentions: number;
  unread: number;
  criticalCount: number;
  importantCount: number;
  normalCount: number;
  topRepositories: Array<{ repo: string; count: number }>;
}

async function fetchDashData(token: string, login: string): Promise<DashData> {
  const [assigned, reviews, mentions, rawNotifications] = await Promise.all([
    searchAssignedPrs(token, login),
    searchReviewRequested(token, login),
    searchMentions(token, login),
    listNotifications(token, { all: false }),
  ]);
  const prioritized = prioritizeAll(rawNotifications);
  const metrics = computeMetrics(prioritized);
  return {
    assigned: assigned.total_count,
    reviews: reviews.total_count,
    mentions: mentions.total_count,
    unread: metrics.unread,
    criticalCount: metrics.byPriority.critical,
    importantCount: metrics.byPriority.important,
    normalCount: metrics.byPriority.normal,
    topRepositories: metrics.topRepositories,
  };
}

// Static sparklines for illustration (real trends would need stored history)
const UNREAD_SPARK = [4, 8, 12, 9, 5, 7, 5];
const REVIEW_SPARK = [1, 2, 1, 3, 4, 2, 2];
const HOUR_DATA = [0, 0, 0, 0, 0, 0, 1, 3, 2, 4, 1, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

export function Dashboard({ token, login }: Props) {
  const query = useGitHubQuery(() => fetchDashData(token, login), [token, login]);

  if (query.status === 'loading' || query.status === 'idle') return <Spinner />;
  if (query.status === 'error' && query.error)
    return <ErrorState error={query.error} onRetry={query.refetch} />;

  const d = query.data!;
  const maxRepo = Math.max(...d.topRepositories.map((r) => r.count), 1);

  return (
    <div
      className="tg-scroll"
      style={{
        flex: 1,
        overflowY: 'auto',
        background: 'var(--tg-bg0)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* Row 1: Unread + Reviews */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <MetricCard
          label="Unread"
          value={d.unread}
          sub={d.criticalCount > 0 ? `${d.criticalCount} critical` : undefined}
          subColor={d.criticalCount > 0 ? 'var(--tg-critical)' : undefined}
        >
          <Spark values={UNREAD_SPARK} color="var(--tg-accent)" w={120} h={20} />
        </MetricCard>

        <MetricCard
          label="Reviews due"
          value={d.reviews}
          sub={d.reviews > 0 ? 'pending' : undefined}
          subColor="var(--tg-important)"
        >
          <Spark values={REVIEW_SPARK} color="var(--tg-important)" w={120} h={20} />
        </MetricCard>
      </div>

      {/* Row 2: Priority breakdown */}
      <div
        style={{
          background: 'var(--tg-bg1)',
          border: '1px solid var(--tg-line)',
          borderRadius: 6,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '8px 11px',
            borderBottom: '1px solid var(--tg-line)',
            fontSize: 9.5,
            fontFamily: 'var(--tg-mono)',
            fontWeight: 600,
            letterSpacing: 0.6,
            color: 'var(--tg-fg3)',
            textTransform: 'uppercase',
          }}
        >
          Priority breakdown
        </div>
        {[
          { label: 'Critical',  count: d.criticalCount,  color: 'var(--tg-critical)' },
          { label: 'Important', count: d.importantCount, color: 'var(--tg-important)' },
          { label: 'Normal',    count: d.normalCount,    color: 'var(--tg-accent)'   },
        ].map(({ label, count, color }) => (
          <div
            key={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '7px 11px',
              fontSize: 12,
              borderBottom: label === 'Normal' ? 'none' : '1px solid var(--tg-line)',
            }}
          >
            <span style={{ color, width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block', flexShrink: 0 }} />
            <span style={{ color: 'var(--tg-fg1)', flex: 1 }}>{label}</span>
            <span
              style={{
                fontFamily: 'var(--tg-mono)',
                fontSize: 11.5,
                color: count > 0 ? color : 'var(--tg-fg3)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>

      {/* Row 3: Interruptions today */}
      <MetricCard label="Interruptions today" value={d.unread + d.assigned + d.mentions}>
        <div style={{ marginTop: 4 }}>
          <HourBars values={HOUR_DATA} color="var(--tg-accent)" />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 9.5,
              fontFamily: 'var(--tg-mono)',
              color: 'var(--tg-fg3)',
              marginTop: 4,
            }}
          >
            <span>06:00</span>
            <span>12:00</span>
            <span>18:00</span>
            <span>24:00</span>
          </div>
        </div>
      </MetricCard>

      {/* Row 4: Most active repos */}
      {d.topRepositories.length > 0 && (
        <div
          style={{
            background: 'var(--tg-bg1)',
            border: '1px solid var(--tg-line)',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '8px 11px',
              borderBottom: '1px solid var(--tg-line)',
              fontSize: 9.5,
              fontFamily: 'var(--tg-mono)',
              fontWeight: 600,
              letterSpacing: 0.6,
              color: 'var(--tg-fg3)',
              textTransform: 'uppercase',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>Most active repos</span>
            <span>this week</span>
          </div>
          {d.topRepositories.map(({ repo, count }, i) => (
            <div
              key={repo}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 11px',
                fontSize: 12,
                borderBottom:
                  i === d.topRepositories.length - 1 ? 'none' : '1px solid var(--tg-line)',
              }}
            >
              <span
                style={{
                  color: 'var(--tg-fg1)',
                  flex: 1,
                  fontFamily: 'var(--tg-mono)',
                  fontSize: 11.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {repo}
              </span>
              <div
                style={{
                  width: 80,
                  height: 4,
                  background: 'var(--tg-bg3)',
                  borderRadius: 2,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${(count / maxRepo) * 100}%`,
                    height: '100%',
                    background: 'var(--tg-accent)',
                    opacity: 0.8,
                  }}
                />
              </div>
              <span
                style={{
                  width: 20,
                  textAlign: 'right',
                  fontFamily: 'var(--tg-mono)',
                  fontSize: 11.5,
                  color: 'var(--tg-fg2)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Row 5: Response patterns */}
      <div
        style={{
          background: 'var(--tg-bg1)',
          border: '1px solid var(--tg-line)',
          borderRadius: 6,
          padding: '10px 11px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div
          style={{
            fontSize: 9.5,
            fontFamily: 'var(--tg-mono)',
            fontWeight: 600,
            letterSpacing: 0.6,
            color: 'var(--tg-fg3)',
            textTransform: 'uppercase',
          }}
        >
          Response patterns
        </div>
        {[
          { label: 'median review reply', value: '14m' },
          { label: 'median mention reply', value: '32m' },
          { label: 'longest focus block', value: '1h 47m' },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}
          >
            <span style={{ fontSize: 12, color: 'var(--tg-fg1)' }}>{label}</span>
            <span
              style={{
                fontFamily: 'var(--tg-mono)',
                fontSize: 13,
                color: 'var(--tg-fg0)',
                fontWeight: 500,
              }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
