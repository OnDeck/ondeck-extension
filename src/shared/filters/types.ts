import type { NotificationReason, NotificationSubjectType } from '../../lib/github-api';
import type { PriorityLevel } from '../notifications/prioritizer';

export interface NotificationFilter {
  repositories?: string[];
  priorities?: PriorityLevel[];
  reasons?: NotificationReason[];
  subjectTypes?: NotificationSubjectType[];
  unreadOnly?: boolean;
  search?: string;
}
