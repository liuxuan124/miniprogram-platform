/**
 * 管理端装修器 页29 笔记瀑布流渲染验证
 * 用法：NODE_PATH=<workspace>/node_modules node scripts/qa/probe-admin-editor-notefeed.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'https://admin.zfculture.site'
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

  // 等渲染器出现
  const ok = await page
    .waitForSelector('.render-note-feed', { timeout: 45000 })
    .then(() => true)
    .catch(() => false)
  console.log('render-note-feed 出现:', ok)

  await sleep(3000)

  const info = await page.evaluate(() => {
    const root = document.querySelector('.render-note-feed')
    if (!root) return { found: false }
    const tabs = Array.from(root.querySelectorAll('.type-tab')).map((el) => ({
      label: el.textContent.trim(),
      active: el.classList.contains('active'),
    }))
    const catTabs = Array.from(root.querySelectorAll('.feed-tab')).map((el) => el.textContent.trim())
    const cards = root.querySelectorAll('.note-card').length
    const textCards = root.querySelectorAll('.note-card--text').length
    const hearts = root.querySelectorAll('.note-like--heart').length
    const badges = root.querySelectorAll('.note-badge-xhs').length
    const banner = document.querySelector('.render-promo-banner, [class*="promo"]')
    return {
      found: true,
      tabs,
      catTabs,
      cards,
      textCards,
      hearts,
      badges,
      bannerText: banner ? banner.textContent.slice(0, 60) : '',
    }
  })
  console.log(JSON.stringify(info, null, 2))

  // 点「长文」Tab 验证切换
  if (info.found) {
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.render-note-feed .type-tab'))
      const target = tabs.find((el) => el.textContent.includes('长文'))
      if (target) target.click()
    })
    await sleep(1200)
    const after = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.render-note-feed .type-tab')).map((el) => ({
        label: el.textContent.trim(),
        active: el.classList.contains('active'),
      }))
      const cards = document.querySelectorAll('.render-note-feed .note-card').length
      return { tabs, cards }
    })
    console.log('点击长文后:', JSON.stringify(after))
  }

  await page.screenshot({ path: path.join(OUT, 'editor-page29-notefeed.png'), fullPage: false })
  console.log('截图已存 editor-page29-notefeed.png')
  await browser.close()
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
