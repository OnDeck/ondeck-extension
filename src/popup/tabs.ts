export type TabId = 'home' | 'assigned' | 'reviews' | 'mentions' | 'notifications';

export interface TabDefinition {
  id: TabId;
  label: string;
}

export const TABS: TabDefinition[] = [
  { id: 'home', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'notifications', label: 'Inbox' },
];
