const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  console.log('Navigating to local dev server...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  console.log('Opening Spotlight...');
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Typing Spreadsheet...');
  await page.keyboard.type('Add spreadsheet');
  
  await new Promise(r => setTimeout(r, 500));
  
  console.log('Pressing Enter...');
  await page.keyboard.press('Enter');
  
  console.log('Waiting for formula bar...');
  await page.waitForSelector('.fortune-fx-editor', { timeout: 10000 }).catch(e => console.log('Timeout waiting for fortune-fx-editor'));
  
  // Check classes and styles
  const data = await page.evaluate(() => {
    const fx = document.querySelector('.fortune-fx-editor');
    const tabs = document.querySelector('.fortune-sheettab-container');
    const headers = document.querySelectorAll('.fortune-col-header, .fortune-row-header');
    
    const res = {
      fxEditor: fx ? {
        className: fx.className,
        parentClass: fx.parentElement ? fx.parentElement.className : null,
        computedBg: window.getComputedStyle(fx).backgroundColor,
        computedColor: window.getComputedStyle(fx).color
      } : 'not found',
      tabs: tabs ? {
        className: tabs.className,
        computedBg: window.getComputedStyle(tabs).backgroundColor
      } : 'not found',
      headers: Array.from(headers).map(h => ({
        className: h.className,
        computedBg: window.getComputedStyle(h).backgroundColor,
        computedColor: window.getComputedStyle(h).color
      })).slice(0, 5), // just a few
      wrapper: document.querySelector('.fortune-sheet-container') ? document.querySelector('.fortune-sheet-container').className : false,
      isDarkMode: document.documentElement.getAttribute('data-mantine-color-scheme') === 'dark'
    };
    return res;
  });
  
  console.log(JSON.stringify(data, null, 2));
  
  await page.screenshot({ path: '/home/eren/dev/frEES/local_screenshot.png' });
  console.log('Screenshot saved to /home/eren/dev/frEES/local_screenshot.png');
  
  await browser.close();
})();
