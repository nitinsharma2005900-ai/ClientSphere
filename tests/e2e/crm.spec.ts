import { test, expect, Page } from '@playwright/test';

async function login(page: Page, role = 'admin') {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill(`${role}@clientsphere.io`);
  await page.getByLabel('Password', { exact: true }).fill('Password123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sales Intelligence Hub' })).toBeVisible();
}

test('Swagger documentation loads through the same-origin proxy without redirect loops', async ({ page }) => {
  const response = await page.goto('/api/v1/docs/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('.swagger-ui .info .title')).toContainText('ClientSphere');
});

test('all major pages render with successful API responses and no browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.url().includes('/api/v1') && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await login(page);
  for (const route of ['/leads', '/contacts', '/companies', '/opportunities', '/activities', '/tasks', '/imports', '/workflows', '/integrations', '/analytics', '/audit-logs']) {
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  await page.screenshot({ path: 'test-results/analytics-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('creates a contact and an opportunity through the UI', async ({ page }) => {
  await login(page);
  const stamp = Date.now();
  await page.goto('/contacts');
  await page.getByRole('button', { name: 'New contact', exact: true }).click();
  const dialog = page.getByRole('form', { name: 'New contact' });
  await dialog.getByLabel('First name', { exact: true }).fill('Browser');
  await dialog.getByLabel('Last name', { exact: true }).fill(`Verified${stamp}`);
  await dialog.getByLabel('Email', { exact: true }).fill(`browser-${stamp}@example.com`);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`browser-${stamp}@example.com`, { exact: true })).toBeVisible();
  await page.goto('/opportunities');
  await page.getByRole('button', { name: 'New opportunity', exact: true }).click();
  const deal = page.getByRole('form', { name: 'New opportunity' });
  await deal.getByLabel('Deal title').fill(`Browser deal ${stamp}`);
  await deal.getByLabel('Value (USD)').fill('5000');
  await deal.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Browser deal ${stamp}`, { exact: true })).toBeVisible();
});

test('imports CSV in the browser and downloads a valid forecast PDF', async ({ page }) => {
  await login(page);
  await page.goto('/imports');
  const stamp = Date.now();
  await page.locator('#csv-file-input').setInputFiles({ name: 'browser.csv', mimeType: 'text/csv', buffer: Buffer.from(`firstName,lastName,email,companyName\nBrowser,Import,browser-import-${stamp}@example.com,"Quoted, Company"\n`) });
  await page.getByRole('button', { name: 'Start Ingestion Pipeline' }).click();
  await expect(page.getByText('Ingestion & Deduplication Report', { exact: true })).toBeVisible();
  await page.goto('/analytics');
  const response = page.waitForResponse(response => response.url().endsWith('/analytics/forecast/pdf'));
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download forecast PDF' }).click();
  const pdf = await response;
  expect(pdf.status()).toBe(200);
  expect((await pdf.body()).subarray(0,5).toString()).toBe('%PDF-');
  expect((await download).suggestedFilename()).toBe('clientsphere-sales-forecast.pdf');
});

test('all five roles log in and the representative cannot read audit logs', async ({ page }) => {
  for (const role of ['admin', 'manager', 'rep', 'marketing', 'support']) {
    await login(page, role);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  }
  await login(page, 'rep');
  await page.goto('/audit-logs');
  await expect(page.getByText('Access Restricted (RBAC)', { exact: true })).toBeVisible();
});

test('mobile layout and keyboard command palette remain usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.keyboard.press('Control+k');
  await expect(page.getByPlaceholder(/Search commands/)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.screenshot({ path: 'test-results/dashboard-mobile.png', fullPage: true });
});
