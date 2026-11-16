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

  // Desktop Notifications
  notifications: {
    enabled: boolean;
    sound: boolean;
    reasons: NotificationReasonFilter[]; // which reasons trigger a desktop alert
  };
}
