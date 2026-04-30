import { test, expect, type Page } from '@playwright/test';

const waitForStableUI = async (page: Page) => {
  await page.waitForLoadState('domcontentloaded');
  await page.locator('body').waitFor({ state: 'visible' });
  await page.waitForTimeout(1200);
};

test('home page visual baseline', async ({ page }) => {
  await page.goto('/');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('home-page.png');
});

test('replay page visual baseline', async ({ page }) => {
  await page.goto('/replay');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('replay-page.png');
});

test('pitwall page visual baseline', async ({ page }) => {
  await page.goto('/pitwall');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('pitwall-page.png');
});
