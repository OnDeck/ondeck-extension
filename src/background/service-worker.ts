// Background service worker entry point.
// Subsequent tickets will add alarms, badge updates, and notification dispatch.
// Kept as an empty registration so Chrome loads the worker on install.

chrome.runtime.onInstalled.addListener(() => {
  // No-op for now. Hook future install/upgrade work here.
});

export {};
