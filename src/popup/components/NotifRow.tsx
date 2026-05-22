import type { NotificationItem } from '../../lib/github-api';
import type { PrioritizedNotification } from '../../shared/notifications/grouper';
import { compactRelativeTime } from '../../shared/utils/compactRelativeTime';
import { notifDisplayMeta } from '../../shared/utils/notifDisplay';
import { notificationHtmlUrl } from '../../lib/github-api';

function priorityBarColor(): string {
  return 'var(--tg-accent)';
}

function unreadDotColor(): string {
  return 'var(--tg-accent)';
}

interface MarkReadBtnProps {
  marking: boolean;
  onMark: () => void;
}

function MarkReadBtn({ marking, onMark }: MarkReadBtnProps) {
  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMark(); }}
      disabled={marking}
      title="Mark as read"
      style={{
        flexShrink: 0,
        padding: '3px 7px',
        borderRadius: 4,
        border: '1px solid var(--tg-line)',
        background: 'transparent',
        color: 'var(--tg-fg3)',
        fontFamily: 'var(--tg-mono)',
        fontSize: 10,
        cursor: marking ? 'default' : 'pointer',
        opacity: marking ? 0.5 : 1,
        transition: 'border-color 80ms, color 80ms',
        alignSelf: 'center',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--tg-accent-border)';
        (e.currentTarget as HTMLElement).style.color = 'var(--tg-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--tg-line)';
        (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg3)';
      }}
    >
      {marking ? '…' : '✓'}
    </button>
  );
}

interface Props {
  item: PrioritizedNotification;
  marking: boolean;
  onMark: (item: NotificationItem) => void;
  showRepo?: boolean;
  isClosed?: boolean;
}

export function NotifRow({ item, marking, onMark, showRepo = true, isClosed = false }: Props) {
  const display = notifDisplayMeta(item);
  const ago = compactRelativeTime(item.updated_at);
  const dim = false;
  const url = notificationHtmlUrl(item);
  const prNum = item.subject.url?.match(/\/(\d+)$/)?.[1];

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'flex',
        padding: '10px 10px 10px 0',
        cursor: 'pointer',
        background: 'transparent',
        position: 'relative',
        opacity: dim ? 0.55 : 1,
        textDecoration: 'none',
        transition: 'background 80ms',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {/* Priority bar */}
      <div
        style={{
          width: 2,
          alignSelf: 'stretch',
          marginRight: 10,
          marginTop: 3,
          marginBottom: 3,
          background: priorityBarColor(),
          borderRadius: 1,
          flexShrink: 0,
        }}
      />

      {/* Unread dot */}
      <div
        style={{
          width: 8,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 5,
          flexShrink: 0,
        }}
      >
        {item.unread && (
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: 3,
              background: unreadDotColor(),
            }}
          />
        )}
      </div>

      {/* Avatar */}
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          background: display.avatarColor,
          color: '#fff',
          fontSize: 9,
          fontWeight: 600,
          letterSpacing: 0.3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          marginLeft: 6,
          marginTop: 1,
          boxShadow: 'inset 0 0 0 0.5px rgba(255,255,255,0.15), 0 1px 2px rgba(0,0,0,0.25)',
          fontFamily: 'var(--tg-mono)',
        }}
      >
        {display.avatarInit}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0, marginLeft: 9 }}>
        {/* Meta line: TypeGlyph · repo · #pr · ago */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            color: 'var(--tg-fg2)',
            fontFamily: 'var(--tg-mono)',
            marginBottom: 3,
            lineHeight: 1,
          }}
        >
          {/* Type glyph */}
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 600,
              letterSpacing: 0.4,
              color: display.typeColor,
              padding: '2px 5px',
              borderRadius: 3,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--tg-line)',
              lineHeight: 1,
              display: 'inline-flex',
              alignItems: 'center',
              height: 14,
              flexShrink: 0,
            }}
          >
            {display.typeCode}
          </span>

          {showRepo && (
            <span
              style={{
                color: 'var(--tg-fg1)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
                maxWidth: 140,
              }}
            >
              {item.repository.full_name}
            </span>
          )}

          {prNum && (
            <span style={{ color: 'var(--tg-fg3)', flexShrink: 0 }}>#{prNum}</span>
          )}

          {isClosed && (
            <span
              style={{
                fontSize: 9,
                padding: '2px 4px',
                borderRadius: 3,
                background: 'rgba(248, 81, 73, 0.15)',
                color: '#f85149',
                fontFamily: 'var(--tg-mono)',
                fontWeight: 600,
                letterSpacing: 0.3,
              }}
            >
              CLOSED
            </span>
          )}

          <span style={{ marginLeft: 'auto', color: 'var(--tg-fg3)', flexShrink: 0 }}>
            {ago}
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 12.5,
            color: item.unread ? 'var(--tg-fg0)' : 'var(--tg-fg1)',
            fontWeight: item.unread ? 500 : 400,
            lineHeight: 1.35,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            letterSpacing: -0.1,
          }}
        >
          {item.subject.title}
        </div>

        {/* Tertiary: priority reason */}
        <div
          style={{
            marginTop: 3,
            fontSize: 11,
            color: 'var(--tg-fg3)',
            fontFamily: 'var(--tg-mono)',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.priority.reason}
        </div>
      </div>

      {/* Mark-read button */}
      <div style={{ marginLeft: 8, alignSelf: 'center' }}>
        <MarkReadBtn marking={marking} onMark={() => onMark(item)} />
      </div>
    </a>
  );
}
