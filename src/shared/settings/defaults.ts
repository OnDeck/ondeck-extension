import type { UserSettings } from './types';

export const DEFAULT_SETTINGS: UserSettings = {
  sync: {
    enabled: true,
    intervalMinutes: 15,
  },
  notifications: {
    enabled: true,
    sound: false,
    reasons: ['assign', 'mention', 'review_requested', 'team_mention', 'security_alert'],
  },
};
