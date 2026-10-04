const puppeteer = require('puppeteer-core');
const fs = require('fs');

const JWT = fs.readFileSync('/tmp/_j.txt', 'utf8').trim();
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-puhuo-20261003';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1560, height: 1080, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 140)));

  await page.evaluateOnNewDocument((jwt) => {
    localStorage.setItem('access_token', jwt);
    localStorage.setItem('refresh_token', jwt);
    localStorage.setItem('admin-theme', 'warm');
  }, JWT);

  await page.goto('https://admin.zfculture.site/dashboard', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 3500));
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.el-menu-item,.el-sub-menu__title,li,div'))
      .find(e => (e.textContent || '').trim() === '内容运营');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.el-menu-item,a,li,span'))
      .find(e => /^笔记$/.test((e.textContent || '').trim()));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 5000));
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,.el-button,a'))
      .find(e => /^编辑$/.test((e.textContent || '').trim()));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 5000));
  console.log('URL =', page.url());

  const m = await page.evaluate(() => {
    const g = document.querySelector('.img-gallery');
    if (!g) return { gallery: false };
    const track = g.querySelector('.img-gallery__track');
    const slides = [...g.querySelectorAll('.img-gallery__slide')];
    const rects = slides.map(s => {
      const r = s.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height), ratio: +(r.width / r.height).toFixed(3) };
    });
    const img = slides[0]?.querySelector('img');
    return {
      gallery: true,
      slideCount: slides.length,
      rects,
      trackScrollable: track.scrollWidth > track.clientWidth,
      trackScrollW: track.scrollWidth,
      trackClientW: track.clientWidth,
      imgObjectFit: img ? getComputedStyle(img).objectFit : null,
      delBtn: !!g.querySelector('.img-gallery__del'),
      oldMoveBtns: document.querySelectorAll('.note-images__actions').length,
      addSameSize: (() => {
        const add = g.querySelector('.img-gallery__add');
        if (!add) return null;
        const r = add.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height) };
      })(),
    };
  });
  console.log('METRICS =', JSON.stringify(m, null, 1));

  // 滚到画廊
  await page.evaluate(() => {
    const g = document.querySelector('.img-gallery');
    if (g) g.scrollIntoView({ block: 'center' });
  });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + '/live-gallery.png' });

  // 模拟滚轮横向滑动，验证可拖拉
  const before = await page.evaluate(() => document.querySelector('.img-gallery__track').scrollLeft);
  await page.evaluate(() => {
    const t = document.querySelector('.img-gallery__track');
    t.scrollLeft += 400;
  });
  await new Promise(r => setTimeout(r, 600));
  const after = await page.evaluate(() => document.querySelector('.img-gallery__track').scrollLeft);
  console.log('scrollLeft', before, '->', after);
  await page.screenshot({ path: OUT + '/live-gallery-scrolled.png' });

  await browser.close();
  console.log('DONE');
})();
