const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle0' });
  
  await page.keyboard.down('Control');
  await page.keyboard.press('k');
  await page.keyboard.up('Control');
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.type('Add spreadsheet');
  await new Promise(r => setTimeout(r, 500));
  await page.keyboard.press('Enter');
  await page.waitForSelector('.fortune-fx-editor', { timeout: 10000 });
  
  const data = await page.evaluate(() => {
    const fxInputContainer = document.querySelector('.fortune-fx-input-container');
    const locationBox = document.querySelector('.fortune-fx-editor > div:first-child');
    const sheetTab = document.querySelector('.fortune-sheettab-container-c');
    const sheetTabScroll = document.querySelector('.fortune-sheettab-scroll');
    const sheetTabButton = document.querySelector('.fortune-sheettab-button');
    
    return {
      fxInputContainer: fxInputContainer ? {
        className: fxInputContainer.className,
        computedBg: window.getComputedStyle(fxInputContainer).backgroundColor
      } : 'not found',
      locationBox: locationBox ? {
        className: locationBox.className,
        computedBg: window.getComputedStyle(locationBox).backgroundColor
      } : 'not found',
      sheetTabScroll: sheetTabScroll ? {
        className: sheetTabScroll.className,
        computedBg: window.getComputedStyle(sheetTabScroll).backgroundColor
      } : 'not found',
      sheetTabButton: sheetTabButton ? {
        className: sheetTabButton.className,
        computedBg: window.getComputedStyle(sheetTabButton).backgroundColor
      } : 'not found',
    };
  });
  
  console.log(JSON.stringify(data, null, 2));
  await browser.close();
})();
