export type TabId = 'dashboard' | 'assigned' | 'reviews' | 'mentions' | 'notifications';

export interface TabDescriptor {
  id: TabId;
  label: string;
  shortLabel: string;
}

export const TABS: TabDescriptor[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home' },
  { id: 'assigned', label: 'Assigned PRs', shortLabel: 'Assigned' },
  { id: 'reviews', label: 'Reviews', shortLabel: 'Reviews' },
  { id: 'mentions', label: 'Mentions', shortLabel: 'Mentions' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Inbox' },
];
