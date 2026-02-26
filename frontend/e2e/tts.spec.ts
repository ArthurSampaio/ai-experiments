import { test, expect, type Page } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Qwen TTS Web Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
  });

  test('should load the page with title', async ({ page }) => {
    await expect(page).toHaveTitle(/Vite \+ React/);
    await expect(page.locator('h1')).toContainText('Qwen TTS');
  });

  test('should show connection error when backend is not running', async ({ page }) => {
    // Wait a bit for the API call to fail
    await page.waitForTimeout(2000);
    const errorBanner = page.locator('.error-banner');
    await expect(errorBanner).toBeVisible();
    await expect(errorBanner).toContainText('Failed to connect to backend');
  });

  test.describe('with backend running', () => {
    test('should load speakers and languages from API', async ({ page }) => {
      // Wait for API to respond
      await page.waitForTimeout(3000);
      
      // Check language selector has options
      const languageSelect = page.locator('#language');
      await expect(languageSelect).toBeVisible();
      const languageOptions = languageSelect.locator('option');
      await expect(languageOptions).toHaveCount(10); // 10 languages
      
      // Check speaker selector has options
      const speakerSelect = page.locator('#speaker');
      await expect(speakerSelect).toBeVisible();
      const speakerOptions = speakerSelect.locator('option');
      await expect(speakerOptions).toHaveCount(9); // 9 speakers
    });

    test('should generate speech and show audio player', async ({ page }) => {
      // Wait for API to load
      await page.waitForTimeout(3000);
      
      // Set up intercept to verify no Content-Disposition: attachment header
      let ttsResponseHeaders: Record<string, string> = {};
      await page.route('**/tts', async (route) => {
        const response = await route.fetch();
        ttsResponseHeaders = response.headers();
        await route.fulfill({ response });
      });
      
      // Enter text
      const textInput = page.locator('.text-input');
      await expect(textInput).toBeVisible();
      await textInput.fill('Hello, this is a test.');
      
      // Click generate button
      const generateBtn = page.locator('.generate-btn');
      await expect(generateBtn).toBeEnabled();
      await generateBtn.click();
      
      // Wait for generation to complete
      await page.waitForTimeout(15000); // TTS takes time
      
      // Check audio player appears
      const audioPlayer = page.locator('audio');
      await expect(audioPlayer).toBeVisible();
      
      // Check download button appears
      const downloadBtn = page.locator('.download-btn');
      await expect(downloadBtn).toBeVisible();
      
      // Verify download is NOT triggered (no Content-Disposition: attachment)
      const contentDisposition = ttsResponseHeaders['content-disposition'] || '';
      expect(contentDisposition).not.toContain('attachment');
    });

    test('should update settings summary when changing controls', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Change language
      await page.locator('#language').selectOption('Chinese');
      await expect(page.locator('.setting-value').first()).toContainText('Chinese');
      
      // Change speaker
      await page.locator('#speaker').selectOption('Vivian');
      await expect(page.locator('.setting-value').first()).toContainText('Vivian');
    });

    test('should validate empty text input', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Try to click generate without text
      const generateBtn = page.locator('.generate-btn');
      await expect(generateBtn).toBeDisabled();
    });
  });
});

test.describe('Backend API', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('should return speakers list', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/v1/speakers`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('speakers');
    expect(data.speakers).toContain('Ryan');
  });

  test('should return languages list', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/v1/languages`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data).toHaveProperty('languages');
    expect(data.languages).toContain('English');
  });

  test('should generate speech via TTS endpoint', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts`, {
      data: {
        text: 'Hello world',
        speaker: 'Ryan',
        language: 'English',
        speed: 1.0,
        pitch: 1.0,
      },
    });
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('audio/wav');
    // Verify audio streams (no Content-Disposition: attachment)
    const contentDisposition = response.headers()['content-disposition'] || '';
    expect(contentDisposition).not.toContain('attachment');
  });

  test('should stream audio via TTS/stream endpoint', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/stream`, {
      data: {
        text: 'Hello',
        speaker: 'Ryan',
        language: 'English',
        speed: 1.0,
        pitch: 1.0,
      },
    });
    expect(response.ok()).toBeTruthy();
    expect(response.headers()['content-type']).toContain('audio/wav');
    expect(response.headers()['transfer-encoding']).toBe('chunked');
  });

  test('should handle batch request via TTS/batch endpoint', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/tts/batch`, {
      data: {
        requests: [
          { text: 'One', speaker: 'Ryan', language: 'English', speed: 1.0, pitch: 1.0 },
          { text: 'Two', speaker: 'Vivian', language: 'English', speed: 1.0, pitch: 1.0 },
        ],
      },
    });
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.results).toHaveLength(2);
    expect(data.completed_count).toBe(2);
  });
});
});
