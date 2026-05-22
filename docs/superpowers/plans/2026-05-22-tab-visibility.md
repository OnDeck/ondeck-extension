# Tab Visibility and UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tab visibility controls, remove keyboard shortcuts from footer, and show closed PR badges

**Architecture:** Three independent features: (1) Settings-based tab visibility with chrome.storage.local persistence and validation, (2) Clean up PopupFooter by removing keyboard shortcut display, (3) Detect and badge closed PRs in notification list

**Tech Stack:** React, TypeScript, chrome.storage.local API, existing GitHub notification types

---

## File Structure

**New files:**
- `src/popup/hooks/useTabVisibility.ts` - Hook for tab visibility state management

**Modified files:**
- `src/popup/components/PopupFooter.tsx` - Remove keyboard shortcuts display
- `src/popup/components/SettingsPanel.tsx` - Add "Visible Tabs" section
- `src/popup/components/TabBar.tsx` - Filter tabs based on visibility settings
- `src/popup/components/NotifRow.tsx` - Add closed PR badge
- `src/lib/github-api.ts` - Add helper to check if notification is for closed PR

---

### Task 1: Footer cleanup

**Files:**
- Modify: `src/popup/components/PopupFooter.tsx`

- [ ] **Step 1: Remove keyboard shortcuts and Kbd component**

Remove the three keyboard shortcut spans and the Kbd component function. Keep only the selectedCount display.

```tsx
interface Props {
  selectedCount: number;
}

export function PopupFooter({ selectedCount }: Props) {
  return (
    <div
      style={{
        height: 28,
        display: 'flex',
        alignItems: 'center',
        padding: '0 10px',
        borderTop: '1px solid var(--tg-line)',
        background: 'var(--tg-bg1)',
        fontSize: 10.5,
        fontFamily: 'var(--tg-mono)',
        color: 'var(--tg-fg3)',
        flexShrink: 0,
        gap: 10,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span style={{ marginLeft: 'auto', color: 'var(--tg-fg2)', flexShrink: 0 }}>
        {selectedCount > 0 ? `${selectedCount} selected` : ''}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Run: `npm run dev`
Open extension popup
Check: Footer shows only selected count area (empty when count is 0), no keyboard shortcuts

- [ ] **Step 3: Commit**

```bash
git add src/popup/components/PopupFooter.tsx
git commit -m "refactor: remove keyboard shortcuts display from footer

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 2: Create tab visibility hook

**Files:**
- Create: `src/popup/hooks/useTabVisibility.ts`

- [ ] **Step 1: Create hook file with types and constants**

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
import type { TabId } from '../tabs';
import { logger } from '../../shared/logger';

const SETTINGS_STORAGE_KEY = 'tab_visibility_v1';

export interface TabVisibilitySettings {
  visible: Record<TabId, boolean>;
}

export const DEFAULT_SETTINGS: TabVisibilitySettings = {
  visible: {
    dashboard: true,
    prs: true,
    mentions: true,
    reviews: true,
    notifications: true,
  },
};
```

- [ ] **Step 2: Add storage helper functions**

```typescript
async function loadSettings(): Promise<TabVisibilitySettings> {
  const result = await chrome.storage.local.get(SETTINGS_STORAGE_KEY);
  const stored = result[SETTINGS_STORAGE_KEY] as Partial<TabVisibilitySettings> | undefined;

  if (!stored) {
    return DEFAULT_SETTINGS;
  }

  // Merge with defaults for forward compatibility
  return {
    visible: {
      ...DEFAULT_SETTINGS.visible,
      ...stored.visible,
    },
  };
}

async function saveSettings(settings: TabVisibilitySettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: settings });
}

function validateSettings(settings: TabVisibilitySettings): boolean {
  // At least one tab must be visible
  return Object.values(settings.visible).some((v) => v === true);
}
```

- [ ] **Step 3: Implement the hook**

```typescript
export function useTabVisibility() {
  const [settings, setSettings] = useState<TabVisibilitySettings | null>(null);
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
        logger.error({ module: 'useTabVisibility', message: 'Failed to load settings', error });
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
      });
  }, []);

  // Cleanup pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Debounced save function
  const debouncedSave = useCallback((newSettings: TabVisibilitySettings) => {
    if (saveTimeoutRef.current !== null) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      saveSettings(newSettings).catch((error) => {
        logger.error({ module: 'useTabVisibility', message: 'Failed to save settings', error });
      });
      saveTimeoutRef.current = null;
    }, 300);
  }, []);

  const toggleTab = useCallback(
    (tabId: TabId, visible: boolean) => {
      if (!settings) return;

      const newSettings: TabVisibilitySettings = {
        ...settings,
        visible: {
          ...settings.visible,
          [tabId]: visible,
        },
      };

      // Validate: at least one tab must remain visible
      if (!validateSettings(newSettings)) {
        logger.warn({ module: 'useTabVisibility', message: 'Cannot hide last visible tab' });
        return;
      }

      setSettings(newSettings);
      debouncedSave(newSettings);
    },
    [settings, debouncedSave]
  );

  return {
    settings,
    loading,
    toggleTab,
  };
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/popup/hooks/useTabVisibility.ts
git commit -m "feat: add tab visibility hook with storage persistence

- Load/save to chrome.storage.local
- Validate at least one tab remains visible
- Debounce writes (300ms)
- Follow useNotificationSettings pattern

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 3: Add tab visibility controls to Settings panel

**Files:**
- Modify: `src/popup/components/SettingsPanel.tsx`

- [ ] **Step 1: Import useTabVisibility and TabId type**

Add imports at top of file:

```typescript
import { useTabVisibility } from '../hooks/useTabVisibility';
import type { TabId } from '../tabs';
```

- [ ] **Step 2: Update SettingsPanelProps interface**

Add tab visibility props to the interface:

```typescript
interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  settings: NotificationSettings | null;
  loading: boolean;
  onUpdateSound: (type: keyof NotificationSettings['soundEnabled'], enabled: boolean) => void;
  onSignOut: () => void;
  tabVisibility: ReturnType<typeof useTabVisibility>;
}
```

- [ ] **Step 3: Update SettingsPanel function signature**

```typescript
export function SettingsPanel({
  open,
  onClose,
  settings,
  loading,
  onUpdateSound,
  onSignOut,
  tabVisibility,
}: SettingsPanelProps) {
```

- [ ] **Step 4: Add tab labels constant**

After the existing imports and before the component:

```typescript
const TAB_LABELS: Record<TabId, string> = {
  dashboard: 'Home',
  prs: 'PRs',
  mentions: 'Mentions',
  reviews: 'Reviews',
  notifications: 'Inbox',
};
```

- [ ] **Step 5: Add Visible Tabs section in the body**

Add this section after the Notification Sounds section and before the Account section (around line 190):

```typescript
{/* Visible Tabs Section */}
<Section title="Visible Tabs" style={{ marginTop: 24 }} />
{tabVisibility.loading ? (
  <div style={{ color: 'var(--tg-fg3)', fontSize: 12 }}>Loading...</div>
) : (
  tabVisibility.settings && (
    <>
      {(Object.keys(TAB_LABELS) as TabId[]).map((tabId) => (
        <ToggleRow
          key={tabId}
          label={TAB_LABELS[tabId]}
          checked={tabVisibility.settings.visible[tabId]}
          onChange={(checked) => tabVisibility.toggleTab(tabId, checked)}
        />
      ))}
    </>
  )
)}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 7: Update App.tsx to pass tabVisibility prop**

Read `src/popup/App.tsx` to see current SettingsPanel usage, then update it to:

```typescript
const tabVisibility = useTabVisibility();

// In the JSX where SettingsPanel is rendered:
<SettingsPanel
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  settings={notificationSettings.settings}
  loading={notificationSettings.loading}
  onUpdateSound={notificationSettings.updateSound}
  onSignOut={handleSettingsSignOut}
  tabVisibility={tabVisibility}
/>
```

Also add the import at the top of App.tsx:

```typescript
import { useTabVisibility } from './hooks/useTabVisibility';
```

- [ ] **Step 8: Verify in browser**

Run: `npm run dev`
Open extension popup → Settings
Check: "Visible Tabs" section appears with 5 toggles (Home, PRs, Mentions, Reviews, Inbox)
Try: Toggle one off, verify it saves (reload extension, check it's still off)
Try: Toggle all off except one, then try to toggle the last one off, verify it stays on

- [ ] **Step 9: Commit**

```bash
git add src/popup/components/SettingsPanel.tsx src/popup/App.tsx
git commit -m "feat: add tab visibility controls to settings panel

- Add 'Visible Tabs' section with toggles
- Wire useTabVisibility hook to App.tsx
- Validate at least one tab remains visible

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4: Filter TabBar based on visibility settings

**Files:**
- Modify: `src/popup/components/TabBar.tsx`

- [ ] **Step 1: Import useTabVisibility**

Add import at top of file:

```typescript
import { useTabVisibility } from '../hooks/useTabVisibility';
```

- [ ] **Step 2: Update TabBar to filter tabs**

Replace the current TabBar component with:

```typescript
export function TabBar({ active, onChange }: Props) {
  const { settings, loading } = useTabVisibility();

  if (loading || !settings) {
    // Show skeleton while loading
    return (
      <nav
        role="tablist"
        className="flex border-b border-gh-border-default bg-gh-canvas-default"
        style={{ height: 33 }}
      />
    );
  }

  const visibleTabs = TABS.filter((tab) => settings.visible[tab.id]);

  return (
    <nav
      role="tablist"
      className="flex border-b border-gh-border-default bg-gh-canvas-default"
    >
      {visibleTabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 border-b-2 px-1 py-2 text-[11px] font-semibold transition-colors',
              isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default',
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Verify in browser**

Run: `npm run dev`
Open extension popup
Check: All tabs visible by default
Open Settings → hide "Mentions" tab
Check: Mentions tab disappears from TabBar
Reload extension
Check: Mentions tab still hidden (persistence works)

- [ ] **Step 5: Commit**

```bash
git add src/popup/components/TabBar.tsx
git commit -m "feat: filter tabs based on visibility settings

- Load tab visibility from useTabVisibility hook
- Show loading skeleton while hook initializes
- Filter TABS array to only render visible tabs

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 5: Add closed PR indicator

**Files:**
- Modify: `src/lib/github-api.ts`
- Modify: `src/popup/components/NotifRow.tsx`

- [ ] **Step 1: Add isNotificationForClosedPR helper**

Add this function to `src/lib/github-api.ts` after the `isNotificationForMergedPR` function:

```typescript
/**
 * Check if a notification is for a closed PR (merged or closed without merge).
 * Returns false for non-PR notifications or if the check fails.
 */
export async function isNotificationForClosedPR(
  token: string,
  notification: NotificationItem,
): Promise<boolean> {
  if (notification.subject.type !== 'PullRequest' || !notification.subject.url) {
    return false;
  }

  const details = await fetchPullRequestDetails(token, notification.subject.url);
  return details?.state === 'closed' ?? false;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Add closed prop to NotifRow**

In `src/popup/components/NotifRow.tsx`, update the Props interface:

```typescript
interface Props {
  item: PrioritizedNotification;
  marking: boolean;
  onMark: (item: NotificationItem) => void;
  showRepo?: boolean;
  isClosed?: boolean;
}
```

Update the function signature:

```typescript
export function NotifRow({ item, marking, onMark, showRepo = true, isClosed = false }: Props) {
```

- [ ] **Step 4: Add closed badge after PR number**

In the meta line section (around line 212), after the PR number span, add:

```typescript
{prNum && (
  <span style={{ color: 'var(--tg-fg3)', flexShrink: 0 }}>#{prNum}</span>
)}

{isClosed && (
  <span
    style={{
      fontSize: 9,
      padding: '2px 4px',
      borderRadius: 3,
      background: 'var(--tg-bg3)',
      color: 'var(--tg-fg3)',
      fontFamily: 'var(--tg-mono)',
      fontWeight: 600,
      letterSpacing: 0.3,
    }}
  >
    CLOSED
  </span>
)}
```

- [ ] **Step 5: Update Notifications.tsx to detect closed PRs**

Read `src/popup/components/Notifications.tsx` to understand how notifications are rendered, then update it to:

1. Import the helper:
```typescript
import { isNotificationForClosedPR } from '../../lib/github-api';
```

2. Add state to track which notifications are closed:
```typescript
const [closedPRs, setClosedPRs] = useState<Set<string>>(new Set());
```

3. Add useEffect to detect closed PRs when notifications load:
```typescript
useEffect(() => {
  if (!notifications || notifications.length === 0) return;

  const checkClosedPRs = async () => {
    const closedIds = new Set<string>();
    
    for (const notif of notifications) {
      if (notif.subject.type === 'PullRequest') {
        const isClosed = await isNotificationForClosedPR(token, notif);
        if (isClosed) {
          closedIds.add(notif.id);
        }
      }
    }
    
    setClosedPRs(closedIds);
  };

  void checkClosedPRs();
}, [notifications, token]);
```

4. Pass isClosed prop to NotifRow:
```typescript
<NotifRow
  item={item}
  marking={markingIds.has(item.id)}
  onMark={handleMarkRead}
  showRepo={showRepo}
  isClosed={closedPRs.has(item.id)}
/>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 7: Verify in browser**

Run: `npm run dev`
Open extension popup
Find a closed PR notification (or create test data)
Check: "CLOSED" badge appears in gray next to the PR number
Check: Open PRs don't show the badge

- [ ] **Step 8: Commit**

```bash
git add src/lib/github-api.ts src/popup/components/NotifRow.tsx src/popup/components/Notifications.tsx
git commit -m "feat: add closed PR indicator badges

- Add isNotificationForClosedPR helper to github-api
- Detect closed PRs when notifications load
- Show gray 'CLOSED' badge next to PR number
- Badge uses muted colors to indicate inactive state

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Testing Checklist

After all tasks complete, verify:

- [ ] Footer shows only selected count, no keyboard shortcuts
- [ ] Settings panel has "Visible Tabs" section
- [ ] Toggling tabs on/off works immediately in TabBar
- [ ] Cannot hide all tabs (at least one must remain visible)
- [ ] Tab visibility persists after extension reload
- [ ] Closed PRs show gray "CLOSED" badge
- [ ] Open PRs don't show the badge
- [ ] TypeScript strict mode passes: `npm run build`

## Completion

When all tasks and testing are complete, create a final commit summarizing the changes:

```bash
git add -A
git commit -m "feat: tab visibility, footer cleanup, and closed PR indicators

Summary of changes:
- Tab visibility controls in settings panel with persistence
- Remove keyboard shortcuts from footer
- Show 'CLOSED' badge on closed PR notifications

All features working and tested manually.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```
