import { expect, test } from '@playwright/test';
import { launchExtension, signIn, type ExtensionHarness } from './helpers/extension';

let h: ExtensionHarness;

test.beforeEach(async () => {
  h = await launchExtension();
  await signIn(h.popup);
  await h.popup.getByText('Checkout: retry payment intents on 409').waitFor();
});

test.afterEach(async () => {
  await h.context.close();
});

const focusedRowId = () => h.popup.evaluate(() => document.activeElement?.getAttribute('data-row-id') ?? null);

test('j and k move between rows, arrows too', async () => {
  await h.popup.keyboard.press('j');
  expect(await focusedRowId()).toBe('100');
  await h.popup.keyboard.press('j');
  await h.popup.keyboard.press('ArrowDown');
  expect(await focusedRowId()).toBe('102');
  await h.popup.keyboard.press('k');
  expect(await focusedRowId()).toBe('101');
  await h.popup.keyboard.press('ArrowUp');
  await h.popup.keyboard.press('ArrowUp');
  expect(await focusedRowId()).toBe('100');
});

test('e marks the focused row as read', async () => {
  await h.popup.keyboard.press('j');
  await h.popup.keyboard.press('e');
  await expect(h.popup.locator('header')).toContainText('4');
  expect(h.github.calls).toContain('PATCH /notifications/threads/100');
});

test('e on the Unread chip keeps focus in the list', async () => {
  await h.popup.getByRole('button', { name: /^Unread/ }).click();
  await h.popup.keyboard.press('j');
  await h.popup.keyboard.press('e');
  await expect(h.popup.locator('[data-row-id="100"]')).toHaveCount(0);
  await expect.poll(focusedRowId).toBe('101');
});

test('Enter and o open the focused row on GitHub', async () => {
  await h.context.route('https://github.com/**', (route) => route.fulfill({ body: 'ok' }));
  await h.popup.keyboard.press('j');
  const [viaEnter] = await Promise.all([h.context.waitForEvent('page'), h.popup.keyboard.press('Enter')]);
  expect(viaEnter.url()).toBe('https://github.com/acme/web/pull/10');
  await h.popup.bringToFront();
  await h.popup.locator('[data-row-id="101"]').focus();
  const [viaO] = await Promise.all([h.context.waitForEvent('page'), h.popup.keyboard.press('o')]);
  expect(viaO.url()).toBe('https://github.com/acme/api/issues/11');
});

test('/ opens search, and shortcuts are ignored while typing', async () => {
  await h.popup.keyboard.press('/');
  const search = h.popup.getByPlaceholder('Search notifications…');
  await expect(search).toBeFocused();
  await h.popup.keyboard.type('jk');
  await expect(search).toHaveValue('jk');
  expect(await focusedRowId()).toBeNull();
});

test('shortcuts are ignored while settings are open', async () => {
  await h.popup.click('[data-testid="settings-button"]');
  await h.popup.keyboard.press('j');
  expect(await focusedRowId()).toBeNull();
});
