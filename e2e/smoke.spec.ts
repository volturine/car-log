import { expect, test } from '@playwright/test';

test('app boots with isolated test env', async ({ page }) => {
	await page.goto('/');

	await expect(page.getByRole('heading', { name: /track every repair/i })).toBeVisible();
	await expect(page.getByRole('link', { name: /get started/i })).toBeVisible();
});
