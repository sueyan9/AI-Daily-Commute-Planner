import { test, expect } from '@playwright/test';

// Grants the geolocation permission and fixes the location, so the app never
// hits its "permission denied" fallback state. Applies to every test in this
// file only (test.use scopes to the file/describe block it's called in).
test.use({
  geolocation: { latitude: -36.8485, longitude: 174.7633 }, // Auckland CBD
  permissions: ['geolocation'],
});

test('mocked geolocation lets the user proceed to planning', async ({ page }) => {
  let sawLocationAlert = false;
  page.on('dialog', async (dialog) => {
    if (dialog.message().includes('Current location is not available yet')) {
      sawLocationAlert = true;
    }
    await dialog.dismiss();
  });

  await page.goto('/');

  // Give the mocked geolocation callback a moment to resolve into React
  // state before we click — clicking too early would race the app into
  // thinking location isn't ready yet, even though permission was granted.
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Plan' }).click();
  await page.waitForTimeout(500);

  expect(sawLocationAlert).toBe(false);
});
