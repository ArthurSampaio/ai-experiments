const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen to network requests
  page.on('request', req => {
    if (req.url().includes('/tts')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });
  
  page.on('response', res => {
    if (res.url().includes('/tts')) {
      console.log('RESPONSE:', res.status(), res.headers()['content-type']);
    }
  });
  
  // Listen to console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  
  console.log('Navigating to frontend...');
  await page.goto('http://localhost:5173', { timeout: 10000 });
  await page.waitForTimeout(3000);
  
  // Fill in text
  await page.fill('.text-input', 'Hello');
  
  // Click generate
  console.log('Clicking generate...');
  await page.click('.generate-btn');
  
  // Wait for either error or audio
  console.log('Waiting...');
  
  let audioAppeared = false;
  try {
    await page.waitForSelector('audio', { timeout: 120000, state: 'visible' });
    audioAppeared = true;
  } catch (e) {
    console.log('Audio did not appear');
  }
  
  if (audioAppeared) {
    await page.waitForTimeout(2000);
    const audioSrc = await page.locator('audio').evaluate(el => el.src);
    console.log('Audio src after waiting:', audioSrc);
  }
  
  // Check error banner
  const errorVisible = await page.locator('.error-banner').isVisible().catch(() => false);
  if (errorVisible) {
    const errorText = await page.locator('.error-banner').textContent();
    console.log('Error banner:', errorText);
  }
  
  await browser.close();
})();
