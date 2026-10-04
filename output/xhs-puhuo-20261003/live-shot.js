const puppeteer = require('puppeteer-core');
const fs = require('fs');

const JWT = fs.readFileSync('/tmp/_j.txt', 'utf8').trim();
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/xhs-puhuo-20261003';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--font-render-hinting=none', '--window-size=1560,1000'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1560, height: 1000, deviceScaleFactor: 1 });

  page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text().slice(0, 160)); });
  page.on('pageerror', e => console.log('[pageerror]', String(e).slice(0, 160)));

  // 注入 token + warm 主题
  await page.evaluateOnNewDocument((jwt) => {
    localStorage.setItem('access_token', jwt);
    localStorage.setItem('refresh_token', jwt);
    localStorage.setItem('admin-theme', 'warm');
  }, JWT);

  // 走侧栏导航进笔记列表
  await page.goto('https://admin.zfculture.site/dashboard', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });
  await new Promise(r => setTimeout(r, 3500));

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.el-menu-item, .el-sub-menu__title, li, div'))
      .find(e => (e.textContent || '').trim() === '内容运营');
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 1200));

  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('.el-menu-item, a, li, span'))
      .find(e => /^笔记$/.test((e.textContent || '').trim()));
    if (el) el.click();
  });
  await new Promise(r => setTimeout(r, 4000));
  console.log('URL after nav =', page.url());

  // 点第一行「编辑」进编辑器
  const edited = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, .el-button, a'));
    const hit = btns.find(b => /^编辑$/.test((b.textContent || '').trim()));
    if (hit) { hit.click(); return true; }
    return false;
  });
  console.log('edited =', edited);
  await new Promise(r => setTimeout(r, 4500));
  console.log('URL after edit =', page.url());

  // 点预览按钮打开弹窗
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, .el-button, a'));
    const hit = btns.find(b => /预览/.test((b.textContent || '').trim()));
    if (hit) { hit.click(); return hit.textContent.trim().slice(0, 20); }
    return null;
  });
  console.log('clicked =', clicked);
  await new Promise(r => setTimeout(r, 3000));
  const has = await page.evaluate(() => {
    const cols = document.querySelectorAll('.preview-dialog__col');
    return { cols: cols.length };
  });
  console.log('dialog cols =', JSON.stringify(has));

  // 整视口截图（弹窗已居中，完整可见）
  await page.screenshot({ path: OUT + '/live-dialog-warm.png' });
  console.log('SHOT live-dialog-warm.png');

  await browser.close();
})();
