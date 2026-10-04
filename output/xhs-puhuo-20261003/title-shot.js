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
    const item = document.querySelector('.el-form-item');
    const input = document.querySelector('input[maxlength]');
    const count = document.querySelector('.el-input__count, .el-input__count-inner');
    const err = document.querySelector('.el-form-item__error');
    const cs = input ? getComputedStyle(input) : null;
    return {
      inputMaxlength: input?.getAttribute('maxlength'),
      valueLen: input?.value?.length,
      value: input?.value,
      countText: count?.textContent,
      countColor: count ? getComputedStyle(count).color : null,
      inputBorderColor: cs?.borderColor,
      errText: err?.textContent || null,
      over: (() => { const o = document.querySelector('.title-over'); return o ? { text: o.textContent.trim(), color: getComputedStyle(o).color, bg: getComputedStyle(o).backgroundColor } : null; })(),
      formItemClass: item?.className,
      hintTexts: [...document.querySelectorAll('.field-hint')].map(e => e.textContent.trim()).slice(0, 4),
    };
  });
  console.log(JSON.stringify(m, null, 1));

  // 模拟超限：把标题改成 40 字
  await page.evaluate(() => {
    const i = document.querySelector('input[maxlength]');
    if (i) {
      i.removeAttribute('maxlength');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      setter.call(i, '超长标题测试'.repeat(6));
      i.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 900));
  const m2 = await page.evaluate(() => {
    const i = document.querySelector('input[maxlength]');
    const o = document.querySelector('.title-over');
    const c = document.querySelector('.el-input__count, .el-input__count-inner');
    return {
      valueLen: i?.value?.length,
      countText: c?.textContent,
      countColor: c ? getComputedStyle(c).color : null,
      over: o ? { text: o.textContent.trim(), color: getComputedStyle(o).color, bg: getComputedStyle(o).backgroundColor } : null,
    };
  });
  console.log('OVER-STATE =', JSON.stringify(m2, null, 1));
  const el2 = await page.$('.editor-card');
  if (el2) await el2.screenshot({ path: OUT + '/title-over.png' });

  const el = await page.$('.editor-card');
  if (el) { await el.screenshot({ path: OUT + '/title-state.png' }); console.log('SHOT title-state.png'); }
  await b.close();
})();
