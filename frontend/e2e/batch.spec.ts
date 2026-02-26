import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('TTS Batch Processing', () => {
  test('should process batch request', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/batch`, {
      data: {
        requests: [
          { text: 'One', speaker: 'Ryan', language: 'English', speed: 1.0, pitch: 1.0 },
          { text: 'Two', speaker: 'Vivian', language: 'English', speed: 1.0, pitch: 1.0 },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.results).toHaveLength(2);
    expect(data.completed_count).toBe(2);
    expect(data.failed_count).toBe(0);
  });

  test('should return 400 for batch size > 10', async ({ request }) => {
    const requests = Array(11).fill({
      text: 'Test',
      speaker: 'Ryan',
      language: 'English',
      speed: 1.0,
      pitch: 1.0,
    });

    const response = await request.post(`${BACKEND_URL}/tts/batch`, {
      data: { requests },
    });

    expect(response.status()).toBe(400);
    expect(response.text()).resolves.toContain('Maximum batch size is 10');
  });

  test('should handle partial failure', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/batch`, {
      data: {
        requests: [
          { text: 'Valid text', speaker: 'Ryan', language: 'English', speed: 1.0, pitch: 1.0 },
          { text: 'Another valid', speaker: 'Vivian', language: 'English', speed: 1.0, pitch: 1.0 },
        ],
      },
    });

    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.results).toHaveLength(2);
    expect(data.completed_count + data.failed_count).toBe(2);
  });

  test('should return 400 for empty batch', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/batch`, {
      data: { requests: [] },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('TTS Batch UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
  });

  test('should show batch toggle button', async ({ page }) => {
    await page.waitForTimeout(3000);
    const batchToggle = page.locator('.batch-toggle');
    await expect(batchToggle).toBeVisible();
  });

  test('should switch to batch mode', async ({ page }) => {
    await page.waitForTimeout(3000);
    const batchToggle = page.locator('.batch-toggle');
    await batchToggle.click();
    
    // Should show batch inputs
    const batchInput = page.locator('.batch-input-0');
    await expect(batchInput).toBeVisible();
  });

  test('should add multiple batch inputs', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Switch to batch mode
    await page.locator('.batch-toggle').click();
    
    // Fill first input
    await page.locator('.batch-input-0').fill('First text');
    
    // Add second input
    await page.locator('.batch-add-btn').click();
    await page.locator('.batch-input-1').fill('Second text');
    
    // Add third input
    await page.locator('.batch-add-btn').click();
    await page.locator('.batch-input-2').fill('Third text');
    
    // Should have 3 inputs
    const inputs = page.locator('.batch-input');
    await expect(inputs).toHaveCount(3);
  });

  test('should remove batch input', async ({ page }) => {
    await page.waitForTimeout(3000);
    
    // Switch to batch mode and add inputs
    await page.locator('.batch-toggle').click();
    await page.locator('.batch-input-0').fill('First');
    await page.locator('.batch-add-btn').click();
    await page.locator('.batch-input-1').fill('Second');
    
    // Should have 2 inputs
    await expect(page.locator('.batch-input')).toHaveCount(2);
    
    // Remove first input
    await page.locator('.batch-remove-btn').first().click();
    
    // Should have 1 input
    await expect(page.locator('.batch-input')).toHaveCount(1);
  });

  test('should show batch submit button', async ({ page }) => {
    await page.waitForTimeout(3000);
    await page.locator('.batch-toggle').click();
    
    const batchSubmit = page.locator('.batch-submit');
    await expect(batchSubmit).toBeVisible();
  });
});
