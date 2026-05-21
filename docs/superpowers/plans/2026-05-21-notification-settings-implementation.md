# Notification Settings & Sign-Out Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add settings panel with configurable notification sounds, visual bell indicator, and sign-out confirmation.

**Architecture:** React components with custom hooks for settings and sound playback. Service worker detects new notifications by comparing ID snapshots. Settings persist in chrome.storage.local.

**Tech Stack:** React, TypeScript, Chrome Extension APIs (storage, runtime messaging), Web Audio API

---

## File Structure

**New Files:**
- `src/popup/hooks/useNotificationSettings.ts` - Settings CRUD with debouncing
- `src/popup/hooks/useNotificationSounds.ts` - Message listener and sound playback
- `src/popup/components/SettingsPanel.tsx` - Main settings panel component
- `src/popup/components/BellIcon.tsx` - Animated bell icon for unread notifications

**Modified Files:**
- `src/popup/App.tsx` - Add settingsOpen state, integrate hooks
- `src/popup/components/Header.tsx` - Add bell icon, settings button handler, sign-out confirmation
- `src/background/workers/sync.ts` - Add notification detection and messaging
- `src/shared/constants.ts` - Add settings storage key constant (if needed)

---

## Task 1: Settings Storage Schema & Hook

**Files:**
- Create: `src/popup/hooks/useNotificationSettings.ts`

- [ ] **Step 1: Create settings types and default values**

Create `src/popup/hooks/useNotificationSettings.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';

const SETTINGS_STORAGE_KEY = 'notification_settings_v1';

export interface NotificationSettings {
  soundEnabled: {
    PullRequest: boolean;
    Issue: boolean;
    Release: boolean;
    Discussion: boolean;
    Commit: boolean;
  };
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  soundEnabled: {
    PullRequest: false,
    Issue: false,
    Release: false,
    Discussion: false,
    Commit: false,
  },
};
```

- [ ] **Step 2: Implement settings load function**

Add to `src/popup/hooks/useNotificationSettings.ts`:

```typescript
async function loadSettings(): Promise<NotificationSettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as Partial<NotificationSettings> | undefined;
  
  if (!stored) {
    return DEFAULT_SETTINGS;
  }
  
  // Merge with defaults for forward compatibility
  return {
    soundEnabled: {
      ...DEFAULT_SETTINGS.soundEnabled,
      ...stored.soundEnabled,
    },
  };
}

async function saveSettings(settings: NotificationSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}
```

- [ ] **Step 3: Implement custom hook with debouncing**

Add to `src/popup/hooks/useNotificationSettings.ts`:

```typescript
export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const saveTimeoutRef = useRef<number | null>(null);

  // Load settings on mount
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load settings:', error);
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      });
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((newSettings: NotificationSettings) => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings(newSettings).catch((error) => {
        console.error('Failed to save settings:', error);
      });
      saveTimeoutRef.current = null;
    }, 300);
  }, []);

  const updateSound = useCallback(
    (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => {
      if (!settings) return;
      
      const newSettings: NotificationSettings = {
        ...settings,
        soundEnabled: {
          ...settings.soundEnabled,
          [type]: enabled,
        },
      };
      
      setSettings(newSettings);
      debouncedSave(newSettings);
    },
    [settings, debouncedSave]
  );

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    debouncedSave(DEFAULT_SETTINGS);
  }, [debouncedSave]);

  return {
    settings,
    loading,
    updateSound,
    resetToDefaults,
  };
}
```

- [ ] **Step 4: Commit settings hook**

```bash
git add src/popup/hooks/useNotificationSettings.ts
git commit -m "feat: add notification settings hook with debounced storage"
```

---

## Task 2: Bell Icon Component

**Files:**
- Create: `src/popup/components/BellIcon.tsx`

- [ ] **Step 1: Create bell icon SVG component**

Create `src/popup/components/BellIcon.tsx`:

```typescript
export function BellIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        animation: 'bellPulse 2s ease-in-out infinite',
      }}
    >
      <path d="M10.5 5.5A3.5 3.5 0 0 0 3.5 5.5c0 3.5-1.5 4.5-1.5 4.5h10s-1.5-1-1.5-4.5" />
      <path d="M8.5 12a1.5 1.5 0 0 1-3 0" />
    </svg>
  );
}
```

- [ ] **Step 2: Add CSS animation**

Add to `src/popup/components/BellIcon.tsx`:

```typescript
// Add this as a style tag in the component or in a CSS file
const bellPulseStyle = `
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
`;

export function BellIcon() {
  return (
    <>
      <style>{bellPulseStyle}</style>
      <svg
        width="13"
        height="13"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: 'bellPulse 2s ease-in-out infinite',
          color: 'var(--tg-fg2)',
        }}
      >
        <path d="M10.5 5.5A3.5 3.5 0 0 0 3.5 5.5c0 3.5-1.5 4.5-1.5 4.5h10s-1.5-1-1.5-4.5" />
        <path d="M8.5 12a1.5 1.5 0 0 1-3 0" />
      </svg>
    </>
  );
}
```

- [ ] **Step 3: Commit bell icon component**

```bash
git add src/popup/components/BellIcon.tsx
git commit -m "feat: add animated bell icon component"
```

---

## Task 3: Settings Panel Component

**Files:**
- Create: `src/popup/components/SettingsPanel.tsx`

- [ ] **Step 1: Create settings panel component structure**

Create `src/popup/components/SettingsPanel.tsx`:

```typescript
import { useEffect } from 'react';
import type { NotificationSettings } from '../hooks/useNotificationSettings';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: NotificationSettings | null;
  loading: boolean;
  onUpdateSound: (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => void;
  onSignOut: () => void;
}

export function SettingsPanel({
  open,
  onClose,
  settings,
  loading,
  onUpdateSound,
  onSignOut,
}: SettingsPanelProps) {
  // ESC key handler
  useEffect(() => {
    if (!open) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 320,
          background: 'var(--tg-bg1)',
          borderLeft: '1px solid var(--tg-line)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideIn 250ms ease-out',
        }}
      >
        <style>
          {`
            @keyframes slideIn {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}
        </style>

        {/* Header */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--tg-line)',
            flexShrink: 0,
          }}
        >
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--tg-fg0)',
              margin: 0,
              flex: 1,
              fontFamily: 'var(--tg-sans)',
            }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 24,
              height: 24,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--tg-fg2)',
              fontSize: 18,
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 12px',
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
          ) : (
            <>
              {/* Notification Sounds Section */}
              <Section title="Notification Sounds" />
              {settings && (
                <>
                  <ToggleRow
                    label="Pull Requests"
                    checked={settings.soundEnabled.PullRequest}
                    onChange={(checked) => onUpdateSound('PullRequest', checked)}
                  />
                  <ToggleRow
                    label="Issues"
                    checked={settings.soundEnabled.Issue}
                    onChange={(checked) => onUpdateSound('Issue', checked)}
                  />
                  <ToggleRow
                    label="Releases"
                    checked={settings.soundEnabled.Release}
                    onChange={(checked) => onUpdateSound('Release', checked)}
                  />
                  <ToggleRow
                    label="Discussions"
                    checked={settings.soundEnabled.Discussion}
                    onChange={(checked) => onUpdateSound('Discussion', checked)}
                  />
                  <ToggleRow
                    label="Commits"
                    checked={settings.soundEnabled.Commit}
                    onChange={(checked) => onUpdateSound('Commit', checked)}
                  />
                </>
              )}

              {/* Account Section */}
              <Section title="Account" style={{ marginTop: 24 }} />
              <button
                type="button"
                onClick={onSignOut}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--tg-line)',
                  borderRadius: 4,
                  background: 'transparent',
                  color: '#ff4444',
                  fontSize: 13,
                  fontFamily: 'var(--tg-sans)',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add Section sub-component**

Add to `src/popup/components/SettingsPanel.tsx`:

```typescript
function Section({ title, style }: { title: string; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: 'var(--tg-fg3)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        fontFamily: 'var(--tg-sans)',
        ...style,
      }}
    >
      {title}
    </div>
  );
}
```

- [ ] **Step 3: Add ToggleRow sub-component**

Add to `src/popup/components/SettingsPanel.tsx`:

```typescript
function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          fontSize: 13,
          color: 'var(--tg-fg0)',
          fontFamily: 'var(--tg-sans)',
        }}
      >
        {label}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{
          width: 16,
          height: 16,
          cursor: 'pointer',
        }}
      />
    </label>
  );
}
```

- [ ] **Step 4: Commit settings panel component**

```bash
git add src/popup/components/SettingsPanel.tsx
git commit -m "feat: add settings panel with notification toggles and sign out"
```

---

## Task 4: Service Worker Notification Detection

**Files:**
- Modify: `src/background/workers/sync.ts`

- [ ] **Step 1: Add notification ID cache types**

Add to the top of `src/background/workers/sync.ts` (after imports):

```typescript
const NOTIFICATION_IDS_CACHE_KEY = 'last_notification_ids_v1';

interface NotificationIdCache {
  ids: string[];
  lastSyncAt: number;
}

interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string;
  }>;
}
```

- [ ] **Step 2: Add notification detection logic**

In `src/background/workers/sync.ts`, after line 43 (after setting NOTIFICATIONS_CACHE_KEY), add:

```typescript
    // Detect new notifications
    const previousCacheResult = await chrome.storage.local.get(NOTIFICATION_IDS_CACHE_KEY);
    const previousCache = previousCacheResult[NOTIFICATION_IDS_CACHE_KEY] as NotificationIdCache | undefined;
    const previousIds = new Set(previousCache?.ids ?? []);
    const currentIds = filtered.map((n) => n.id);
    
    // Only send message if we have previous IDs (skip first sync)
    if (previousCache && previousIds.size > 0) {
      const newNotifications = filtered.filter((n) => !previousIds.has(n.id));
      
      if (newNotifications.length > 0) {
        const message: NewNotificationMessage = {
          type: 'NEW_NOTIFICATIONS',
          notifications: newNotifications.map((n) => ({
            id: n.id,
            subjectType: n.subject.type,
          })),
        };
        
        // Send message to popup (catch error if popup isn't open)
        chrome.runtime.sendMessage(message).catch(() => {
          // Popup might not be open, that's fine
        });
      }
    }
    
    // Store current IDs for next sync
    await chrome.storage.local.set({
      [NOTIFICATION_IDS_CACHE_KEY]: {
        ids: currentIds,
        lastSyncAt: Date.now(),
      } as NotificationIdCache,
    });
```

- [ ] **Step 3: Commit notification detection**

```bash
git add src/background/workers/sync.ts
git commit -m "feat: add notification detection and messaging to popup"
```

---

## Task 5: Sound Playback Hook

**Files:**
- Create: `src/popup/hooks/useNotificationSounds.ts`

- [ ] **Step 1: Create sound playback function**

Create `src/popup/hooks/useNotificationSounds.ts`:

```typescript
function playNotificationSound() {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
}
```

- [ ] **Step 2: Create notification sounds hook**

Add to `src/popup/hooks/useNotificationSounds.ts`:

```typescript
import { useEffect, useRef } from 'react';
import type { NotificationSettings } from './useNotificationSettings';

interface NewNotificationMessage {
  type: 'NEW_NOTIFICATIONS';
  notifications: Array<{
    id: string;
    subjectType: string;
  }>;
}

export function useNotificationSounds(settings: NotificationSettings | null) {
  const lastPlayedRef = useRef<number>(0);

  useEffect(() => {
    if (!settings) return;

    const handleMessage = (message: any) => {
      if (message.type !== 'NEW_NOTIFICATIONS') return;

      const typedMessage = message as NewNotificationMessage;
      
      // Check if any notification type should trigger a sound
      const shouldPlaySound = typedMessage.notifications.some((n) => {
        const type = n.subjectType as keyof NotificationSettings['soundEnabled'];
        return settings.soundEnabled[type] === true;
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

- [ ] **Step 3: Commit sound playback hook**

```bash
git add src/popup/hooks/useNotificationSounds.ts
git commit -m "feat: add notification sounds hook with throttling"
```

---

## Task 6: Sign Out Confirmation

**Files:**
- Modify: `src/popup/components/Header.tsx`

- [ ] **Step 1: Add sign-out confirmation to avatar click**

In `src/popup/components/Header.tsx`, modify the Header component to add a confirmation handler. Replace the existing `onClick={busy ? undefined : onSignOut}` line (around line 140) with:

```typescript
const handleAvatarSignOut = () => {
  if (busy) return;
  
  const confirmed = confirm(
    'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
  );
  
  if (confirmed) {
    onSignOut();
  }
};

// Then update the img tag's onClick:
onClick={handleAvatarSignOut}
```

Full context - update the `<img>` element:

```typescript
      <img
        src={viewer.avatar_url}
        alt={viewer.login}
        title={`@${viewer.login} · click to sign out`}
        onClick={handleAvatarSignOut}
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          border: '1px solid var(--tg-line-strong)',
          marginLeft: 8,
          cursor: busy ? 'default' : 'pointer',
          opacity: busy ? 0.5 : 1,
          transition: 'opacity 80ms',
          flexShrink: 0,
        }}
      />
```

- [ ] **Step 2: Add settings button handler to Header props**

In `src/popup/components/Header.tsx`, update the `Props` interface to add `onSettingsClick`:

```typescript
interface Props {
  viewer: Viewer;
  unreadCount: number;
  onSignOut: () => void;
  busy: boolean;
  onSearch: () => void;
  onDashboard: () => void;
  dashboardActive: boolean;
  onSettingsClick: () => void;
}
```

- [ ] **Step 3: Update settings button onClick**

In `src/popup/components/Header.tsx`, find the settings button (around line 201) and update its onClick:

```typescript
      <button
        type="button"
        onClick={onSettingsClick}
        title="Settings"
        style={{ ...iconBtnBase, color: 'var(--tg-fg2)' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg0)';
          (e.currentTarget as HTMLElement).style.background = 'var(--tg-bg3)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = 'var(--tg-fg2)';
          (e.currentTarget as HTMLElement).style.background = 'transparent';
        }}
      >
        <CogIcon />
      </button>
```

- [ ] **Step 4: Add bell icon to Header**

In `src/popup/components/Header.tsx`, add import at the top:

```typescript
import { BellIcon } from './BellIcon';
```

Then add the bell icon after the unread count badge (after line 133), before the viewer avatar:

```typescript
      {unreadCount > 0 && (
        <div style={{ marginLeft: 8, display: 'flex', alignItems: 'center' }}>
          <BellIcon />
        </div>
      )}
```

- [ ] **Step 5: Commit Header updates**

```bash
git add src/popup/components/Header.tsx
git commit -m "feat: add sign-out confirmation, settings handler, and bell icon to header"
```

---

## Task 7: Integration in App.tsx

**Files:**
- Modify: `src/popup/App.tsx`

- [ ] **Step 1: Add imports and hooks**

In `src/popup/App.tsx`, add imports at the top:

```typescript
import { SettingsPanel } from './components/SettingsPanel';
import { useNotificationSettings } from './hooks/useNotificationSettings';
import { useNotificationSounds } from './hooks/useNotificationSounds';
```

- [ ] **Step 2: Add settingsOpen state and initialize hooks**

In the `App` component, add state after existing state declarations:

```typescript
  const [settingsOpen, setSettingsOpen] = useState(false);
  const notificationSettings = useNotificationSettings();
  
  // Enable notification sounds
  useNotificationSounds(notificationSettings.settings);
```

- [ ] **Step 3: Add sign-out handler with confirmation**

In the `App` component, add a sign-out handler for the settings panel:

```typescript
  const handleSettingsSignOut = () => {
    const confirmed = confirm(
      'Sign out of GitHub Workflow Assistant? Your personal access token will be removed.'
    );
    
    if (confirmed) {
      void auth.signOut();
      setSettingsOpen(false);
    }
  };
```

- [ ] **Step 4: Update Header component props**

Update the `<Header>` component call to include new props:

```typescript
      <Header
        viewer={auth.viewer}
        unreadCount={unreadCount}
        onSignOut={() => void auth.signOut()}
        busy={auth.busy}
        onSearch={() => void 0}
        onDashboard={() => setDashboardActive((v) => !v)}
        dashboardActive={dashboardActive}
        onSettingsClick={() => setSettingsOpen(true)}
      />
```

- [ ] **Step 5: Add SettingsPanel component**

Add the `<SettingsPanel>` component after the `<PopupFooter>` (before the closing `</div>`):

```typescript
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={notificationSettings.settings}
        loading={notificationSettings.loading}
        onUpdateSound={notificationSettings.updateSound}
        onSignOut={handleSettingsSignOut}
      />
```

- [ ] **Step 6: Commit App.tsx integration**

```bash
git add src/popup/App.tsx
git commit -m "feat: integrate settings panel and notification sounds in App"
```

---

## Task 8: Manual Testing & Verification

**Files:** None (testing only)

- [ ] **Step 1: Test settings persistence**

Manual test:
1. Load extension in browser
2. Open popup
3. Click settings cog
4. Toggle a notification type (e.g., Pull Requests)
5. Close popup
6. Reopen popup
7. Open settings again
8. Verify toggle is still enabled

Expected: Settings persist across popup sessions

- [ ] **Step 2: Test settings panel interactions**

Manual test:
1. Open settings panel
2. Test close via X button - should close
3. Open settings panel again
4. Test close via backdrop click - should close
5. Open settings panel again
6. Press ESC key - should close

Expected: All three close methods work

- [ ] **Step 3: Test bell icon visibility**

Manual test:
1. Ensure you have unread GitHub notifications
2. Open popup
3. Verify bell icon appears in header and pulses
4. Mark all notifications as read on GitHub
5. Wait for sync (or trigger manual sync)
6. Verify bell icon disappears

Expected: Bell icon only shows when unread count > 0

- [ ] **Step 4: Test sign-out confirmation**

Manual test:
1. Click avatar in header
2. Verify confirmation dialog appears
3. Click Cancel - should stay signed in
4. Click avatar again
5. Click OK - should sign out
6. Sign in again
7. Open settings panel
8. Click Sign Out button
9. Verify confirmation dialog appears
10. Click OK - should sign out and close settings panel

Expected: Both sign-out methods show confirmation

- [ ] **Step 5: Test notification sound (requires real notifications)**

Manual test (requires GitHub activity):
1. Enable a notification type in settings (e.g., Pull Requests)
2. Close popup
3. Have someone mention you in a PR or create PR activity
4. Wait for background sync (or restart service worker to trigger sync)
5. Open popup
6. Verify you hear a sound if new notifications arrived

Expected: Sound plays for enabled notification types

Note: This is hard to test in isolation. Alternative: temporarily modify sync.ts to always send a test message on popup open.

- [ ] **Step 6: Test sound throttling**

Manual test:
1. Enable multiple notification types
2. Trigger multiple notification events quickly
3. Verify sound only plays once (not multiple times in rapid succession)

Expected: Sound throttles to once per 2 seconds

- [ ] **Step 7: Document any issues found**

If any issues are found during testing, document them and fix before considering implementation complete.

---

## Success Criteria

- [ ] Settings panel opens/closes via settings button, ESC, and backdrop
- [ ] Notification sound toggles persist in chrome.storage.local
- [ ] Bell icon appears only when unread count > 0 and pulses
- [ ] Sign-out confirmation shows for both avatar click and settings button
- [ ] Sounds play only for enabled notification types
- [ ] Sounds throttle correctly (max once per 2 seconds)
- [ ] No console errors during normal operation
- [ ] All commits follow conventional commit format
