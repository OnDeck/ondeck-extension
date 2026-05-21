# Manual Test: Notification Settings Hook

## Setup
1. Load the extension in Chrome
2. Open DevTools on the extension popup
3. Test in the console

## Test Cases

### 1. Load default settings
```js
// Should show all notification types disabled
chrome.storage.local.get('notification_settings_v1', console.log)
// Expected: undefined or empty
```

### 2. Save custom settings
```js
// Enable sounds for PRs and Issues
chrome.storage.local.set({
  notification_settings_v1: {
    soundEnabled: {
      PullRequest: true,
      Issue: true,
      Release: false,
      Discussion: false,
      Commit: false,
    }
  }
})
```

### 3. Verify persistence
```js
// Reload extension and check settings persisted
chrome.storage.local.get('notification_settings_v1', console.log)
// Expected: settings from step 2
```

### 4. Test forward compatibility
```js
// Simulate older version with fewer types
chrome.storage.local.set({
  notification_settings_v1: {
    soundEnabled: {
      PullRequest: true,
      Issue: true,
    }
  }
})
// Hook should merge with defaults for missing types
```

### 5. Clear settings
```js
chrome.storage.local.remove('notification_settings_v1')
// Hook should load defaults
```

## Expected Behavior

- Hook loads settings on mount
- Initial loading state is true
- Updates are debounced (300ms)
- Multiple rapid updates should batch
- Settings persist across extension reloads
- Error handling doesn't crash the app
