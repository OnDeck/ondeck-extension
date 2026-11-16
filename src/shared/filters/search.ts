import type { NotificationItem } from '../../lib/github-api';

export interface ParsedSearch {
  /** Free-text terms; each must appear in the title or repository. */
  terms: string[];
  repos: string[];
  readState?: 'read' | 'unread';
  /** GitHub subject types; empty means any. An unknown value matches nothing. */
  types: string[];
  /** GitHub notification reasons; empty means any. */
  reasons: string[];
}

const TYPE_ALIASES: Record<string, string[]> = {
  pr: ['PullRequest'],
  pull: ['PullRequest'],
  issue: ['Issue'],
  release: ['Release'],
  discussion: ['Discussion'],
  commit: ['Commit'],
  ci: ['CheckSuite'],
};

const REASON_ALIASES: Record<string, string[]> = {
  review: ['review_requested'],
  mention: ['mention', 'team_mention'],
  assign: ['assign'],
  author: ['author'],
  comment: ['comment'],
  ci: ['ci_activity'],
  security: ['security_alert'],
  state: ['state_change'],
  subscribed: ['subscribed', 'manual'],
};

// Never equal to a real type or reason, so an unknown value filters everything out.
const NO_MATCH = '\u0000';

function expand(value: string, aliases: Record<string, string[]>, raw: (v: string) => boolean): string[] {
  const key = value.toLowerCase();
  if (aliases[key]) return aliases[key];
  return raw(value) ? [value] : [NO_MATCH];
}

/**
 * Parse the search box: `repo:`, `is:read|unread`, `type:` and `reason:`
 * operators plus free text ("quoted phrases" allowed). Repeating an operator
 * means OR; different operators and text terms combine with AND.
 */
export function parseSearch(query: string): ParsedSearch {
  const parsed: ParsedSearch = { terms: [], repos: [], types: [], reasons: [] };
  for (const match of query.matchAll(/"([^"]*)"|(\S+)/g)) {
    const quoted = match[1];
    if (quoted !== undefined) {
      if (quoted.trim()) parsed.terms.push(quoted.trim().toLowerCase());
      continue;
    }
    const token = match[2];
    const colon = token.indexOf(':');
    const key = colon > 0 ? token.slice(0, colon).toLowerCase() : '';
    const value = colon > 0 ? token.slice(colon + 1) : '';

    if (key === 'repo' && value) parsed.repos.push(value.toLowerCase());
    else if (key === 'is' && (value === 'read' || value === 'unread')) parsed.readState = value;
    else if (key === 'type' && value) parsed.types.push(...expand(value, TYPE_ALIASES, (v) => /^[A-Z]/.test(v)));
    else if (key === 'reason' && value) parsed.reasons.push(...expand(value, REASON_ALIASES, (v) => /^[a-z_]+$/.test(v)));
    else parsed.terms.push(token.toLowerCase());
  }
  return parsed;
}

export function isEmptySearch(search: ParsedSearch): boolean {
  return (
    search.terms.length === 0 &&
    search.repos.length === 0 &&
    search.readState === undefined &&
    search.types.length === 0 &&
    search.reasons.length === 0
  );
}

export function matchesSearch(item: NotificationItem, search: ParsedSearch): boolean {
  const repo = item.repository.full_name.toLowerCase();
  if (search.repos.length > 0 && !search.repos.some((r) => repo.includes(r))) return false;
  if (search.readState === 'unread' && !item.unread) return false;
  if (search.readState === 'read' && item.unread) return false;
  if (search.types.length > 0 && !search.types.includes(item.subject.type)) return false;
  if (search.reasons.length > 0 && !search.reasons.includes(item.reason)) return false;
  const haystack = `${item.subject.title.toLowerCase()} ${repo}`;
  return search.terms.every((term) => haystack.includes(term));
}
