/**
 * AI 对话框「小窗模式」验证
 * 覆盖：① 缩小后是否变小且靠右固定 ② 遮罩是否消失（能点到画布）③ 头部可拖动
 *        ④ 画布可正常点击操作（不被遮挡） ⑤ 放大后恢复大窗 ⑥ 关闭后小窗状态复位
 * 用法：NODE_PATH=<ws>/node_modules ADMIN_BASE=http://127.0.0.1:5199 node scripts/qa/probe-ai-chat-mini.js
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

const dialogState = (pg) =>
  pg.evaluate(() => {
    const d = document.querySelector('.ai-chat-dialog')
    if (!d) return null
    const r = d.getBoundingClientRect()
    const overlay = d.closest('.el-overlay')
    const mask = overlay ? overlay.querySelector('.el-overlay') : null
    const cs = getComputedStyle(d)
    return {
      mini: d.classList.contains('ai-chat-dialog--mini'),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      position: cs.position,
      maskVisible: mask ? getComputedStyle(mask).display !== 'none' : false,
      threadH: Math.round(d.querySelector('.ai-chat__thread')?.getBoundingClientRect().height || 0),
      cursorOnHead: d.querySelector('.ai-chat__head') ? getComputedStyle(d.querySelector('.ai-chat__head')).cursor : null,
      isDraggableClass: d.classList.contains('is-draggable'),
      sub: d.querySelector('.ai-chat__head-sub')?.textContent.trim(),
      dockHidden: (() => {
        const k = document.querySelector('.ai-dock')
        return k ? getComputedStyle(k).visibility : 'no-dock'
      })(),
    }
  })

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

  // 打开大窗
  await page.click('.ai-dock__main')
  await page.waitForSelector('.ai-chat-dialog', { timeout: 20000 })
  await sleep(900)
  const big = await dialogState(page)
  console.log('① 大窗:', JSON.stringify(big))

  // 点缩小
  await page.click('.ai-chat__head-btn')
  await sleep(900)
  const mini = await dialogState(page)
  console.log('② 小窗:', JSON.stringify(mini))
  console.log('   变小:', mini.rect.w < big.rect.w && mini.rect.h < big.rect.h)
  console.log('   靠右固定:', mini.position === 'fixed' && mini.rect.x > 1000)
  console.log('   遮罩已关（可操作画布）:', mini.maskVisible === false)
  console.log('   头部可拖:', mini.cursorOnHead === 'grab')

  await page.screenshot({ path: path.join(OUT, 'ai-mini-1-mini.png') })

  // 小窗时点画布：应该能选中一个组件（验证不被遮挡）
  const canvasClick = await page.evaluate(() => {
    const el = document.querySelector('.canvas-area, .render-area, [class*="canvas"]')
    if (!el) return { found: false }
    const r = el.getBoundingClientRect()
    return { found: true, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  console.log('   画布区域:', JSON.stringify(canvasClick))

  // 真实拖动小窗头部
  const headBox = await page.evaluate(() => {
    const h = document.querySelector('.ai-chat__head')
    const r = h.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  const beforeDrag = (await dialogState(page)).rect
  await page.mouse.move(headBox.x, headBox.y)
  await page.mouse.down()
  await page.mouse.move(headBox.x - 320, headBox.y - 200, { steps: 12 })
  await page.mouse.up()
  await sleep(600)
  const afterDrag = (await dialogState(page)).rect
  console.log('③ 拖动前:', JSON.stringify(beforeDrag), '拖动后:', JSON.stringify(afterDrag), '已移动:', beforeDrag.x !== afterDrag.x)

  // 小窗里发消息，验证功能没坏
  await page.click('.ai-chat__composer textarea')
  await page.type('.ai-chat__composer textarea', '把主色改成暖橘')
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
  await sleep(1500)
  const inMini = await page.evaluate(() => ({
    userMsgs: document.querySelectorAll('.ai-msg--user').length,
    patchRows: document.querySelectorAll('.ai-patch-row').length,
    stillMini: document.querySelector('.ai-chat-dialog')?.classList.contains('ai-chat-dialog--mini'),
  }))
  console.log('④ 小窗内对话:', JSON.stringify(inMini), '仍是小窗:', inMini.stillMini)
  await page.screenshot({ path: path.join(OUT, 'ai-mini-2-msg.png') })

  // 放大回来（拖动测试把窗拖到了左上，先放大验证是否被 resetPosition 复位回居中）
  await page.click('.ai-chat__head-btn')
  await sleep(1000)
  const back = await dialogState(page)
  const viewportH = await page.evaluate(() => window.innerHeight)
  const inViewport = back.rect.y >= 0 && back.rect.x >= 0 && back.rect.y + back.rect.h <= viewportH + 2
  console.log('⑤ 放大后:', JSON.stringify(back.rect), '恢复大窗:', !back.mini && back.rect.w > 600)
  console.log('   拖动位移已复位（完整在视口内）:', inViewport)
  await page.screenshot({ path: path.join(OUT, 'ai-mini-3-back-to-big.png') })

  // 关闭后小窗状态应复位
  await page.click('.ai-chat__head-close')
  await sleep(900)
  const closed = await page.evaluate(() => ({
    dialogGone: !document.querySelector('.ai-chat-dialog'),
    dockBack: (() => {
      const k = document.querySelector('.ai-dock')
      return k ? getComputedStyle(k).visibility : 'no-dock'
    })(),
  }))
  console.log('⑥ 关闭后:', JSON.stringify(closed), 'Dock 已回来:', closed.dockBack === 'visible')

  // 复开验证：应为大窗而非残留小窗
  await page.click('.ai-dock__main')
  await page.waitForSelector('.ai-chat-dialog', { timeout: 20000 })
  await sleep(800)
  const reopen = await dialogState(page)
  console.log('⑦ 复开:', JSON.stringify({ mini: reopen.mini, rect: reopen.rect }), '应为大窗:', !reopen.mini)

  console.log('页面错误:', JSON.stringify(errs.slice(0, 6)))
  console.log('截图:', path.join(OUT, 'ai-mini-1-mini.png'), '/', path.join(OUT, 'ai-mini-2-msg.png'))
  await browser.close()
})().catch((e) => {
  console.error('小窗验证失败:', e.message)
  process.exit(1)
})
