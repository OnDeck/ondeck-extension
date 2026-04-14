export type TabId =
  | 'home'
  | 'assigned'
  | 'reviews'
  | 'mentions'
  | 'notifications';

export interface TabDefinition {
  id: TabId;
  label: string;
  shortLabel: string;
}

export const TABS: readonly TabDefinition[] = [
  { id: 'home', label: 'Home', shortLabel: 'Home' },
  { id: 'assigned', label: 'Assigned PRs', shortLabel: 'Assigned' },
  { id: 'reviews', label: 'Review Requests', shortLabel: 'Reviews' },
  { id: 'mentions', label: 'Mentions', shortLabel: 'Mentions' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Inbox' },
] as const;
