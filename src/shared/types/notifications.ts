export interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string;
  }>;
}
