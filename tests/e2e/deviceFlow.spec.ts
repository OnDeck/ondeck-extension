import { expect, test, type Route } from '@playwright/test';
import { launchExtension, type ExtensionHarness } from './helpers/extension';

// "Sign in with GitHub" only exists in builds with a client ID; CI builds the
// e2e bundle with one.
test.skip(!process.env.VITE_GITHUB_CLIENT_ID, 'build without VITE_GITHUB_CLIENT_ID');

let h: ExtensionHarness;
let tokenResponses: object[];
let tokenRequests: URLSearchParams[];

test.beforeEach(async () => {
  h = await launchExtension();
  tokenResponses = [];
  tokenRequests = [];
  await h.context.route('https://github.com/login/device/code', (route: Route) =>
    route.fulfill({
      json: {
        device_code: 'dc-e2e',
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 1,
      },
    }),
  );
  await h.context.route('https://github.com/login/oauth/access_token', (route: Route) => {
    tokenRequests.push(new URLSearchParams(route.request().postData() ?? ''));
    return route.fulfill({ json: tokenResponses.shift() ?? { error: 'authorization_pending' } });
  });
});

test.afterEach(async () => {
  await h.context.close();
});

test('signs in with a one-time code', async () => {
  await h.popup.getByRole('button', { name: 'Sign in with GitHub' }).click();
  await expect(h.popup.getByLabel('One-time code')).toHaveText('WDJB-MJHT');

  // Routes miss the first navigation of a tab the extension opens, which would
  // load the real github.com, so record the call instead of opening the tab.
  await h.popup.evaluate(() => {
    const opened: string[] = [];
    Object.assign(window, { opened });
    chrome.tabs.create = (props: chrome.tabs.CreateProperties) => {
      opened.push(props.url ?? '');
      return Promise.resolve({} as chrome.tabs.Tab);
    };
  });
  await h.popup.getByRole('button', { name: /Copy code and open GitHub/ }).click();
  await expect
    .poll(() => h.popup.evaluate(() => (window as unknown as { opened: string[] }).opened))
    .toEqual(['https://github.com/login/device']);

  tokenResponses.push({ access_token: 'gho_e2e', token_type: 'bearer', scope: 'notifications,repo' });
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible({ timeout: 10_000 });
  expect(tokenRequests[0].get('device_code')).toBe('dc-e2e');
  expect(h.github.calls).toContain('GET /user');
});

test('shows a denial and lets you try again', async () => {
  tokenResponses.push({ error: 'access_denied' });
  await h.popup.getByRole('button', { name: 'Sign in with GitHub' }).click();
  await expect(h.popup.getByRole('alert')).toHaveText('Sign-in was cancelled on GitHub.');
  await expect(h.popup.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('cancel returns to the sign-in options and stops polling', async () => {
  await h.popup.getByRole('button', { name: 'Sign in with GitHub' }).click();
  await expect(h.popup.getByLabel('One-time code')).toBeVisible();
  await h.popup.getByRole('button', { name: 'Cancel' }).click();
  await expect(h.popup.getByRole('button', { name: 'Sign in with GitHub' })).toBeVisible();
  const polls = tokenRequests.length;
  await h.popup.waitForTimeout(2_500);
  expect(tokenRequests.length).toBe(polls);
});

test('the personal access token stays available as a fallback', async () => {
  await h.popup.fill('#pat', 'ghp_e2e');
  await h.popup.getByRole('button', { name: 'Connect' }).click();
  await expect(h.popup.getByText('Checkout: retry payment intents on 409')).toBeVisible();
});
