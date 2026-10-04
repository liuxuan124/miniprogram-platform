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
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 120)));

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
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('button,.el-button,a'))
      .find(e => /^编辑$/.test((e.textContent || '').trim()));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 5000));
  console.log('URL =', page.url());

  // 量测：① 右栏是否只剩预览 ② 发布设置是否在左栏正文下方 ③ AI 按钮是否在顶栏
  const m = await page.evaluate(() => {
    const aside = document.querySelector('.edit-aside');
    const asideKids = aside ? [...aside.children].map(c => c.className) : [];
    const main = document.querySelector('.editor-card');
    const pubInMain = !!(main && main.querySelector('.publish-panel'));
    const pubInAside = !!(aside && aside.querySelector('.publish-panel'));
    const aiBtn = Array.from(document.querySelectorAll('.edit-topbar__right button'))
      .some(b => /AI\s*辅助/.test(b.textContent || ''));
    const aiInline = !!document.querySelector('.edit-aside .ai-assist, .edit-aside [class*="ai-assist"]');
    // 发布设置在主栏里的位置：是否在 el-form 之后
    let afterForm = false;
    if (main) {
      const panel = main.querySelector('.publish-panel');
      const form = main.querySelector('form');
      if (panel && form) afterForm = panel.compareDocumentPosition(form) & Node.DOCUMENT_POSITION_PRECEDING ? false : true;
    }
    const asideW = aside ? Math.round(aside.getBoundingClientRect().width) : 0;
    return { asideKids, pubInMain, pubInAside, aiBtn, aiInline, afterForm, asideW };
  });
  console.log('METRICS =', JSON.stringify(m, null, 1));

  // 整页截图（首屏）
  await page.screenshot({ path: OUT + '/live-layout-top.png' });

  // 滚到发布设置
  await page.evaluate(() => {
    const p = document.querySelector('.editor-card .publish-panel');
    if (p) p.scrollIntoView({ block: 'start' });
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: OUT + '/live-layout-publish.png' });

  // 点 AI 辅助按钮
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const b = Array.from(document.querySelectorAll('.edit-topbar__right button'))
      .find(x => /AI\s*辅助/.test(x.textContent || ''));
    if (b) b.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  const aiOpen = await page.evaluate(() => !!(document.querySelector('.ai-dialog__title') && [...document.querySelectorAll('.el-dialog')].some(d=>d.offsetParent!==null)));
  console.log('ai dialog open =', aiOpen);
  await page.screenshot({ path: OUT + '/live-layout-ai.png' });

  await browser.close();
  console.log('DONE');
})();
