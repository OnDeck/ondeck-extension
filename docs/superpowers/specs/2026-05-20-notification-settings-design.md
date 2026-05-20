# Notification Settings & Sign-Out Improvements

**Date:** 2026-05-20  
**Status:** Approved

## Overview

Add a settings panel with configurable notification sounds and improved sign-out functionality. Users can control which GitHub notification types trigger audio alerts, see a visual bell indicator for unread notifications, and sign out with confirmation.

## Goals

1. Give users control over notification sound preferences by notification type
2. Provide visual feedback (bell icon) when unread notifications exist
3. Add sign-out confirmation to prevent accidental logouts
4. Maintain consistency with existing UI patterns and architecture

## Non-Goals

- Native OS notifications (Chrome notifications API)
- Notification sync frequency controls
- Theme/appearance settings
- Custom sound file uploads

## Design

### 1. Settings Storage Schema

Settings persist in `chrome.storage.local` under key `notification_settings_v1`:

```typescript
interface NotificationSettings {
  soundEnabled: {
    PullRequest: boolean;
    Issue: boolean;
    Release: boolean;
    Discussion: boolean;
    Commit: boolean;
  };
}

const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: {
    PullRequest: false,
    Issue: false,
    Release: false,
    Discussion: false,
    Commit: false,
  },
};
```

**Custom Hook: `useNotificationSettings`**

Location: `src/popup/hooks/useNotificationSettings.ts`

Provides:
- `settings: NotificationSettings | null` - current settings
- `loading: boolean` - initial load state
- `updateSound(type: string, enabled: boolean)` - toggle individual notification type
- `resetToDefaults()` - reset all settings to defaults

Implementation details:
- Debounce writes to storage (300ms) to avoid excessive writes
- Load settings on mount from `chrome.storage.local`
- Merge with defaults if keys are missing (forward compatibility)

### 2. Settings Panel UI Component

**Component:** `SettingsPanel.tsx`  
**Location:** `src/popup/components/SettingsPanel.tsx`

**State Management:**
- Add `settingsOpen: boolean` to App.tsx state (alongside `dashboardActive`)
- Settings cog button in Header calls `setSettingsOpen(true)`
- Panel closes via:
  - ESC key press (document-level listener)
  - Clicking semi-transparent backdrop
  - Clicking X button in panel header

**Layout:**
- Fixed position overlay covering entire popup
- Semi-transparent backdrop (`rgba(0,0,0,0.4)`)
- Panel: 320px wide, slides in from right
- Slide animation: CSS transform, 250ms ease-out

**Structure:**
```
<SettingsPanel open={settingsOpen} onClose={onClose}>
  <Backdrop onClick={onClose} />
  <Panel>
    <PanelHeader>
      <h2>Settings</h2>
      <CloseButton onClick={onClose} />
    </PanelHeader>
    <PanelBody>
      <Section title="Notification Sounds">
        <ToggleRow 
          label="Pull Requests" 
          checked={settings.soundEnabled.PullRequest}
          onChange={(checked) => updateSound('PullRequest', checked)}
        />
        <ToggleRow label="Issues" ... />
        <ToggleRow label="Releases" ... />
        <ToggleRow label="Discussions" ... />
        <ToggleRow label="Commits" ... />
      </Section>
      <Section title="Account">
        <SignOutButton onClick={handleSignOut} />
      </Section>
    </PanelBody>
  </Panel>
</SettingsPanel>
```

**Styling:**
- Use existing theme variables (`--tg-bg0`, `--tg-fg0`, `--tg-line`, etc.)
- Toggle switches match existing UI patterns (if any), otherwise simple checkbox-based toggle
- Sign Out button styled as danger action (red text/background)
- Panel background: `var(--tg-bg1)`
- Panel border-left: `1px solid var(--tg-line)`

**ESC Key Handling:**
```typescript
useEffect(() => {
  const handleEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      onClose();
    }
  };
  document.addEventListener('keydown', handleEsc);
  return () => document.removeEventListener('keydown', handleEsc);
}, [open, onClose]);
```

### 3. Bell Icon Component

**Component:** `BellIcon`  
**Location:** `src/popup/components/BellIcon.tsx`

**Behavior:**
- Rendered in Header.tsx when `unreadCount > 0`
- Positioned after unread count badge, before avatar
- Non-interactive (no onClick handler)
- Pulses continuously to draw attention

**Visual Design:**
- SVG bell icon, 13x13px
- Matches style of existing icons (SearchIcon, ChartIcon, CogIcon)
- Base color: `var(--tg-fg2)`
- Pulse color: `var(--tg-accent)`

**Pulse Animation:**
```css
@keyframes bellPulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.7;
  }
}

.bell-icon {
  animation: bellPulse 2s ease-in-out infinite;
}
```

**Header Integration:**
```tsx
// In Header.tsx, after unread count badge
{unreadCount > 0 && (
  <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
    <BellIcon />
  </div>
)}
```

### 4. Service Worker Notification Detection

**Location:** `src/background/workers/sync.ts`

**Detection Logic:**

After each successful sync:
1. Load previous notification IDs from storage (`last_notification_ids_v1`)
2. Compare current notification IDs with previous IDs
3. Identify new notifications (IDs in current but not in previous)
4. Send message to popup with new notifications
5. Store current IDs for next comparison

**Storage Schema:**
```typescript
interface NotificationIdCache {
  ids: string[];
  lastSyncAt: number;
}

// Storage key: 'last_notification_ids_v1'
```

**Message Format:**
```typescript
interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string; // 'PullRequest', 'Issue', etc.
  }>;
}
```

**Implementation in sync.ts:**
```typescript
// After updating NOTIFICATIONS_CACHE_KEY (line 43)
const previousCache = await chrome.storage.local.get('last_notification_ids_v1');
const previousIds = new Set(previousCache.last_notification_ids_v1?.ids ?? []);
const currentIds = filtered.map((n) => n.id);

// Detect new notifications
const newNotifications = filtered.filter((n) => !previousIds.has(n.id));

// Send message to popup
if (newNotifications.length > 0) {
  chrome.runtime.sendMessage({
    type: 'NEW_NOTIFICATIONS',
    notifications: newNotifications.map((n) => ({
      id: n.id,
      subjectType: n.subject.type,
    })),
  }).catch(() => {
    // Popup might not be open, that's fine
  });
}

// Store current IDs for next sync
await chrome.storage.local.set({
  last_notification_ids_v1: {
    ids: currentIds,
    lastSyncAt: Date.now(),
  },
});
```

**Edge Cases:**
- **First sync:** If no previous IDs exist, don't treat all notifications as new (skip message sending)
- **Service worker restart:** Previous IDs persist in storage, detection continues
- **User marks notifications as read on GitHub:** Notifications disappear from API response, previous IDs cache eventually becomes stale (acceptable)

### 5. Sound Playback Logic

**Hook:** `useNotificationSounds`  
**Location:** `src/popup/hooks/useNotificationSounds.ts`

**Responsibilities:**
- Listen for `NEW_NOTIFICATIONS` messages from service worker
- Check user settings for each notification type
- Play sound if any matching notification types are enabled
- Throttle sound playback to prevent spam

**Implementation:**
```typescript
export function useNotificationSounds(settings: NotificationSettings | null) {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!settings) return;

    const handleMessage = (message: any) => {
      if (message.type !== 'NEW_NOTIFICATIONS') return;

      const shouldPlaySound = message.notifications.some((n: any) => {
        return settings.soundEnabled[n.subjectType as keyof typeof settings.soundEnabled];
      });

      if (shouldPlaySound) {
        const now = Date.now();
        // Throttle: only play if >2 seconds since last play
        if (now - lastPlayedRef.current > 2000) {
          playNotificationSound();
          lastPlayedRef.current = now;
        }
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [settings]);
}
```

**Sound Playback:**

Using Web Audio API for a simple notification beep:

```typescript
function playNotificationSound() {
  const audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  oscillator.frequency.value = 800; // 800Hz tone
  oscillator.type = 'sine';
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.01,
    audioContext.currentTime + 0.5
  );

  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
}
```

**Throttling:**
- Only play sound once per sync cycle (even if multiple enabled types have new notifications)
- Use ref to track last play timestamp
- Minimum 2 seconds between plays

**When Popup is Closed:**
- Service worker can't play sounds from background context
- Store `has_unplayed_notifications: boolean` flag in storage when new notifications arrive and popup isn't open
- When popup opens, check flag, play sound if true, clear flag
- This ensures user hears sound on next popup open if they missed it

### 6. Sign Out Confirmation

Add confirmation dialogs to both sign-out methods.

**Confirmation Dialog:**
- Use native `confirm()` for simplicity
- Message: `"Sign out of GitHub Workflow Assistant? Your personal access token will be removed."`

**Header Avatar (existing sign-out method):**

Update onClick handler:
```typescript
const handleAvatarSignOut = async () => {
  if (busy) return;
  
  const confirmed = confirm(
    'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
  );
  
  if (confirmed) {
    await auth.signOut();
  }
};

// In JSX
<img
  ...
  onClick={handleAvatarSignOut}
/>
```

**Settings Panel Sign Out Button:**

```typescript
const handleSettingsSignOut = async () => {
  const confirmed = confirm(
    'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
  );
  
  if (confirmed) {
    await auth.signOut();
    onClose(); // Close settings panel
  }
};

// In SettingsPanel
<button 
  onClick={handleSettingsSignOut}
  style={{ 
    background: 'var(--tg-red)', 
    color: 'white',
    // ... danger button styles
  }}
>
  Sign Out
</button>
```

**Existing Behavior (preserved):**
- `auth.signOut()` already calls `clearStoredAuth()` from `lib/auth.ts`
- Clears:
  - Token from `chrome.storage.sync` (key: `gh_workflow_token_v1`)
  - Viewer from `chrome.storage.local` (key: `gh_workflow_viewer_v1`)
  - Crypto key from `chrome.storage.local` (key: `gh_workflow_crypto_key_v1`)
- No changes needed to actual sign-out logic

**UX Flow:**
1. User clicks avatar or "Sign Out" button in settings
2. Browser confirmation dialog appears
3. If confirmed: execute sign-out, clear storage, return to SignIn screen
4. If cancelled: dialog closes, nothing happens, UI remains unchanged

## Component Tree

```
App.tsx
├── Header
│   ├── BellIcon (conditional: unreadCount > 0)
│   ├── Avatar (with sign-out confirmation)
│   └── Settings Button (opens panel)
├── Dashboard | Notifications
└── SettingsPanel (conditional: settingsOpen)
    ├── Notification Sounds Toggles
    └── Sign Out Button (with confirmation)
```

## Data Flow

### Settings CRUD
```
User toggles switch
  → SettingsPanel calls updateSound()
  → useNotificationSettings debounces (300ms)
  → chrome.storage.local.set('notification_settings_v1', ...)
  → settings state updates
  → ToggleRow re-renders with new checked state
```

### Notification Detection & Sound
```
Service Worker (sync.ts)
  → Fetch notifications from GitHub API
  → Compare with previous IDs
  → Detect new notifications
  → Send chrome.runtime.sendMessage({ type: 'NEW_NOTIFICATIONS', ... })
  
Popup (useNotificationSounds hook)
  → Receive message
  → Filter by settings.soundEnabled[type]
  → Play sound if any match (throttled)
  → Update lastPlayedRef
```

### Sign Out
```
User clicks avatar or Settings → Sign Out
  → Confirmation dialog appears
  → If confirmed:
    → auth.signOut()
    → clearStoredAuth()
    → Remove token, viewer, crypto key
    → App.tsx re-renders → shows SignIn screen
```

## Testing Considerations

### Manual Testing
- Settings persist across popup close/reopen
- Settings persist across browser restart
- Sound plays only for enabled notification types
- Sound doesn't play on first sync (no previous IDs)
- Sound throttles correctly (max once per 2 seconds)
- Bell icon appears only when unread notifications exist
- Bell icon pulses smoothly
- Settings panel slides in/out smoothly
- Settings panel closes via ESC, backdrop click, X button
- Sign-out confirmation works from both avatar and settings
- Sign-out clears all stored data
- No sound plays when all toggles are off

### Edge Cases
- Rapid toggle switching (debouncing works)
- Service worker restart mid-sync
- Popup closed when new notifications arrive
- Multiple notification types enabled, only some have new notifications
- User cancels sign-out confirmation
- Signing out while settings panel is open

## Open Questions

None - design approved.

## Future Enhancements (out of scope)

- Custom sound file upload
- Notification sync frequency control
- Per-repository notification settings
- Notification grouping/filtering
- Desktop notifications (chrome.notifications API)
- Theme customization
