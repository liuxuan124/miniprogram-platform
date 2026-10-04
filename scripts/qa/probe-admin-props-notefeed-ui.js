/**
 * 管理端装修器 页29 笔记瀑布流 PropsPanel 视觉验证
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-props-notefeed-ui.js [baseUrl]
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.argv[2] || 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }
  const body = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  const sig = crypto.createHmac('sha256', secret).update(body).digest()
  return `${body}.${b64u(sig)}`
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const token = signJwt(secret)
  console.log('JWT 已签发')

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1680, height: 1180 },
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((t) => {
    localStorage.setItem('access_token', t)
  }, token)

  const url = `${ADMIN}/page-builder/editor/29`
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
  } catch (e) {
    console.log('goto 超时容忍:', e.message)
  }

  const ok = await page
    .waitForSelector('.render-note-feed', { timeout: 45000 })
    .then(() => true)
    .catch(() => false)
  console.log('render-note-feed 出现:', ok)
  await sleep(2500)

  // 点击画布中的笔记瀑布流组件以选中它
  await page.evaluate(() => {
    const el = document.querySelector('.render-note-feed')
    if (!el) return
    const target = el.closest('[class*="wrapper"], [draggable]') || el
    target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }))
  })
  await sleep(1500)

  // 若未选中，兜底：直接在画布里找可点击容器再点一次（点击组件内部空白处）
  const selected = await page.evaluate(() => {
    const panel = document.querySelector('.props-panel')
    return panel ? panel.textContent.slice(0, 200) : ''
  })
  console.log('PropsPanel 摘要:', selected.slice(0, 120))

  if (!selected.includes('内容类型大 Tab')) {
    await page.evaluate(() => {
      const el = document.querySelector('.render-note-feed')
      if (!el) return
      const rect = el.getBoundingClientRect()
      const evt = (x, y) =>
        new MouseEvent('click', { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y })
      el.dispatchEvent(evt(rect.left + 10, rect.top + rect.height - 20))
    })
    await sleep(1500)
  }

  const chips = await page.evaluate(() => {
    const panel = document.querySelector('.props-panel')
    if (!panel) return { found: false }
    const items = Array.from(panel.querySelectorAll('.type-tabs__item'))
    return {
      found: true,
      tabCards: items.length,
      chips: panel.querySelectorAll('.chip').length,
      chipsOn: panel.querySelectorAll('.chip--on').length,
      rows: panel.querySelectorAll('.type-tabs__row').length,
    }
  })
  console.log('芯片统计:', JSON.stringify(chips))

  // 截整页 + 截右栏面板
  await page.screenshot({ path: path.join(OUT, 'props-notefeed-full.png'), fullPage: false })
  const panelEl = await page.$('.props-panel')
  if (panelEl) {
    await panelEl.screenshot({ path: path.join(OUT, 'props-notefeed-panel.png') })
    console.log('面板截图已存 props-notefeed-panel.png')
  }
  console.log('整页截图已存 props-notefeed-full.png')
  await browser.close()
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
