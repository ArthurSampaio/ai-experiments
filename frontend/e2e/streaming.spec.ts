import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('TTS Streaming', () => {
  test('should stream audio via API', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/stream`, {
      data: {
        text: 'Hello',
        speaker: 'Ryan',
        language: 'English',
        speed: 1.0,
        pitch: 1.0,
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('audio/wav');
    expect(response.headers()['transfer-encoding']).toBe('chunked');
  });

  test('should return 400 for invalid speaker', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/stream`, {
      data: {
        text: 'Hello',
        speaker: 'InvalidSpeaker',
        language: 'English',
        speed: 1.0,
        pitch: 1.0,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should return 400 for invalid language', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/stream`, {
      data: {
        text: 'Hello',
        speaker: 'Ryan',
        language: 'InvalidLanguage',
        speed: 1.0,
        pitch: 1.0,
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should return 400 for empty text', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/stream`, {
      data: {
        text: '',
        speaker: 'Ryan',
        language: 'English',
        speed: 1.0,
        pitch: 1.0,
      },
    });

    expect(response.status()).toBe(400);
  });
});

test.describe('TTS Streaming UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
  });

  test('should show stream button', async ({ page }) => {
    await page.waitForTimeout(3000);
    const streamBtn = page.locator('.stream-btn');
    await expect(streamBtn).toBeVisible();
  });

  test('should disable stream button when no text', async ({ page }) => {
    await page.waitForTimeout(3000);
    const streamBtn = page.locator('.stream-btn');
    await expect(streamBtn).toBeDisabled();
  });

  test('should enable stream button when text entered', async ({ page }) => {
    await page.waitForTimeout(3000);
    const textInput = page.locator('.text-input');
    await textInput.fill('Hello world');
    
    const streamBtn = page.locator('.stream-btn');
    await expect(streamBtn).toBeEnabled();
  });
});
