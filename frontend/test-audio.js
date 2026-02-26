const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to frontend...');
  await page.goto('http://localhost:5173', { timeout: 10000 });
  
  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);
  
  // Check if the page loaded correctly
  const title = await page.title();
  console.log('Title:', title);
  
  // Check for h1
  const h1 = await page.locator('h1').textContent();
  console.log('H1:', h1);
  
  // Check if audio element exists
  const audioExists = await page.locator('audio').count();
  console.log('Audio elements before generation:', audioExists);
  
  // Fill in text
  console.log('Filling in text...');
  await page.fill('.text-input', 'Hello world');
  
  // Click generate
  console.log('Clicking generate...');
  await page.click('.generate-btn');
  
  console.log('Waiting for audio to appear (this takes ~60s for model)...');
  
  try {
    await page.waitForSelector('audio', { timeout: 120000, state: 'visible' });
    console.log('Audio element appeared!');
    
    // Check if audio is visible
    const audioVisible = await page.locator('audio').isVisible();
    console.log('Audio visible:', audioVisible);
    
    // Check the src attribute
    const audioSrc = await page.locator('audio').getAttribute('src');
    console.log('Audio src:', audioSrc ? 'has src (blob URL)' : 'no src');
    
    if (audioSrc && audioSrc.startsWith('blob:')) {
      console.log('SUCCESS: Audio is using blob URL - should play in browser!');
    } else {
      console.log('ISSUE: Audio might be downloading instead of playing');
    }
    
  } catch (e) {
    console.log('ERROR waiting for audio:', e.message);
  }
  
  await browser.close();
  console.log('Done');
})();
