export type TabId =
  | 'dashboard'
  | 'assigned'
  | 'mentions'
  | 'reviews'
  | 'notifications';

export interface TabDefinition {
  id: TabId;
  label: string;
}

export const TABS: TabDefinition[] = [
  { id: 'dashboard', label: 'Home' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'mentions', label: 'Mentions' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'notifications', label: 'Inbox' },
];
