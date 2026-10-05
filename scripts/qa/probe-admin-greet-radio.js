/**
 * 复现：装修器属性面板「品牌问候条 → 顶部视觉」单选组点击无反应
 * 用法：JWT_SECRET=xxx node scripts/qa/probe-admin-greet-radio.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'https://admin.zfculture.site'
const PAGE_ID = process.env.PAGE_ID || '28'
const SECRET = process.env.JWT_SECRET
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

const readRadios = () => Array.from(document.querySelectorAll('.el-radio'))
  .filter((r) => r.offsetParent !== null)
  .map((r) => ({ text: (r.textContent || '').trim(), checked: r.className.includes('is-checked') }))

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = signJwt(SECRET)
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process'],
    defaultViewport: { width: 1680, height: 1150 },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${String(m.text()).slice(0, 300)}`) })
  page.on('pageerror', (e) => errors.push(`[pageerror] ${String(e.message).slice(0, 300)}`))

  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('access_token', t) } catch (e) {} }, token)
  await page.goto(`${ADMIN}/page-builder/editor/${PAGE_ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})

  // 选中问候条组件
  let picked = { ok: false }
  for (let i = 0; i < 20 && !picked.ok; i++) {
    picked = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('.canvas-item-wrap'))
      const hit = nodes.find((n) => (n.textContent || '').includes('问候'))
      if (hit) { hit.click(); return { ok: true } }
      return { ok: false, total: nodes.length }
    })
    if (!picked.ok) await sleep(1500)
  }
  console.log('选中问候条:', JSON.stringify(picked))
  await sleep(2500)

  const readState = () => page.evaluate((fnBody) => {
    const readRadios = new Function('return ' + fnBody)()
    const canvasTop = document.querySelector('.dsl-warm-block--warm_greet .wh-top')
    const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
    const st = pinia?.state?.value?.page
    const comp = (st?.dsl?.components || []).find((c) => c.type === 'warm_greet')
    return {
      radios: readRadios(),
      canvasClass: canvasTop ? canvasTop.className : 'NO-CANVAS',
      searchPlain: !!document.querySelector('.wh-search--plain'),
      greetSkin: comp ? comp.props.greet_skin : 'NO-COMP',
      brandInitial: comp ? comp.props.brand_initial : '',
      memberBadge: comp ? comp.props.show_member_badge : '',
      titleSize: comp ? comp.props.greet_title_font_size : '',
    }
  }, readRadios.toString())

  console.log('点击前:', JSON.stringify(await readState(), null, 1))

  // 真实鼠标点击「经典暖阁 / 墨太白 plain」——用坐标，模拟人手
  const target = await page.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('.el-radio')).filter((r) => r.offsetParent !== null)
    const t = radios.find((r) => (r.textContent || '').includes('plain')) || radios[0]
    if (!t) return null
    t.scrollIntoView({ block: 'center' })
    const b = t.getBoundingClientRect()
    return { x: b.left + 10, y: b.top + b.height / 2, w: b.width, h: b.height, text: (t.textContent || '').trim() }
  })
  console.log('目标坐标:', JSON.stringify(target))
  if (target) {
    await page.mouse.click(target.x, target.y)   // 真实鼠标
    await sleep(1800)
  }

  console.log('真实鼠标点击后:', JSON.stringify(await readState(), null, 1))

  await page.screenshot({ path: `${OUT}/greet-radio-after.png` })
  console.log('截图:', `${OUT}/greet-radio-after.png`)
  console.log('--- console ---')
  console.log(errors.slice(0, 10).join('\n') || '（无）')
  await browser.close()
}

main().catch((e) => { console.log('FATAL:', e && (e.message || e)); process.exit(1) })
