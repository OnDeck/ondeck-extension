import { useMemo, useState } from 'react';
import {
  listNotifications,
  markNotificationRead,
  type NotificationItem,
} from '../../lib/github-api';
import { applyFilter } from '../../shared/filters/engine';
import type { NotificationFilter } from '../../shared/filters/types';
import { groupNotifications, type GroupBy } from '../../shared/notifications/grouper';
import { prioritizeAll } from '../../shared/notifications/prioritizer';
import { useGitHubQuery } from '../hooks/useGitHubQuery';
import type { ChipId } from './ChipRail';
import { ChipRail } from './ChipRail';
import { GroupHeader } from './GroupHeader';
import { NotifRow } from './NotifRow';
import { EmptyState, ErrorState, Spinner } from './States';

interface Props {
  token: string;
  onUnreadCountChange: (n: number) => void;
}

type GroupByMode = GroupBy | 'none';

function buildFilter(chip: ChipId): NotificationFilter {
  switch (chip) {
    case 'unread':   return { unreadOnly: true };
    case 'reviews':  return { reasons: ['review_requested'] };
    case 'mentions': return { reasons: ['mention', 'team_mention'] };
    case 'assigned': return { reasons: ['assign'] };
    case 'ci':       return { reasons: ['ci_activity'] };
    case 'security': return { reasons: ['security_alert'] };
    default:         return {};
  }
}

function countsByChip(
  items: ReturnType<typeof prioritizeAll>,
): Partial<Record<ChipId, number>> {
  return {
    all:      items.length,
    unread:   items.filter((n) => n.unread).length,
    reviews:  items.filter((n) => n.reason === 'review_requested').length,
    mentions: items.filter((n) => n.reason === 'mention' || n.reason === 'team_mention').length,
    assigned: items.filter((n) => n.reason === 'assign').length,
    ci:       items.filter((n) => n.reason === 'ci_activity').length,
    security: items.filter((n) => n.reason === 'security_alert').length,
  };
}

export function Notifications({ token, onUnreadCountChange }: Props) {
  const query = useGitHubQuery(() => listNotifications(token, { all: false }), [token]);

  const [chip, setChip] = useState<ChipId>('all');
  const [groupBy] = useState<GroupByMode>('priority');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [locallyRead, setLocallyRead] = useState<Set<string>>(new Set());

  const prioritized = useMemo(() => {
    const raw = (query.data ?? []).filter((n) => !locallyRead.has(n.id));
    const p = prioritizeAll(raw);
    onUnreadCountChange(p.filter((n) => n.unread).length);
    return p;
  }, [query.data, locallyRead, onUnreadCountChange]);

  const counts = useMemo(() => countsByChip(prioritized), [prioritized]);

  const filtered = useMemo(
    () => applyFilter(prioritized, buildFilter(chip)),
    [prioritized, chip],
  );

  const groups = useMemo(
    () =>
      groupBy === 'none'
        ? [{ key: 'all', label: null as string | null, items: filtered }]
        : groupNotifications(filtered, groupBy as GroupBy),
    [filtered, groupBy],
  );

  const toggle = (key: string) =>
    setCollapsed((c) => ({ ...c, [key]: !c[key] }));

  const handleMark = async (item: NotificationItem) => {
    setMarkingIds((prev) => new Set(prev).add(item.id));
    try {
      await markNotificationRead(token, item.id);
      setLocallyRead((prev) => new Set(prev).add(item.id));
    } catch {
      // row stays visible; user can retry
    } finally {
      setMarkingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ChipRail active={chip} counts={counts} onChange={setChip} />

      <div className="tg-scroll" style={{ flex: 1, overflowY: 'auto', background: 'var(--tg-bg1)' }}>
        {query.status === 'loading' || query.status === 'idle' ? (
          <Spinner />
        ) : query.status === 'error' && query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          groups.map((group) => (
            <div key={group.key}>
              {group.label !== null && (
                <GroupHeader
                  label={group.label ?? ''}
                  count={group.items.length}
                  collapsed={!!collapsed[group.key]}
                  onToggle={() => toggle(group.key)}
                />
              )}
              {!collapsed[group.key] &&
                group.items.map((item, i) => (
                  <div
                    key={item.id}
                    style={{
                      borderBottom:
                        i === group.items.length - 1
                          ? 'none'
                          : '1px solid var(--tg-line)',
                    }}
                  >
                    <NotifRow
                      item={item}
                      marking={markingIds.has(item.id)}
                      onMark={(n) => void handleMark(n)}
                    />
                  </div>
                ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
