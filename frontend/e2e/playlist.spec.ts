import { test, expect, type Page } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8000';
const FRONTEND_URL = 'http://localhost:5173';

test.describe('Audio Playlist Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(FRONTEND_URL);
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
  });

  test.describe('with backend running', () => {
    test('should display empty playlist initially', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Check playlist header exists
      const playlistHeader = page.locator('.playlist-header h3');
      await expect(playlistHeader).toContainText('Playlist');
      
      // Check empty state message
      const emptyState = page.locator('.playlist-empty');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText('No audio generated yet');
      
      // Check count shows 0
      const playlistCount = page.locator('.playlist-count');
      await expect(playlistCount).toContainText('0 items');
    });

    test('should add generated audio to playlist', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate first audio
      const textInput = page.locator('.text-input');
      await textInput.fill('Hello world test one');
      
      const generateBtn = page.locator('.generate-btn');
      await generateBtn.click();
      
      // Wait for generation and check playlist updates
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      await expect(page.locator('.playlist-count')).toContainText('1 item');
      
      // Check track info
      const trackTitle = page.locator('.track-title').first();
      await expect(trackTitle).toContainText('Hello world test one');
    });

    test('should add multiple audios to playlist in order', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate first audio
      await page.locator('.text-input').fill('First message');
      await page.locator('.generate-btn').click();
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      
      // Generate second audio with different voice
      await page.locator('#speaker').selectOption('Vivian');
      await page.locator('.text-input').fill('Second message');
      await page.locator('.generate-btn').click();
      await expect(page.locator('.playlist-track')).toHaveCount(2, { timeout: 120000 });
      
      // Generate third audio with different language
      await page.locator('#language').selectOption('Chinese');
      await page.locator('.text-input').fill('Third message');
      await page.locator('.generate-btn').click();
      await expect(page.locator('.playlist-track')).toHaveCount(3, { timeout: 120000 });
      
      // Verify order - newest first
      const tracks = page.locator('.track-title');
      await expect(tracks.nth(0)).toContainText('Third message');
      await expect(tracks.nth(1)).toContainText('Second message');
      await expect(tracks.nth(2)).toContainText('First message');
    });

    test('should display correct metadata in playlist', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate audio with known settings
      await page.locator('#speaker').selectOption('Ryan');
      await page.locator('#language').selectOption('English');
      await page.locator('.text-input').fill('Testing metadata display');
      await page.locator('.generate-btn').click();
      
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      
      // Check speaker and language are displayed
      const trackSpeaker = page.locator('.track-speaker').first();
      const trackLanguage = page.locator('.track-language').first();
      
      await expect(trackSpeaker).toContainText('Ryan');
      await expect(trackLanguage).toContainText('English');
    });

    test('should play audio when clicking playlist item', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate an audio first
      await page.locator('.text-input').fill('Click test audio');
      await page.locator('.generate-btn').click();
      
      // Wait for audio to be generated and added to playlist
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      
      // Get initial audio player state
      const audioPlayer = page.locator('audio');
      
      // Click on the playlist track
      await page.locator('.playlist-track').first().click();
      
      // Audio should start playing
      await page.waitForTimeout(500);
      const isPlaying = await audioPlayer.evaluate(async (audio: HTMLAudioElement) => {
        return !audio.paused && audio.currentTime > 0;
      });
      expect(isPlaying).toBe(true);
    });

    test('should delete audio from playlist', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate audio
      await page.locator('.text-input').fill('Delete test audio');
      await page.locator('.generate-btn').click();
      
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      await expect(page.locator('.playlist-count')).toContainText('1 item');
      
      // Hover over the track to show delete button
      await page.locator('.playlist-track').hover();
      
      // Click delete button
      const deleteBtn = page.locator('.track-delete');
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();
      
      // Verify track is removed
      await expect(page.locator('.playlist-track')).not.toBeVisible();
      await expect(page.locator('.playlist-count')).toContainText('0 items');
    });

    test('should highlight currently playing track', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate audio
      await page.locator('.text-input').fill('Playing highlight test');
      await page.locator('.generate-btn').click();
      
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      
      // Check that the first track has playing class
      const firstTrack = page.locator('.playlist-track').first();
      await expect(firstTrack).toHaveClass(/playing/);
      
      // Check playing indicator is visible
      const playingIndicator = firstTrack.locator('.playing-indicator');
      await expect(playingIndicator).toBeVisible();
    });

    test('should persist playlist across page reloads', async ({ page }) => {
      await page.waitForTimeout(3000);
      
      // Generate audio
      await page.locator('.text-input').fill('Persistence test audio');
      await page.locator('.generate-btn').click();
      
      await expect(page.locator('.playlist-track')).toBeVisible({ timeout: 120000 });
      
      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
      
      // Check playlist still has the item
      await expect(page.locator('.playlist-track')).toBeVisible();
      await expect(page.locator('.track-title')).toContainText('Persistence test audio');
    });
  });
});
