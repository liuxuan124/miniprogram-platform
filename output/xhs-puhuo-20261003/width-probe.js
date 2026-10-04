const puppeteer = require('puppeteer-core');
const fs = require('fs');
const JWT = fs.readFileSync('/tmp/_j.txt', 'utf8').trim();
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-puhuo-20261003';

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--font-render-hinting=none'] });
  const page = await b.newPage();
  await page.setViewport({ width: 1560, height: 1080, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((jwt) => {
    localStorage.setItem('access_token', jwt);
    localStorage.setItem('refresh_token', jwt);
    localStorage.setItem('admin-theme', 'warm');
  }, JWT);
  await page.goto('https://admin.zfculture.site/content/write?id=210&type=note', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise(r => setTimeout(r, 5000));

  const m = await page.evaluate(() => {
    const track = document.querySelector('.img-gallery__track');
    const item = document.querySelector('.el-form-item:has(.img-gallery)');
    const label = item?.querySelector('.el-form-item__label');
    const textArea = document.querySelector('textarea');
    const slide = document.querySelector('.img-gallery__slide');
    const r = (e) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
    return {
      labelW: label ? Math.round(label.getBoundingClientRect().width) : null,
      formItemW: r(item),
      trackW: r(track),
      trackLeft: track ? Math.round(track.getBoundingClientRect().x) : null,
      trackRight: track ? Math.round(track.getBoundingClientRect().right) : null,
      textArea: r(textArea),
      textAreaLeft: textArea ? Math.round(textArea.getBoundingClientRect().x) : null,
      textAreaRight: textArea ? Math.round(textArea.getBoundingClientRect().right) : null,
      slide: r(slide),
      windowW: window.innerWidth,
    };
  });
  console.log(JSON.stringify(m, null, 1));

  // 算：文本框右边界 - 轨道左边 = 可用宽度
  if (m.textAreaRight && m.trackLeft) console.log('ALIGN_GAP_TARGET =', m.textAreaRight - m.trackLeft);

  // 对齐断言
  const a = await page.evaluate(() => {
    const t = document.querySelector('.img-gallery__track');
    const ta = document.querySelector('textarea');
    const sl = document.querySelector('.img-gallery__slide');
    const rt = t.getBoundingClientRect(), ra = ta.getBoundingClientRect(), rs = sl.getBoundingClientRect();
    return {
      trackX: Math.round(rt.x), trackRight: Math.round(rt.right), trackW: Math.round(rt.width),
      taX: Math.round(ra.x), taRight: Math.round(ra.right), taW: Math.round(ra.width),
      slideW: Math.round(rs.width), slideH: Math.round(rs.height), ratio: +(rs.width/rs.height).toFixed(3),
      scrollable: t.scrollWidth > t.clientWidth, scrollW: t.scrollWidth, clientW: t.clientWidth,
    };
  });
  console.log('ALIGN =', JSON.stringify(a, null, 1));
  console.log('leftDelta  =', a.trackX - a.taX, '(期望 0)');
  console.log('rightDelta =', a.trackRight - a.taRight, '(期望 0)');

  await page.evaluate(() => { const g=document.querySelector('.img-gallery'); if(g) g.scrollIntoView({block:'center'}); });
  await new Promise(r => setTimeout(r, 800));
  await page.screenshot({ path: OUT + '/gallery-width.png' });
  console.log('SHOT gallery-width.png');

  await b.close();
})();
