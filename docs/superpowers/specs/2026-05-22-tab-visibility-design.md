# Tab Visibility, Footer Cleanup, and Closed PR Indicator

**Date:** 2026-05-22  
**Status:** Approved

## Overview

Three independent improvements to the OnDeck extension:

1. **Tab visibility controls**: Allow users to show/hide navigation tabs (Home, PRs, Mentions, Reviews, Inbox) via Settings panel, with preferences persisted to storage
2. **Footer cleanup**: Remove keyboard shortcuts display from the footer
3. **Closed PR indicator**: Show a visual "Closed" badge on closed pull request notifications

## Motivation

**Tab visibility**: Users don't need all five tabs — some may only care about PRs and Inbox. Allowing tab customization reduces cognitive load and makes navigation cleaner.

**Footer cleanup**: The keyboard shortcuts display (`↑↓ navigate`, `E archive`, `R reply`) clutters the footer. Users can discover these shortcuts through usage. The extension's own keyboard shortcut (to open the popup) remains unchanged — this is a browser-level setting we don't control.

**Closed PR indicator**: Closed PRs currently look identical to open ones in the notification list. Users need to click through to see the state. A visual indicator prevents wasted clicks and provides at-a-glance status awareness.

## Architecture

### Tab Visibility System

**Hook: `useTabVisibility()`**

Follows the existing `useNotificationSettings()` pattern:

```typescript
// src/popup/hooks/useTabVisibility.ts
interface TabVisibilitySettings {
  visible: Record<TabId, boolean>;
}

function useTabVisibility() {
  const [settings, setSettings] = useState<TabVisibilitySettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Load from chrome.storage.local on mount
  // Debounce writes to storage (similar to useNotificationSettings)
  // Validate that at least one tab remains visible

  return {
    settings,
    loading,
    toggleTab: (tabId: TabId, visible: boolean) => void;
  };
}
```

**Storage schema:**

```json
{
  "tabVisibility": {
    "visible": {
      "dashboard": true,
      "prs": true,
      "mentions": false,
      "reviews": true,
      "notifications": true
    }
  }
}
```

**Default behavior**: All tabs visible on first launch.

**Validation**: Before saving, check that at least one tab has `visible: true`. If the user tries to hide the last visible tab, reject the change and keep the current state.

**Component changes:**

- **TabBar.tsx**: Consumes `useTabVisibility()` and filters `TABS` array to only render visible tabs
- **SettingsPanel.tsx**: Add a new "Visible Tabs" section with toggle checkboxes for each tab, similar to the existing "Notification Sounds" section

### Footer Cleanup

**Component: PopupFooter.tsx**

Remove the keyboard shortcut spans:

```tsx
// Before:
<span><Kbd>↑↓</Kbd>navigate</span>
<span><Kbd>E</Kbd>archive</span>
<span><Kbd>R</Kbd>reply</span>

// After:
// Remove all of the above
```

Keep the `selectedCount` display on the right side. If `selectedCount` is 0, the footer becomes minimal — just a visual separator with the count area empty.

The `Kbd` component can be removed entirely since it has no other usage.

### Closed PR Indicator

**Data source**: GitHub notification objects already contain subject state information. For PRs, check `subject.state` or parse `subject.url` to fetch PR state if needed.

**Detection logic** (in notification processing):

```typescript
// Likely in shared/notifications or lib/github-api
function isPRClosed(notification: NotificationItem): boolean {
  if (notification.subject.type !== 'PullRequest') return false;
  // Check subject.state if available, or fetch from API
  return notification.subject.state === 'closed';
}
```

**Visual indicator** (in NotifRow.tsx):

Add a small "Closed" badge next to the PR number, using existing badge styling from `Badge.tsx` or `PriorityBadge.tsx`:

```tsx
{isPRClosed(item) && (
  <span style={{
    fontSize: 9,
    padding: '2px 4px',
    borderRadius: 3,
    background: 'var(--tg-bg3)',
    color: 'var(--tg-fg3)',
    fontFamily: 'var(--tg-mono)',
    marginLeft: 4,
  }}>
    CLOSED
  </span>
)}
```

Color: Use muted colors (gray) to indicate inactive state, distinct from priority badges which use accent colors.

## Data Flow

### Tab Visibility

1. User opens extension → App.tsx renders
2. TabBar calls `useTabVisibility()` hook
3. Hook loads settings from `chrome.storage.local`
4. TabBar filters `TABS` array based on `settings.visible`
5. User opens Settings → toggles a tab checkbox
6. Settings panel calls `toggleTab(tabId, newValue)`
7. Hook validates (at least one visible), debounces, writes to storage
8. Settings state updates, TabBar re-renders with new filtered list

### Closed PR Indicator

1. Notifications loaded via existing `useNotifications` or similar
2. For each notification, check `subject.type === 'PullRequest'` and `subject.state === 'closed'`
3. If closed, pass `isClosed` prop to NotifRow
4. NotifRow conditionally renders "Closed" badge

**Why this applies:** Closed PRs are already in the notification stream. We're not filtering them out, just adding visual context. No changes to data fetching.

## Components Modified

| File | Change |
|------|--------|
| `src/popup/components/TabBar.tsx` | Filter tabs based on visibility settings |
| `src/popup/components/SettingsPanel.tsx` | Add "Visible Tabs" section with toggles |
| `src/popup/components/PopupFooter.tsx` | Remove keyboard shortcut display, keep selected count |
| `src/popup/components/NotifRow.tsx` | Add closed PR badge when `isPRClosed(item)` |
| `src/popup/hooks/useTabVisibility.ts` | **New file**: Hook for tab visibility state |
| `src/popup/App.tsx` | Wire `useTabVisibility()` into TabBar (if not already using context) |

## Error Handling

**Tab visibility validation**: 
- If storage read fails, default to all tabs visible
- If storage write fails, log error but don't crash (user sees stale state)
- If user tries to hide last visible tab, silently reject (keep current state)

**Closed PR detection**:
- If `subject.state` is missing, assume open (don't show closed badge)
- If API fetch fails (if we need to fetch state separately), assume open

## Testing Approach

**Manual testing:**
1. Toggle tabs in settings, verify they appear/disappear in TabBar
2. Try to hide all tabs, verify at least one remains visible
3. Reload extension, verify tab visibility persists
4. Check footer shows only selected count, no keyboard shortcuts
5. Find a closed PR notification, verify "Closed" badge appears

**E2E tests** (Playwright, similar to existing tests):
- Test tab visibility toggles and persistence
- Test validation (can't hide all tabs)
- Test closed PR badge rendering

No unit tests needed for these UI changes — E2E coverage is sufficient given the existing test setup.

## Migration

No migration needed. On first launch with this code:
- `tabVisibility` key won't exist in storage → defaults to all visible
- Existing users see no change in behavior until they open settings

## Future Considerations

**Not in scope for this change:**
- Tab reordering (drag and drop)
- Keyboard shortcut customization
- Filtering closed PRs from unread count (they still count as unread for now)

These can be added later if needed, but following YAGNI — solve the stated problem, nothing more.
