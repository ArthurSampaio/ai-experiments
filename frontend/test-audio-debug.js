const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Listen to console messages
  page.on('console', msg => {
    console.log('CONSOLE:', msg.type(), msg.text());
  });
  
  // Listen to page errors
  page.on('pageerror', err => {
    console.log('PAGE ERROR:', err.message);
  });
  
  console.log('Navigating to frontend...');
  await page.goto('http://localhost:5173', { timeout: 10000 });
  
  console.log('Waiting for page to load...');
  await page.waitForTimeout(3000);
  
  // Check for h1
  const h1 = await page.locator('h1').textContent();
  console.log('H1:', h1);
  
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
    
    // Wait a bit more for the src to be set
    await page.waitForTimeout(1000);
    
    // Get the outerHTML of audio to see all attributes
    const audioHtml = await page.locator('audio').evaluate(el => el.outerHTML);
    console.log('Audio HTML:', audioHtml);
    
    // Check audio state
    const audioState = await page.locator('audio').evaluate(el => ({
      paused: el.paused,
      src: el.src,
      currentTime: el.currentTime,
      readyState: el.readyState
    }));
    console.log('Audio state:', JSON.stringify(audioState));
    
    // Check if there's a blob URL
    if (audioState.src && audioState.src.startsWith('blob:')) {
      console.log('SUCCESS: Audio is using blob URL');
    }
    
  } catch (e) {
    console.log('ERROR:', e.message);
  }
  
  await browser.close();
  console.log('Done');
})();
