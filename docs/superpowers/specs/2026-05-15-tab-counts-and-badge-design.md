# Tab Counts & Extension Badge Design

**Date:** 2026-05-15  
**Branch:** `feature/tab-counts-and-badge` (from `release/1`)  
**Status:** Approved for implementation

## Context

The extension currently shows counts only on the Dashboard (Home tab). Users need at-a-glance visibility of their GitHub activity without opening the popup. This design adds:

1. **Badge-style counts** next to each tab in the TabBar (PRs, Reviews, Mentions, Inbox)
2. **Extension badge icon** showing a total count on the toolbar icon
3. **Settings page** to configure sync behavior, badge formula, display options, and filters
4. **Background sync** using Chrome alarms API to keep counts fresh

The goal is to give developers immediate visibility into their GitHub workflow state without context switching.

## Architecture

### High-Level Structure

```
Background Service Worker
  ├─> Alarm scheduler (extend existing)
  │   └─> Triggers sync worker on user-configured interval
  ├─> Sync worker (extend src/background/workers/sync.ts)
  │   ├─> Fetch counts from GitHub API
  │   ├─> Calculate badge value from settings
  │   ├─> Update extension badge icon
  │   └─> Cache counts + timestamp to chrome.storage.local
  └─> Message handler
      └─> Handle manual refresh requests from popup

Popup UI
  ├─> Header component (extend existing)
  │   ├─> Add gear icon button
  │   └─> Trigger settings drawer
  ├─> Settings drawer (new component)
  │   ├─> Sync interval selector
  │   ├─> Badge count formula picker
  │   ├─> Display toggles
  │   └─> Filter options
  ├─> TabBar (extend existing)
  │   └─> Show badge counts from cached storage
  └─> All tab views (no changes)
      └─> Continue using existing data fetching

Storage Structure
  ├─> chrome.storage.sync
  │   └─> User settings (syncs across devices)
  └─> chrome.storage.local
      └─> Cached counts + last sync timestamp
```

### Files to Create/Modify

**New files:**
- `src/shared/settings/types.ts` - Settings type definitions
- `src/shared/settings/defaults.ts` - Default settings values
- `src/lib/settings.ts` - Settings storage helpers (getSettings, saveSettings, onSettingsChanged)
- `src/popup/components/SettingsDrawer.tsx` - Settings UI drawer component
- `tests/shared/settings/badge-calculator.test.ts` - Unit tests for badge calculation

**Modified files:**
- `src/background/workers/sync.ts` - Add syncAndUpdateBadge(), calculateBadgeCount()
- `src/background/service-worker.ts` - Add alarm scheduling and settings change listeners
- `src/popup/components/Header.tsx` - Add gear icon button and SettingsDrawer
- `src/popup/components/TabBar.tsx` - Add badge counts from storage

## Settings Schema

### Types (`src/shared/settings/types.ts`)

```typescript
export type BadgeCountFormula = 
  | 'all'           // PRs + Reviews + Mentions + Inbox
  | 'actionable'    // PRs + Reviews only
  | 'reviews-only'  // Just review requests
  | 'custom';       // User picks which tabs to count

export type SyncInterval = 5 | 15 | 30 | 60; // minutes

export interface UserSettings {
  // Sync & Updates
  sync: {
    enabled: boolean;
    intervalMinutes: SyncInterval;
  };
  
  // Badge Count
  badge: {
    formula: BadgeCountFormula;
    customTabs?: TabId[]; // only used when formula is 'custom'
  };
  
  // Display
  display: {
    showTabCounts: boolean;
    tabsToShow: TabId[]; // which tabs show counts in TabBar
  };
  
  // Filters (for future use)
  filters: {
    includeDraftPrs: boolean;
    hiddenRepos: string[]; // e.g., ['owner/repo-name']
    priorityLabels: string[]; // e.g., ['urgent', 'p0', 'blocking']
  };
}
```

### Defaults (`src/shared/settings/defaults.ts`)

```typescript
export const DEFAULT_SETTINGS: UserSettings = {
  sync: {
    enabled: true,
    intervalMinutes: 15,
  },
  badge: {
    formula: 'actionable', // PRs + Reviews
  },
  display: {
    showTabCounts: true,
    tabsToShow: ['prs', 'reviews', 'mentions', 'notifications'],
  },
  filters: {
    includeDraftPrs: false,
    hiddenRepos: [],
    priorityLabels: ['urgent', 'blocking', 'priority', 'p0', 'p1', 'hotfix'],
  },
};
```

### Storage Helpers (`src/lib/settings.ts`)

```typescript
// getSettings(): Promise<UserSettings>
//   - Read from chrome.storage.sync
//   - Merge with DEFAULT_SETTINGS for missing keys
//   - Return fully populated settings object

// saveSettings(settings: UserSettings): Promise<void>
//   - Validate with Zod schema
//   - Write to chrome.storage.sync
//   - Throws on validation failure

// onSettingsChanged(callback: (settings: UserSettings) => void): () => void
//   - Listen to chrome.storage.onChanged
//   - Filter for 'sync' area and settings key
//   - Call callback with new settings
//   - Return cleanup function to remove listener
```

## Background Sync Worker

### Extend `src/background/workers/sync.ts`

Add `syncAndUpdateBadge()`:

```typescript
async function syncAndUpdateBadge(token: string, login: string): Promise<void> {
  const settings = await getSettings();
  
  if (!settings.sync.enabled) return;
  
  // Fetch all counts in parallel
  const [prs, reviews, mentions, inbox] = await Promise.all([
    searchAssignedPrs(token, login),
    searchReviewRequested(token, login),
    searchMentions(token, login),
    listNotifications(token),
  ]);
  
  const counts = {
    prs: prs.items.length,
    reviews: reviews.items.length,
    mentions: mentions.items.length,
    notifications: inbox.length,
    timestamp: Date.now(),
  };
  
  // Cache counts
  await chrome.storage.local.set({ counts });
  
  // Calculate badge value based on settings
  const badgeCount = calculateBadgeCount(counts, settings.badge);
  
  // Update extension badge
  if (badgeCount > 0) {
    await chrome.action.setBadgeText({ text: String(badgeCount) });
    await chrome.action.setBadgeBackgroundColor({ color: '#1f6feb' });
  } else {
    await chrome.action.setBadgeText({ text: '' });
  }
}
```

Add `calculateBadgeCount()`:

```typescript
function calculateBadgeCount(
  counts: { prs: number; reviews: number; mentions: number; notifications: number },
  badgeSettings: UserSettings['badge']
): number {
  switch (badgeSettings.formula) {
    case 'all':
      return counts.prs + counts.reviews + counts.mentions + counts.notifications;
    case 'actionable':
      return counts.prs + counts.reviews;
    case 'reviews-only':
      return counts.reviews;
    case 'custom':
      return badgeSettings.customTabs?.reduce(
        (sum, tab) => {
          const tabCounts: Record<string, number> = {
            prs: counts.prs,
            reviews: counts.reviews,
            mentions: counts.mentions,
            notifications: counts.notifications,
          };
          return sum + (tabCounts[tab] || 0);
        },
        0
      ) || 0;
  }
}
```

### Alarm Setup in `src/background/service-worker.ts`

```typescript
// On extension install/update
chrome.runtime.onInstalled.addListener(async () => {
  const settings = await getSettings();
  await scheduleSync(settings.sync.intervalMinutes);
  
  // Run initial sync immediately
  const { token, viewer } = await getAuthState();
  if (token && viewer) {
    await syncAndUpdateBadge(token, viewer.login);
  }
});

// When settings change
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === 'sync' && changes.settings?.newValue?.sync) {
    const { intervalMinutes, enabled } = changes.settings.newValue.sync;
    
    if (enabled) {
      await scheduleSync(intervalMinutes);
    } else {
      await chrome.alarms.clear('github-sync');
      await chrome.action.setBadgeText({ text: '' });
    }
  }
});

async function scheduleSync(intervalMinutes: number) {
  await chrome.alarms.create('github-sync', {
    periodInMinutes: intervalMinutes,
    delayInMinutes: 0, // run immediately on schedule
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'github-sync') {
    const { token, viewer } = await getAuthState();
    if (token && viewer) {
      await syncAndUpdateBadge(token, viewer.login);
    }
  }
});
```

## Settings Drawer UI

### Component (`src/popup/components/SettingsDrawer.tsx`)

**Layout:**
- Slide-in drawer from right side
- Overlays current view with semi-transparent backdrop
- 320px wide, full height
- Click backdrop to close

**Sections:**

1. **Sync & Updates**
   - Toggle: "Auto-sync enabled"
   - Dropdown: Sync interval (5min, 15min, 30min, 60min)

2. **Badge Count**
   - Radio buttons:
     - All items (PRs + Reviews + Mentions + Inbox)
     - Actionable (PRs + Reviews) — default
     - Reviews only
     - Custom... (shows tab checkboxes when selected)

3. **Display**
   - Toggle: "Show counts in tabs"
   - Checkboxes: Which tabs show counts (PRs, Reviews, Mentions, Inbox)

4. **Filters** (for future - wire up UI but don't implement filtering logic yet)
   - Toggle: "Include draft PRs"
   - Input + tag list: Hidden repositories
   - Input + tag list: Priority labels

**Implementation notes:**
- Use `useState` + `useEffect` to load settings on mount
- Debounce saves (500ms) to avoid thrashing chrome.storage
- Use existing Tailwind classes and GitHub Primer colors
- Settings auto-save on change (no explicit "Save" button)
- Show subtle "Saved" indicator on auto-save

### Update Header (`src/popup/components/Header.tsx`)

Add gear icon button:

```tsx
const [settingsOpen, setSettingsOpen] = useState(false);

// In header, next to user info:
<button 
  onClick={() => setSettingsOpen(true)}
  className="p-1 text-gh-fg-muted hover:text-gh-fg-default transition-colors"
  aria-label="Settings"
>
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    {/* Gear icon SVG path */}
  </svg>
</button>

<SettingsDrawer 
  isOpen={settingsOpen} 
  onClose={() => setSettingsOpen(false)} 
/>
```

## TabBar with Badge Counts

### Extend `src/popup/components/TabBar.tsx`

**Changes:**
- Add state for cached counts and display settings
- Load counts from `chrome.storage.local` on mount
- Listen to `chrome.storage.onChanged` for real-time updates
- Render badge next to tab label when count > 0 and showTabCounts is enabled

**Badge styling:**
- Small circular badge (18px min-width)
- Active tab: blue background (`#1f6feb`), white text
- Inactive tabs: gray background (`#30363d`), muted text (`#7d8590`)
- Font size: 9px, font-weight: 600
- Padding: 2px 6px, border-radius: 10px

**Implementation:**

```tsx
export function TabBar({ active, onChange }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [showCounts, setShowCounts] = useState(true);
  
  // Load cached counts from storage
  useEffect(() => {
    chrome.storage.local.get(['counts']).then((result) => {
      if (result.counts) {
        setCounts({
          prs: result.counts.prs || 0,
          mentions: result.counts.mentions || 0,
          reviews: result.counts.reviews || 0,
          notifications: result.counts.notifications || 0,
        });
      }
    });
    
    // Load display settings
    getSettings().then((settings) => {
      setShowCounts(settings.display.showTabCounts);
    });
    
    // Listen for storage changes
    const listener = (changes: any, area: string) => {
      if (area === 'local' && changes.counts) {
        setCounts(changes.counts.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  
  return (
    <nav role="tablist" className="flex border-b border-gh-border-default bg-gh-canvas-default">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        const count = counts[tab.id];
        const hasCount = showCounts && count !== undefined && count > 0;
        
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'flex-1 border-b-2 px-1 py-2 text-[11px] font-semibold transition-colors',
              'flex items-center justify-center gap-1',
              isActive
                ? 'border-gh-accent-emphasis text-gh-fg-default'
                : 'border-transparent text-gh-fg-muted hover:text-gh-fg-default',
            )}
          >
            {tab.label}
            {hasCount && (
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[9px] font-semibold min-w-[18px] text-center',
                  isActive
                    ? 'bg-gh-accent-emphasis text-white'
                    : 'bg-gh-neutral-muted text-gh-fg-muted'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
```

## Data Flow

### Automatic Sync Flow

```
Chrome Alarm fires (every N minutes)
  ↓
Background: syncAndUpdateBadge()
  1. Fetch counts from GitHub API
  2. Store in chrome.storage.local
  3. Calculate badge value from settings
  4. Update chrome.action.setBadgeText()
  ↓
┌──────────────────┬──────────────────┐
│ Extension Badge  │ TabBar Component │
│ Shows total      │ Shows per-tab    │
│ (via Chrome API) │ (via storage)    │
└──────────────────┴──────────────────┘
         ↓                    ↓
    chrome.storage.onChanged fires
         ↓                    ↓
    Components re-render with new counts
```

### Settings Change Flow

```
User changes settings in SettingsDrawer
  ↓
Debounced save to chrome.storage.sync (500ms)
  ↓
chrome.storage.onChanged fires
  ↓
┌──────────────────┬──────────────────┐
│ Background       │ Popup Components │
│ - Reschedules    │ - TabBar updates │
│   alarm if       │   display        │
│   interval       │ - Re-calculates  │
│   changed        │   badge if       │
│                  │   formula changed│
└──────────────────┴──────────────────┘
```

### Storage Usage

**chrome.storage.sync** (user settings, max 100KB, syncs across devices):
```json
{
  "settings": {
    "sync": { "enabled": true, "intervalMinutes": 15 },
    "badge": { "formula": "actionable" },
    "display": { "showTabCounts": true, "tabsToShow": ["prs", "reviews", "mentions", "notifications"] },
    "filters": { "includeDraftPrs": false, "hiddenRepos": [], "priorityLabels": [...] }
  }
}
```

**chrome.storage.local** (cached counts, max 10MB, local only):
```json
{
  "counts": {
    "prs": 3,
    "reviews": 5,
    "mentions": 12,
    "notifications": 8,
    "timestamp": 1778879000000
  }
}
```

### Cache Invalidation

- Background sync overwrites cache every N minutes
- Manual refresh in popup triggers immediate `syncAndUpdateBadge()`
- Timestamp stored with cache for "last updated" UI display
- On sign-out: clear both storage.sync and storage.local

### Error Handling

**GitHub API failures:**
- Keep showing last cached counts
- Log error to console
- Show error toast in popup if user is actively viewing

**Token expired:**
- Clear extension badge
- Clear cached counts
- Show "Token expired" banner in popup
- Redirect to sign-in flow

**Storage quota exceeded:**
- Unlikely with current data size, but if it happens:
- Fallback to session storage (counts only, no settings sync)
- Log warning to console
- Show notification to user

**Network offline:**
- Keep showing last cached counts
- Show "Last updated X minutes ago" indicator
- Badge icon stays at last known value

## Verification Plan

### Manual Testing Checklist

**Settings UI:**
1. Open popup → click gear icon → settings drawer slides in from right
2. Change sync interval to 5 minutes → verify alarm reschedules (check chrome.alarms in DevTools)
3. Change badge formula to "Reviews only" → verify extension badge updates
4. Toggle "Show counts in tabs" off → verify TabBar badges disappear
5. Toggle "Show counts in tabs" on → verify TabBar badges reappear
6. Select "Custom" badge formula → verify tab checkboxes appear
7. Close drawer by clicking backdrop → verify drawer closes

**Background Sync:**
1. Set interval to 5 minutes in settings
2. Wait 5 minutes and observe extension badge icon update
3. Open DevTools → Application → Storage → Local → verify `counts` object cached
4. Check timestamp in cached counts
5. Disable sync in settings → verify alarm clears, badge disappears
6. Re-enable sync → verify alarm reschedules, badge reappears

**Badge Counts:**
1. **Extension icon badge:**
   - Default formula (actionable): should show PRs + Reviews total
   - Change to "all": should show sum of all 4 categories
   - Change to "reviews-only": should show only review count
2. **Tab badges in TabBar:**
   - Should show individual counts for each tab
   - Active tab badge: blue background, white text
   - Inactive tab badges: gray background, muted text
   - Counts should match GitHub reality (manually verify on GitHub.com)

**End-to-End:**
1. Fresh install → verify default settings applied
2. Sign in → verify immediate sync runs, badge appears
3. Create a new PR on GitHub, assign it to yourself
4. Wait for next sync cycle → verify PR count increments
5. Close the PR on GitHub
6. Wait for next sync cycle → verify PR count decrements
7. Sign out → verify badge clears, counts disappear

**Edge Cases:**
1. No internet → popup shows last cached counts, no crash
2. Invalid token → badge clears, popup shows "Sign in" screen
3. First install, no settings → uses defaults, runs immediate sync
4. Chrome restart → settings and cached counts persist
5. Sync disabled → no alarms scheduled, no badge updates
6. Very large counts (>999) → badge shows "999+" or truncates gracefully

### Unit Tests (optional but recommended)

**`tests/shared/settings/badge-calculator.test.ts`:**
- Test `calculateBadgeCount()` with all formula types
- Test custom formula with various tab combinations
- Test edge cases (undefined counts, empty custom tabs)

**`tests/lib/settings.test.ts`:**
- Test `getSettings()` merges with defaults
- Test `saveSettings()` validates with Zod
- Test `onSettingsChanged()` fires callback on storage change

### Post-Implementation Verification

1. Build extension: `npm run build`
2. Load unpacked in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select `dist/`
3. Sign in with GitHub token
4. Open settings, configure:
   - Sync interval: 5 minutes
   - Badge formula: Actionable (PRs + Reviews)
   - Show tab counts: enabled
5. Observe behavior over 15 minutes:
   - Badge icon updates every 5 minutes
   - Tab counts match badge icon breakdown
   - Opening popup shows correct data
6. Test settings changes:
   - Change formula to "All" → badge should immediately recalculate
   - Disable sync → badge should clear after current cycle
   - Re-enable sync → badge should reappear on next cycle
7. Test across Chrome restart:
   - Quit Chrome completely
   - Reopen Chrome
   - Verify settings persisted
   - Verify cached counts still visible
   - Verify sync resumes on schedule

## Out of Scope (Future Enhancements)

**Not included in this version:**
- Desktop notifications (nice-to-have, deferred)
- Sound notifications (nice-to-have, deferred)
- Theme preference / light mode (Dashboard is dark-only currently)
- Filter implementation (UI wired up, but no filtering logic applied to counts)
- Manual refresh button in popup (can add later if needed)
- "Last updated" timestamp display in UI (data is cached, just not shown yet)

These can be added incrementally in follow-up branches.

## Summary

This design extends the existing `release/1` codebase with configurable badge counts and background sync. It follows the established patterns:
- Extends existing components rather than rewriting
- Uses Chrome storage API for state persistence
- Leverages existing GitHub API calls from `lib/github-api.ts`
- Maintains the dark-themed Primer UI aesthetic
- Adds settings UI in a non-intrusive drawer pattern

The implementation should take 4-6 hours for an experienced React + Chrome extension developer, with another 1-2 hours for testing and polish.
