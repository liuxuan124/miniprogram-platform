/**
 * AI 悬浮按钮角标联动验证
 * 覆盖：① 生成建议后角标出现 ② 忽略一条角标 -1 ③ 应用一条角标 -1 ④ 全部清空后角标消失
 * 顺带验证「应用」是否真的改到 DSL（撤销可用）
 * 用法：NODE_PATH=<ws>/node_modules ADMIN_BASE=http://127.0.0.1:5199 node scripts/qa/probe-ai-fab-badge.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'http://127.0.0.1:5199'
const PAGE_ID = process.env.PAGE_ID || '29'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(i) {
  return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const now = Math.floor(Date.now() / 1000)
const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
const body = `${h}.${pl}`
const token = `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`

const snap = (pg) =>
  pg.evaluate(() => ({
    patchRows: document.querySelectorAll('.ai-patch-row').length,
    badge: document.querySelector('.ai-dock__badge')?.textContent.trim() || null,
  }))

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1050 },
  })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 140)))
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CONSOLE: ' + m.text().slice(0, 140))
  })

  await page.evaluateOnNewDocument((t) => localStorage.setItem('access_token', t), token)
  await page.goto(`${ADMIN}/page-builder/editor/${PAGE_ID}`, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {})
  await page.waitForSelector('.ai-dock__main', { timeout: 60000 })
  await sleep(3000)

  console.log('① 发送前:', JSON.stringify(await snap(page)))

  const before = await page.evaluate(() => ({
    name: document.querySelector('.builder-page-name')?.textContent.trim(),
  }))

  await page.click('.ai-dock__main')
  await page.waitForSelector('.ai-chat-dialog', { timeout: 20000 })
  await sleep(600)
  await page.click('.ai-chat__composer textarea')
  await page.type('.ai-chat__composer textarea', '把主色改成暖橘色')
  await page.click('.ai-chat__send')
  await page
    .waitForFunction(
      () => {
        const t = document.querySelectorAll('.ai-msg--ai .ai-msg__bubble')
        return t.length > 0 && !document.querySelector('.ai-msg__thinking')
      },
      { timeout: 120000, polling: 1000 },
    )
    .catch(() => {})
  await sleep(2000)
  const s1 = await snap(page)
  console.log('② 收到建议后:', JSON.stringify(s1), '角标应为建议数:', s1.patchRows > 0)

  // 忽略一条
  const dismissBtns = await page.$$('.ai-patch-row .el-button.is-text')
  if (dismissBtns[0]) await dismissBtns[0].click()
  await sleep(900)
  const s2 = await snap(page)
  console.log('③ 忽略一条后:', JSON.stringify(s2), '角标应 -1:', s2.patchRows === s1.patchRows - 1)

  // 应用一条（取第一个建议的「应用」）
  const applyBtns = await page.$$('.ai-patch-row .el-button--primary')
  if (applyBtns[0]) await applyBtns[0].click()
  await sleep(1300)
  const s3 = await snap(page)
  console.log('④ 应用一条后:', JSON.stringify(s3), '角标应再 -1:', s3.patchRows === s2.patchRows - 1)

  // 「应用全部」清空
  const allBtn = await page.evaluateHandle(() => {
    const bs = Array.from(document.querySelectorAll('.ai-patch-list__foot .el-button'))
    return bs.find((b) => b.textContent.includes('全部应用')) || null
  })
  if (allBtn && (await allBtn.jsonValue()) !== null) {
    await allBtn.asElement().click()
    await sleep(1500)
  }
  const s4 = await snap(page)
  console.log('⑤ 全部应用后:', JSON.stringify(s4), '角标应消失:', s4.badge === null && s4.patchRows === 0)

  const after = await page.evaluate(() => ({
    name: document.querySelector('.builder-page-name')?.textContent.trim(),
  }))
  console.log('应用前后页面名:', JSON.stringify({ before: before.name, after: after.name }))

  await page.screenshot({ path: path.join(OUT, 'ai-fab-7-applied.png') })

  // 撤销入口：已从建议列表移到独立撤销条，建议清空后仍应存在（直到撤销完）
  const undoState = await page.evaluate(() => ({
    undoBarExists: !!document.querySelector('.ai-chat__undo'),
    undoBtnExists: !!Array.from(document.querySelectorAll('.ai-chat__undo .el-button')).find((b) =>
      b.textContent.includes('撤销'),
    ),
    hint: document.querySelector('.ai-chat__undo-hint')?.textContent.trim() || null,
  }))
  console.log('⑤ 后撤销条状态:', JSON.stringify(undoState), '应仍可用:', undoState.undoBarExists && undoState.undoBtnExists)

  // 真点一次撤销，验证 DSL 回退
  const undoBtn2 = await page.evaluateHandle(() =>
    Array.from(document.querySelectorAll('.ai-chat__undo .el-button')).find((b) => b.textContent.includes('撤销')) || null,
  )
  if ((await undoBtn2.jsonValue()) !== null) {
    await undoBtn2.asElement().click()
    await sleep(1200)
    console.log('⑥ 撤销一次后:', JSON.stringify(await snap(page)))
  }

  console.log('页面错误:', JSON.stringify(errs.slice(0, 6)))
  console.log('截图:', path.join(OUT, 'ai-fab-7-applied.png'))
  await browser.close()
})().catch((e) => {
  console.error('角标验证失败:', e.message)
  process.exit(1)
})
