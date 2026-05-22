import type { UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  sync: {
    enabled: true,
    intervalMinutes: 15,
  },
  badge: {
    formula: 'actionable',
  },
  display: {
    showTabCounts: true,
    tabsToShow: ['prs', 'reviews', 'mentions', 'notifications'],
  },
  filters: {
    includeDraftPrs: false,
    hideClosed: false,
    hiddenRepos: [],
    priorityLabels: ['urgent', 'blocking', 'priority', 'p0', 'p1', 'hotfix'],
  },
};
