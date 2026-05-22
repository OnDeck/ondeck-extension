import { chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  // Get extension ID from background page
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  const extensionId = background.url().split('/')[2];

  // Open popup
  const popupPage = await context.newPage();
  await popupPage.goto(`chrome-extension://${extensionId}/src/popup/index.html`);

  // Wait for the page to be fully loaded
  await popupPage.waitForLoadState('domcontentloaded');

  return popupPage;
}
