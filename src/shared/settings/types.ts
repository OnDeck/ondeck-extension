import type { TabId } from '../../popup/tabs';

export type BadgeCountFormula =
  | 'all'           // PRs + Reviews + Mentions + Inbox
  | 'actionable'    // PRs + Reviews only
  | 'reviews-only'  // Just review requests
  | 'custom';       // User picks which tabs to count

export type SyncInterval = 5 | 15 | 30 | 60; // minutes

// Subset of GitHub notification reasons users can opt into for desktop alerts.
export type NotificationReasonFilter =
  | 'assign'
  | 'mention'
  | 'review_requested'
  | 'team_mention'
  | 'security_alert';

export interface UserSettings {
  // Sync & Updates
  sync: {
    enabled: boolean;
    intervalMinutes: SyncInterval;
  };

  // Badge Count
  badge: {
    formula: BadgeCountFormula;
    customTabs?: TabId[]; // only used when formula is 'custom'
  };

  // Display
  display: {
    showTabCounts: boolean;
    tabsToShow: TabId[]; // which tabs show counts in TabBar
  };

  // Filters
  filters: {
    includeDraftPrs: boolean;
    hideClosed: boolean;
    hiddenRepos: string[]; // e.g., ['owner/repo-name']
    priorityLabels: string[]; // e.g., ['urgent', 'p0', 'blocking']
  };

  // Desktop Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    reasons: NotificationReasonFilter[]; // which reasons trigger a desktop alert
  };
}

export interface CountsCache {
  prs: number;
  reviews: number;
  mentions: number;
  notifications: number;
  timestamp: number;
}
