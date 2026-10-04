const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DIR = __dirname;
const HTML = 'file://' + path.join(DIR, 'covers.html');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 1 });
  await page.goto(HTML, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));

  const ids = ['c1', 'c2', 'c3', 'c4', 'c5'];
  for (let i = 0; i < ids.length; i++) {
    const el = await page.$('#' + ids[i]);
    if (!el) { console.log('MISSING #' + ids[i]); continue; }
    const out = path.join(DIR, `puhuo-0${i + 1}.png`);
    await el.screenshot({ path: out });
    const sz = fs.statSync(out).size;
    console.log('OK', path.basename(out), (sz / 1024).toFixed(0) + 'KB');
  }

  // 拼接长图（4宫格对比用）
  await browser.close();
  console.log('DONE');
})();
