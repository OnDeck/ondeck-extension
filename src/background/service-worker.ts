// Background service worker entry point.
// Subsequent tickets will add alarms, badge updates, and notification dispatch.

chrome.runtime.onInstalled.addListener(() => {
  console.log('[gh-workflow] extension installed');
});

export {};
