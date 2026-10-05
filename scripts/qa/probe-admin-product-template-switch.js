/**
 * 切换详情模板变体验证预览刷新
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'http://localhost:3000'
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
  const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const token = signJwt(secret)
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 1100 },
  })
  const page = await browser.newPage()
  await page.evaluateOnNewDocument((t) => { localStorage.setItem('access_token', t) }, token)
  try { await page.goto(`${ADMIN}/commerce/product/edit`, { waitUntil: 'networkidle2', timeout: 60000 }) }
  catch (e) { /* 容忍 */ }
  await sleep(3000)

  for (const tpl of ['column_story', 'digital_video', 'physical_minimal']) {
    const ok = await page.evaluate((id) => {
      // 通过 Vue devtools 全局钩子不可靠；直接模拟 UI 操作：打开下拉选对应项
      const sel = document.querySelector('.detail-template-row .el-select')
      if (!sel) return false
      sel.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, tpl)
    await sleep(900)
    const picked = await page.evaluate((id) => {
      const items = Array.from(document.querySelectorAll('.el-select-dropdown__item'))
      const el = items.find((x) => x.textContent.trim().includes(id.includes('story') ? '故事化' : id.includes('video') ? '视频主打' : '极简卡片'))
      if (!el) return false
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      return true
    }, tpl)
    await sleep(1000)
    const bar = await page.evaluate(() => {
      const el = document.querySelector('.pdp__bar')
      return el ? el.textContent.slice(0, 60) : ''
    })
    console.log(`${tpl}: click=${ok} picked=${picked} -> ${bar}`)
    const el = await page.$('.pdp__phone')
    if (el) await el.screenshot({ path: path.join(OUT, `tpl-${tpl}.png`) })
  }
  await browser.close()
}
main().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
