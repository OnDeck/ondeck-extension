import { expect, test } from '@playwright/test';
import { launchExtension, signIn, type ExtensionHarness } from './helpers/extension';

let h: ExtensionHarness;

test.beforeEach(async () => {
  h = await launchExtension();
  await signIn(h.popup);
});

test.afterEach(async () => {
  await h.context.close();
});

const panel = () => h.popup.locator('[role="dialog"][aria-labelledby="settings-title"]');
const openSettings = async () => {
  await h.popup.click('[data-testid="settings-button"]');
  await expect(panel()).toBeVisible();
};

test('opens and closes with the close button, the backdrop and Escape', async () => {
  await openSettings();
  await h.popup.getByRole('button', { name: 'Close settings' }).click();
  await expect(panel()).toBeHidden();

  await openSettings();
  await panel().locator('> div').first().click({ position: { x: 10, y: 10 } });
  await expect(panel()).toBeHidden();

  await openSettings();
  await h.popup.keyboard.press('Escape');
  await expect(panel()).toBeHidden();
});

test('persists desktop notification preferences across reopening', async () => {
  await openSettings();
  const mentions = panel().getByLabel('Mentions', { exact: true });
  await expect(mentions).toBeChecked();
  await mentions.click();
  await expect(mentions).not.toBeChecked();

  await h.popup.reload();
  await openSettings();
  await expect(panel().getByLabel('Mentions', { exact: true })).not.toBeChecked();
});

test('persists the refresh interval', async () => {
  await openSettings();
  await panel().locator('select').selectOption('5');
  await h.popup.reload();
  await openSettings();
  await expect(panel().locator('select')).toHaveValue('5');
});

test('signs out after confirming and returns to the sign-in screen', async () => {
  await openSettings();
  h.popup.once('dialog', (dialog) => void dialog.accept());
  await panel().getByRole('button', { name: 'Sign out' }).click();
  await expect(h.popup.locator('#pat')).toBeVisible();
});
