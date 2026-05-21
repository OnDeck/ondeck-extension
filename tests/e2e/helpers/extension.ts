import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

export async function launchExtension() {
  const extensionPath = path.join(__dirname, '../../../dist');

  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  return context;
}

export async function getExtensionPage(context: BrowserContext): Promise<Page> {
  // Wait for extension popup page
  const pages = context.pages();
  if (pages.length > 0) {
    return pages[0];
  }

  // Get extension ID from background page
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];

  // Open popup
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  return popupPage;
}
