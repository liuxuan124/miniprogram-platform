/**
 * 线上验证：商品编辑页「图片素材」区三组按钮的视觉归属
 * 用法：JWT_SECRET=xxx node scripts/qa/probe-admin-product-assets.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN || 'https://admin.zfculture.site'
const PRODUCT_ID = process.env.PRODUCT_ID || '48'
const SECRET = process.env.JWT_SECRET
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(i) { return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process'],
    defaultViewport: { width: 1680, height: 1200 },
  })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)))
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('access_token', t) } catch (e) {} }, signJwt(SECRET))
  await page.goto(`${ADMIN}/commerce/product/edit/${PRODUCT_ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})

  // 等商品数据回来
  let ready = false
  for (let i = 0; i < 30 && !ready; i++) {
    ready = await page.evaluate(() => !document.querySelector('.el-loading-mask'))
    if (!ready) await sleep(600)
  }
  await sleep(1200)

  // 滚动到图片素材区
  await page.evaluate(() => {
    const card = document.querySelector('#section-assets')
    if (card) card.scrollIntoView({ block: 'start' })
  })
  await sleep(700)

  const layout = await page.evaluate(() => {
    const card = document.querySelector('#section-assets')
    if (!card) return { found: false }
    const items = Array.from(card.querySelectorAll('.el-form-item'))
    const rows = []
    items.forEach((it) => {
      const label = (it.querySelector('.el-form-item__label') || {}).textContent || ''
      const labelEl = it.querySelector('.el-form-item__label')
      const btns = Array.from(it.querySelectorAll('.ghost-btn')).map((b) => {
        const r = b.getBoundingClientRect()
        return { text: (b.textContent || '').trim(), top: Math.round(r.top), left: Math.round(r.left) }
      })
      rows.push({
        label: label.trim().replace(/\s+/g, ''),
        labelTop: labelEl ? Math.round(labelEl.getBoundingClientRect().top) : null,
        buttons: btns,
        itemTop: Math.round(it.getBoundingClientRect().top),
      })
    })
    return { found: true, rows }
  })

  console.log('=== 图片素材区布局 ===')
  if (!layout.found) {
    console.log('未找到 #section-assets')
  } else {
    layout.rows.forEach((r) => {
      console.log(`\n[${r.label}] itemTop=${r.itemTop} labelTop=${r.labelTop}`)
      r.buttons.forEach((b) => console.log(`    ${b.text}  top=${b.top} left=${b.left}`))
    })
  }

  // 截图
  const card = await page.$('#section-assets')
  const shot = path.join(OUT, 'product-assets.png')
  if (card) await card.screenshot({ path: shot })
  else await page.screenshot({ path: shot, fullPage: false })
  console.log('\n截图:', shot)

  if (errs.length) console.log('\n页面错误:', errs.slice(0, 5))
  await browser.close()
}
main().catch((e) => { console.log('ERROR:', e && e.message); process.exit(1) })
