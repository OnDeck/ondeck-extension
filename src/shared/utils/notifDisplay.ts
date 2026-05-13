import type { NotificationItem, NotificationReason } from '../../lib/github-api';

export type NotifDisplayType =
  | 'pr'
  | 'review'
  | 'mention'
  | 'issue'
  | 'ci'
  | 'security'
  | 'release'
  | 'discussion';

export interface NotifDisplayMeta {
  type: NotifDisplayType;
  typeCode: string;
  typeColor: string;
  avatarColor: string;
  avatarInit: string;
}

const TYPE_META: Record<NotifDisplayType, { code: string; color: string }> = {
  pr:         { code: 'PR',  color: '#8b5cf6' },
  review:     { code: 'RV',  color: '#3b82f6' },
  mention:    { code: '@',   color: '#f59e0b' },
  issue:      { code: 'IS',  color: '#22c55e' },
  ci:         { code: 'CI',  color: '#06b6d4' },
  security:   { code: 'SEC', color: '#ef6b6b' },
  release:    { code: 'REL', color: '#64748b' },
  discussion: { code: 'DIS', color: '#a855f7' },
};

const AVATAR_PALETTE = [
  '#8b5cf6', '#3b82f6', '#ec4899', '#f59e0b',
  '#22c55e', '#06b6d4', '#a855f7', '#f43f5e',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

function repoAvatarColor(fullName: string): string {
  return AVATAR_PALETTE[hashStr(fullName) % AVATAR_PALETTE.length];
}

function repoInitials(fullName: string): string {
  const repo = fullName.split('/')[1] ?? fullName;
  return repo.slice(0, 2).toUpperCase();
}

function resolveType(reason: NotificationReason, subjectType: string): NotifDisplayType {
  if (reason === 'security_alert') return 'security';
  if (reason === 'ci_activity') return 'ci';
  if (reason === 'review_requested') return 'review';
  if (reason === 'mention' || reason === 'team_mention') return 'mention';
  if (reason === 'assign') return 'issue';
  if (subjectType === 'Discussion') return 'discussion';
  if (subjectType === 'Release') return 'release';
  if (subjectType === 'Issue') return 'issue';
  return 'pr';
}

export function notifDisplayMeta(item: NotificationItem): NotifDisplayMeta {
  const type = resolveType(item.reason, item.subject.type);
  const { code, color } = TYPE_META[type];
  return {
    type,
    typeCode: code,
    typeColor: color,
    avatarColor: repoAvatarColor(item.repository.full_name),
    avatarInit: repoInitials(item.repository.full_name),
  };
}
