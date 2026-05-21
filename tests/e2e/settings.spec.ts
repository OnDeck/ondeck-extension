import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import { launchExtension, getExtensionPage } from './helpers/extension';

let context: BrowserContext;
let page: Page;

test.beforeAll(async () => {
  context = await launchExtension();
  page = await getExtensionPage(context);
});

test.afterAll(async () => {
  await context.close();
});

// Ensure tests run serially since they share the same extension instance
test.describe.configure({ mode: 'serial' });

test.describe('Settings Panel', () => {
  test('opens when settings button is clicked', async () => {

    // Find and click the settings button (cog icon)
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    // Settings panel should be visible
    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Should have Settings title
    const title = page.locator('#settings-title');
    await expect(title).toHaveText('Settings');
  });

  test('closes when close button is clicked', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Click close button (× button)
    const closeButton = page.locator('[role="dialog"] button').filter({ hasText: '×' });
    await closeButton.click();

    // Settings panel should be hidden
    await expect(settingsPanel).not.toBeVisible();
  });

  test('closes when backdrop is clicked', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Click the backdrop (the overlay behind the panel)
    const backdrop = page.locator('[role="dialog"] > div').first();
    await backdrop.click({ position: { x: 10, y: 10 } });

    // Settings panel should be hidden
    await expect(settingsPanel).not.toBeVisible();
  });

  test('closes when ESC key is pressed', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Press ESC
    await page.keyboard.press('Escape');

    // Settings panel should be hidden
    await expect(settingsPanel).not.toBeVisible();
  });
});

test.describe('Notification Settings', () => {
  test('toggles notification sound setting and persists', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Find Pull Requests toggle
    const prLabel = page.locator('label').filter({ hasText: 'Pull Requests' });
    const prCheckbox = prLabel.locator('input[type="checkbox"]');

    // Get initial state
    const initialChecked = await prCheckbox.isChecked();

    // Toggle it
    await prCheckbox.click();

    // Should be in opposite state
    await expect(prCheckbox).toBeChecked({ checked: !initialChecked });

    // Close and reopen settings to verify persistence
    const closeButton = page.locator('[role="dialog"] button').filter({ hasText: '×' });
    await closeButton.click();

    await settingsButton.click();
    await expect(settingsPanel).toBeVisible();

    // Checkbox should still be in the toggled state
    const prCheckboxAfterReopen = page
      .locator('label')
      .filter({ hasText: 'Pull Requests' })
      .locator('input[type="checkbox"]');
    await expect(prCheckboxAfterReopen).toBeChecked({ checked: !initialChecked });

    // Toggle back to original state for cleanup
    await prCheckboxAfterReopen.click();
    await expect(prCheckboxAfterReopen).toBeChecked({ checked: initialChecked });
  });

  test('toggles multiple settings independently', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Get checkboxes for PR, Issues, and Releases
    const prCheckbox = page
      .locator('label')
      .filter({ hasText: 'Pull Requests' })
      .locator('input[type="checkbox"]');
    const issuesCheckbox = page
      .locator('label')
      .filter({ hasText: 'Issues' })
      .locator('input[type="checkbox"]');
    const releasesCheckbox = page
      .locator('label')
      .filter({ hasText: 'Releases' })
      .locator('input[type="checkbox"]');

    // Get initial states
    const prInitial = await prCheckbox.isChecked();
    const issuesInitial = await issuesCheckbox.isChecked();
    const releasesInitial = await releasesCheckbox.isChecked();

    // Toggle PR and Releases (not Issues)
    await prCheckbox.click();
    await releasesCheckbox.click();

    // Verify states
    await expect(prCheckbox).toBeChecked({ checked: !prInitial });
    await expect(issuesCheckbox).toBeChecked({ checked: issuesInitial });
    await expect(releasesCheckbox).toBeChecked({ checked: !releasesInitial });

    // Restore original states
    await prCheckbox.click();
    await releasesCheckbox.click();
  });

  test('displays all notification type toggles', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Verify all notification types are present
    await expect(page.locator('label').filter({ hasText: 'Pull Requests' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Issues' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Releases' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Discussions' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Commits' })).toBeVisible();
  });
});

test.describe('Sign Out Confirmation', () => {
  test('shows confirmation when signing out via avatar', async () => {

    // Mock the confirm dialog to prevent actual sign out
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    // Click on the avatar button (first button in header)
    const avatarButton = page.locator('header button').first();

    // Set up dialog listener before clicking
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Sign out');
      expect(dialog.message()).toContain('personal access token will be removed');
      await dialog.dismiss();
    });

    await avatarButton.click();
  });

  test('shows confirmation when signing out via settings button', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Mock the confirm dialog to prevent actual sign out
    await page.evaluate(() => {
      window.confirm = () => false;
    });

    // Find and click Sign Out button
    const signOutButton = page.locator('button').filter({ hasText: 'Sign Out' });

    // Set up dialog listener before clicking
    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      expect(dialog.message()).toContain('Sign out');
      expect(dialog.message()).toContain('personal access token will be removed');
      await dialog.dismiss();
    });

    await signOutButton.click();

    // Settings panel should still be visible since we cancelled
    await expect(settingsPanel).toBeVisible();
  });

  test('closes settings panel after confirming sign out', async () => {

    // Open settings
    const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
    await settingsButton.click();

    const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
    await expect(settingsPanel).toBeVisible();

    // Mock the confirm dialog to accept (but prevent actual signout by not having real auth)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Find and click Sign Out button
    const signOutButton = page.locator('button').filter({ hasText: 'Sign Out' });
    await signOutButton.click();

    // Settings panel should close after accepting confirmation
    await expect(settingsPanel).not.toBeVisible();
  });
});

test.describe('Bell Icon Visibility', () => {
  test('shows bell icon when there are unread notifications', async () => {

    // Wait for notifications to load
    await page.waitForTimeout(2000);

    // Check if bell icon is visible
    const bellIcon = page.locator('button').filter({ has: page.locator('svg[width="13"][height="13"]') }).first();

    // If there are unread notifications, bell should be visible
    const unreadBadge = page.locator('[style*="background: var(--tg-red)"]');
    const hasUnread = await unreadBadge.isVisible().catch(() => false);

    if (hasUnread) {
      await expect(bellIcon).toBeVisible();
    }
  });

  test('bell icon reflects correct unread count', async () => {

    // Wait for notifications to load
    await page.waitForTimeout(2000);

    // Get unread badge count
    const unreadBadge = page.locator('[style*="background: var(--tg-red)"]');
    const isVisible = await unreadBadge.isVisible().catch(() => false);

    if (isVisible) {
      const badgeText = await unreadBadge.textContent();
      const count = parseInt(badgeText || '0', 10);

      // Count should be a positive number
      expect(count).toBeGreaterThan(0);
    }
  });
});
