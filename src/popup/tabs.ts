export type TabId = 'dashboard' | 'assigned' | 'reviews' | 'mentions' | 'notifications';

export interface TabDef {
  id: TabId;
  label: string;
  shortLabel: string;
}

export const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Home' },
  { id: 'assigned', label: 'Assigned', shortLabel: 'Assigned' },
  { id: 'reviews', label: 'Reviews', shortLabel: 'Reviews' },
  { id: 'mentions', label: 'Mentions', shortLabel: '@You' },
  { id: 'notifications', label: 'Notifications', shortLabel: 'Inbox' },
];
