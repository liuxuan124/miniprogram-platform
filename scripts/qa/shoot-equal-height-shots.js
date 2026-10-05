/**
 * 为「卡片等高体检」报告里的 FAIL 项出截图，供人工确认是否真的一高一矮。
 * 用法：NODE_PATH=<puppeteer-core 所在目录> node scripts/qa/shoot-equal-height-shots.js
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa/equal-height')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const SHOTS = [
  { route: '/commerce/overview', name: '01-commerce-overview-ov2' },
  { route: '/content/overview', name: '02-content-overview-ov2' },
  { route: '/member/plans', name: '03-member-plans-layout' },
  { route: '/content/files/edit', name: '04-content-files-edit' },
  { route: '/page-builder/appearance', name: '05-pb-appearance' },
  { route: '/page-builder/login', name: '06-pb-login' },
  { route: '/page-builder/mine', name: '07-pb-mine' },
  { route: '/member/overview', name: '08-member-overview-已修回归' },
]

function makeToken() {
  const secret = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const b64u = (i) => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const now = Math.floor(Date.now() / 1000)
  const h = b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))
  const body = `${h}.${pl}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = makeToken()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1400 },
  })
  const page = await browser.newPage()
  for (const s of SHOTS) {
    await page.evaluateOnNewDocument((tk) => {
      localStorage.setItem('access_token', tk)
      localStorage.setItem('admin-theme', 'warm')
    }, token)
    await page.goto(`${ADMIN}${s.route}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
    await sleep(2400)
    const file = path.join(OUT, `${s.name}.png`)
    await page.screenshot({ path: file, fullPage: false })
    // 额外记录被测容器的子元素高度，便于对照
    const info = await page.evaluate(() => {
      const out = []
      for (const sel of ['.ov2', '.plans-layout', '.edit-layout', '.ap-grid', '.login-layout', '.mine-layout', '.plans']) {
        for (const n of document.querySelectorAll(sel)) {
          const kids = Array.from(n.children).map((c) => Math.round(c.getBoundingClientRect().height))
          if (kids.length >= 2) out.push({ sel, align: getComputedStyle(n).alignItems, heights: kids })
        }
      }
      return out
    })
    console.log(`✓ ${s.route.padEnd(26)} → ${path.basename(file)}`)
    for (const i of info) console.log(`     ${i.sel}  align=${i.align}  子项高度=${JSON.stringify(i.heights)}`)
  }
  console.log(`\n截图目录：${OUT}`)
  await browser.close()
})()
