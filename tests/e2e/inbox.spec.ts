import { expect, test } from '@playwright/test';
import { badgeText, launchExtension, signIn, type ExtensionHarness } from './helpers/extension';

let h: ExtensionHarness;

test.beforeEach(async () => {
  h = await launchExtension();
  await signIn(h.popup);
});

test.afterEach(async () => {
  await h.context.close();
});

const header = () => h.popup.locator('header');

test('signs in and shows the inbox with the unread count in the header and badge', async () => {
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible();
  await expect(header()).toContainText('5');
  await expect.poll(() => badgeText(h.worker)).toBe('5');
});

test('marks a single thread as read and drops the counts', async () => {
  await h.popup.locator('button[title="Mark as read"]').first().click();
  await expect(header()).toContainText('4');
  expect(h.github.calls).toContain('PATCH /notifications/threads/100');
  await expect.poll(() => badgeText(h.worker)).toBe('4');
});

test('marks everything as read after confirming', async () => {
  await h.popup.getByRole('button', { name: 'Mark all as read' }).click();
  await expect(h.popup.getByText('Mark everything in your inbox as read?')).toBeVisible();
  await h.popup.getByRole('button', { name: 'Mark read' }).click();
  await expect(h.popup.locator('button[title="Mark as read"]')).toHaveCount(0);
  expect(h.github.calls.some((c) => c.startsWith('PUT /notifications'))).toBe(true);
  await expect.poll(() => badgeText(h.worker)).toBe('');
});

test('filters by chip and shows an empty state for searches with no match', async () => {
  await h.popup.getByRole('button', { name: /^Reviews/ }).click();
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible();
  await expect(h.popup.getByText('Rate limiter drops requests during deploys')).toBeHidden();

  await h.popup.getByRole('button', { name: /^Inbox/ }).click();
  await h.popup.getByRole('button', { name: 'Search notifications' }).click();
  await h.popup.keyboard.type('nothing-matches-this');
  await expect(h.popup.getByText('Nothing matches.')).toBeVisible();
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeHidden();
});

test('search operators narrow by repo, type, reason and read state', async () => {
  const search = h.popup.getByRole('textbox', { name: 'Search notifications' });
  await h.popup.keyboard.press('/');

  await search.fill('repo:api type:issue');
  await expect(h.popup.getByText('Rate limiter drops requests during deploys')).toBeVisible();
  await expect(h.popup.getByText('CI failed on main')).toBeHidden();

  await search.fill('reason:mention');
  await expect(h.popup.getByText('RFC: feature flag naming conventions')).toBeVisible();
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeHidden();

  await search.fill('type:pr checkout');
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible();
  await expect(h.popup.getByText('Add Combobox keyboard navigation')).toBeHidden();

  await search.fill('type:pr is:read');
  await expect(h.popup.getByText(/repo:web type:pr/)).toBeVisible();
});

test('reopens instantly from the cache while the API is slow', async () => {
  await expect.poll(() => badgeText(h.worker)).toBe('5');
  await h.context.route('https://api.github.com/notifications**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.fallback();
  });
  await h.popup.reload();
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible({ timeout: 1000 });
  await expect(h.popup.getByText('Refreshing…')).toBeVisible();
});
