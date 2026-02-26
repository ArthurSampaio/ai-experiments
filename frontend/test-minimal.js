const { chromium } = require('playwright');

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  console.log('Navigating to frontend...');
  await page.goto('http://localhost:5173', { timeout: 10000 });
  
  console.log('Getting title...');
  const title = await page.title();
  console.log('Title:', title);
  
  await browser.close();
  console.log('Done');
})();
