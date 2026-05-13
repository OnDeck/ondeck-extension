import { setupAlarm, registerAlarmHandler } from './schedulers/alarm';
import { syncNotifications } from './workers/sync';

chrome.runtime.onInstalled.addListener(() => {
  setupAlarm();
  void syncNotifications();
});

// Re-sync on browser startup (service worker restarts).
chrome.runtime.onStartup.addListener(() => {
  setupAlarm();
  void syncNotifications();
});

registerAlarmHandler();

// Popup requests a fresh sync so it always opens with current data.
chrome.runtime.onMessage.addListener((message: unknown) => {
  if (
    typeof message === 'object' &&
    message !== null &&
    (message as Record<string, unknown>)['type'] === 'REQUEST_SYNC'
  ) {
    void syncNotifications();
  }
});

export {};
