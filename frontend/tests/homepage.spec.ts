import { test, expect } from '@playwright/test';

test('homepage shows the destination search and Plan button', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByPlaceholder('Where do you need to be?')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Plan' })).toBeVisible();
});
