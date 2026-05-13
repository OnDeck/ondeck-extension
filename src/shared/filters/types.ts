import type { NotificationReason } from '../../lib/github-api';
import type { PriorityLevel } from '../notifications/prioritizer';

export interface NotificationFilter {
  repositories?: string[];
  priorities?: PriorityLevel[];
  reasons?: NotificationReason[];
  unreadOnly?: boolean;
  search?: string;
}
