import { expect, test } from '@playwright/test';
import { launchExtension, signIn, type ExtensionHarness } from './helpers/extension';

let h: ExtensionHarness;

test.beforeEach(async () => {
  h = await launchExtension();
});

test.afterEach(async () => {
  await h.context.close();
});

test('shows the GitHub error for a token it rejects', async () => {
  h.github.mode = 'expired';
  await h.popup.fill('#pat', 'ghp_bad');
  await h.popup.keyboard.press('Enter');
  await expect(h.popup.getByRole('alert')).toContainText('invalid or expired');
});

test('shows a rate-limit screen instead of blaming the token', async () => {
  await signIn(h.popup);
  h.github.mode = 'rate-limited';
  await h.popup.evaluate(() => chrome.storage.local.remove('gh_notifications_cache_v1'));
  await h.popup.reload();
  await expect(h.popup.getByText('Rate limited by GitHub')).toBeVisible();
  await expect(h.popup.getByRole('button', { name: 'Reconnect' })).toHaveCount(0);
});

test('offers Reconnect for an expired token and returns to sign-in', async () => {
  await signIn(h.popup);
  h.github.mode = 'expired';
  await h.popup.evaluate(() => chrome.storage.local.remove('gh_notifications_cache_v1'));
  await h.popup.reload();
  await expect(h.popup.getByText('GitHub token expired')).toBeVisible();
  await h.popup.getByRole('button', { name: 'Reconnect' }).click();
  await expect(h.popup.locator('#pat')).toBeVisible();
});
