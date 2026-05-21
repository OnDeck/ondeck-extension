# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: settings.spec.ts >> Settings Panel >> opens when settings button is clicked
- Location: tests/e2e/settings.spec.ts:20:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Target page, context or browser has been closed
Call log:
  - waiting for locator('button').filter({ has: locator('svg') }).nth(2)

```

# Test source

```ts
  1   | import { test, expect, type BrowserContext, type Page } from '@playwright/test';
  2   | import { launchExtension, getExtensionPage } from './helpers/extension';
  3   | 
  4   | let context: BrowserContext;
  5   | let page: Page;
  6   | 
  7   | test.beforeAll(async () => {
  8   |   context = await launchExtension();
  9   |   page = await getExtensionPage(context);
  10  | });
  11  | 
  12  | test.afterAll(async () => {
  13  |   await context.close();
  14  | });
  15  | 
  16  | // Ensure tests run serially since they share the same extension instance
  17  | test.describe.configure({ mode: 'serial' });
  18  | 
  19  | test.describe('Settings Panel', () => {
  20  |   test('opens when settings button is clicked', async () => {
  21  | 
  22  |     // Find and click the settings button (cog icon)
  23  |     const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
> 24  |     await settingsButton.click();
      |                          ^ Error: locator.click: Target page, context or browser has been closed
  25  | 
  26  |     // Settings panel should be visible
  27  |     const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  28  |     await expect(settingsPanel).toBeVisible();
  29  | 
  30  |     // Should have Settings title
  31  |     const title = page.locator('#settings-title');
  32  |     await expect(title).toHaveText('Settings');
  33  |   });
  34  | 
  35  |   test('closes when close button is clicked', async () => {
  36  | 
  37  |     // Open settings
  38  |     const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
  39  |     await settingsButton.click();
  40  | 
  41  |     const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  42  |     await expect(settingsPanel).toBeVisible();
  43  | 
  44  |     // Click close button (× button)
  45  |     const closeButton = page.locator('[role="dialog"] button').filter({ hasText: '×' });
  46  |     await closeButton.click();
  47  | 
  48  |     // Settings panel should be hidden
  49  |     await expect(settingsPanel).not.toBeVisible();
  50  |   });
  51  | 
  52  |   test('closes when backdrop is clicked', async () => {
  53  | 
  54  |     // Open settings
  55  |     const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
  56  |     await settingsButton.click();
  57  | 
  58  |     const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  59  |     await expect(settingsPanel).toBeVisible();
  60  | 
  61  |     // Click the backdrop (the overlay behind the panel)
  62  |     const backdrop = page.locator('[role="dialog"] > div').first();
  63  |     await backdrop.click({ position: { x: 10, y: 10 } });
  64  | 
  65  |     // Settings panel should be hidden
  66  |     await expect(settingsPanel).not.toBeVisible();
  67  |   });
  68  | 
  69  |   test('closes when ESC key is pressed', async () => {
  70  | 
  71  |     // Open settings
  72  |     const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
  73  |     await settingsButton.click();
  74  | 
  75  |     const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  76  |     await expect(settingsPanel).toBeVisible();
  77  | 
  78  |     // Press ESC
  79  |     await page.keyboard.press('Escape');
  80  | 
  81  |     // Settings panel should be hidden
  82  |     await expect(settingsPanel).not.toBeVisible();
  83  |   });
  84  | });
  85  | 
  86  | test.describe('Notification Settings', () => {
  87  |   test('toggles notification sound setting and persists', async () => {
  88  | 
  89  |     // Open settings
  90  |     const settingsButton = page.locator('button').filter({ has: page.locator('svg') }).nth(2);
  91  |     await settingsButton.click();
  92  | 
  93  |     const settingsPanel = page.locator('[role="dialog"][aria-labelledby="settings-title"]');
  94  |     await expect(settingsPanel).toBeVisible();
  95  | 
  96  |     // Find Pull Requests toggle
  97  |     const prLabel = page.locator('label').filter({ hasText: 'Pull Requests' });
  98  |     const prCheckbox = prLabel.locator('input[type="checkbox"]');
  99  | 
  100 |     // Get initial state
  101 |     const initialChecked = await prCheckbox.isChecked();
  102 | 
  103 |     // Toggle it
  104 |     await prCheckbox.click();
  105 | 
  106 |     // Should be in opposite state
  107 |     await expect(prCheckbox).toBeChecked({ checked: !initialChecked });
  108 | 
  109 |     // Close and reopen settings to verify persistence
  110 |     const closeButton = page.locator('[role="dialog"] button').filter({ hasText: '×' });
  111 |     await closeButton.click();
  112 | 
  113 |     await settingsButton.click();
  114 |     await expect(settingsPanel).toBeVisible();
  115 | 
  116 |     // Checkbox should still be in the toggled state
  117 |     const prCheckboxAfterReopen = page
  118 |       .locator('label')
  119 |       .filter({ hasText: 'Pull Requests' })
  120 |       .locator('input[type="checkbox"]');
  121 |     await expect(prCheckboxAfterReopen).toBeChecked({ checked: !initialChecked });
  122 | 
  123 |     // Toggle back to original state for cleanup
  124 |     await prCheckboxAfterReopen.click();
```