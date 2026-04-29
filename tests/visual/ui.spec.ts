import { test, expect, type Page } from '@playwright/test';

const waitForStableUI = async (page: Page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
};

test('home page visual baseline', async ({ page }) => {
  await page.goto('/');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
});

test('replay page visual baseline', async ({ page }) => {
  await page.goto('/replay');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('replay-page.png', { fullPage: true });
});

test('pitwall page visual baseline', async ({ page }) => {
  await page.goto('/pitwall');
  await waitForStableUI(page);
  await expect(page).toHaveScreenshot('pitwall-page.png', { fullPage: true });
});
