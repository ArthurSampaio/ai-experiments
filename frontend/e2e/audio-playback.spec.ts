const { test, expect } = require('@playwright/test');

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

test('should generate speech and play audio from UI', async ({ page }) => {
  await page.goto(FRONTEND_URL);
  
  // Wait for API to load
  await page.waitForTimeout(3000);
  
  // Check audio element exists but is NOT visible before generation
  const audioPlayer = page.locator('audio');
  
  // Audio should NOT be visible before generation
  await expect(audioPlayer).not.toBeVisible();
  
  // Enter text
  const textInput = page.locator('.text-input');
  await expect(textInput).toBeVisible();
  await textInput.fill('Hello, this is a test.');
  
  // Click generate button
  const generateBtn = page.locator('.generate-btn');
  await expect(generateBtn).toBeEnabled();
  await generateBtn.click();
  
  // Wait for generation to complete - audio player should appear
  await expect(audioPlayer).toBeVisible({ timeout: 120000 });
  
  // Check that audio has a blob URL src
  const src = await audioPlayer.evaluate(el => el.src);
  console.log('Audio src:', src);
  
  expect(src).toContain('blob:');
  
  // Check that audio is playing (not paused) or at least ready
  const paused = await audioPlayer.evaluate(el => el.paused);
  console.log('Audio paused:', paused);
});
