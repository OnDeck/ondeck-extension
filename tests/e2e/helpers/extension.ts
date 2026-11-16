import { chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { mockGitHub, type GitHubMock } from './github';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.join(__dirname, '../../../dist');

export interface ExtensionHarness {
  context: BrowserContext;
  worker: Worker;
  popup: Page;
  github: GitHubMock;
}

/**
 * Launch Chromium with the built extension and a mocked GitHub API, and open
 * the popup as a tab. `channel: 'chromium'` runs the new headless mode, which
 * supports extensions, so this works in CI without a display.
 */
export async function launchExtension(): Promise<ExtensionHarness> {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    headless: true,
    viewport: { width: 400, height: 600 },
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });
  const github = await mockGitHub(context);

  let [worker] = context.serviceWorkers();
  if (!worker) worker = await context.waitForEvent('serviceworker');
  const extensionId = new URL(worker.url()).host;

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/src/popup/index.html`);
  return { context, worker, popup, github };
}

/** Sign in through the real form with a fake token the mock accepts. */
export async function signIn(popup: Page): Promise<void> {
  await popup.fill('#pat', 'ghp_e2e');
  await popup.keyboard.press('Enter');
  await popup.waitForSelector('[data-testid="settings-button"]');
}

export async function badgeText(worker: Worker): Promise<string> {
  return worker.evaluate(() => chrome.action.getBadgeText({}));
}
