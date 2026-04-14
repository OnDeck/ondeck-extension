export type TabId = 'home' | 'assigned' | 'mentions' | 'reviews' | 'notifications';

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: TabDef[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'notifications', label: 'Inbox' },
];
