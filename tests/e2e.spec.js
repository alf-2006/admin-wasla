const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:8080/');
});

test.describe('Sanitization and Unit-like tests in browser', () => {

  test('Input sanitization logic works (XSS prevention)', async ({ page }) => {
    // Tests the built in sanitizeInput function
    const sanitized = await page.evaluate(() => {
      if (typeof window.sanitizeInput === 'function') {
        return window.sanitizeInput('<script>alert(1)</script>');
      }
      return null;
    });
    expect(sanitized).toBe('&lt;script&gt;alert(1)&lt;&#x2F;script&gt;');
  });

  test('Members data structure and defaults', async ({ page }) => {
    const normalized = await page.evaluate(() => {
       if (typeof window.normalizeMember === 'function') {
          return window.normalizeMember({ id: 99, fullName: "Test" });
       }
       return null;
    });
    expect(normalized.fullName).toBe('Test');
    expect(normalized.team).toBe('Wasla');
    expect(normalized.hasLaptop).toBe(true); // default
  });

});

test.describe('Basic DOM Elements Presence', () => {

  test('Login screen is present', async ({ page }) => {
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

});
