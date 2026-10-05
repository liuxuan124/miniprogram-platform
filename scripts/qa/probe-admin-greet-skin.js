/**
 * 线上验证：属性面板「顶部视觉」单选组 → 画布预览是否跟着变
 * 用法：JWT_SECRET=xxx node scripts/qa/probe-admin-greet-skin.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN || 'https://admin.zfculture.site'
const PAGE_ID = process.env.PAGE_ID || '28'
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
    defaultViewport: { width: 1680, height: 1150 },
  })
  const page = await browser.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 200)))
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('access_token', t) } catch (e) {} }, signJwt(SECRET))
  await page.goto(`${ADMIN}/page-builder/editor/${PAGE_ID}`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {})

  let ok = false
  for (let i = 0; i < 25 && !ok; i++) {
    ok = await page.evaluate(() => {
      const hit = Array.from(document.querySelectorAll('.canvas-item-wrap')).find((n) => (n.textContent || '').includes('问候'))
      if (hit) { hit.click(); return true }
      return false
    })
    if (!ok) await sleep(1500)
  }
  console.log('选中问候条:', ok)
  await sleep(2500)

  const read = () => page.evaluate(() => {
    const box = document.querySelector('.dsl-warm-block--warm_greet .wh-top')
    const av = document.querySelector('.dsl-warm-block--warm_greet .wh-av')
    const pinia = document.querySelector('#app')?.__vue_app__?.config.globalProperties.$pinia
    const comp = (pinia?.state?.value?.page?.dsl?.components || []).find((c) => c.type === 'warm_greet')
    return {
      选中单选: Array.from(document.querySelectorAll('.el-radio')).filter((r) => r.offsetParent !== null)
        .map((r) => `${(r.textContent || '').trim()}=${r.className.includes('is-checked') ? 'ON' : 'off'}`).join(' | '),
      画布外层class: box ? box.className.replace('dsl-warm-block', '').trim() : 'NO-TOP',
      头像尺寸: av ? Math.round(av.getBoundingClientRect().width) + 'px' : 'none',
      白底搜索条: !!document.querySelector('.wh-search--plain'),
      DSL里greet_skin: comp ? comp.props.greet_skin : 'NO-COMP',
      组件style背景色: comp ? String((comp.style || {}).background_color || (comp.style || {}).background || '(无)') : 'NO-COMP',
    }
  })

  const clickRadio = async (kw) => {
    const pos = await page.evaluate((k) => {
      const t = Array.from(document.querySelectorAll('.el-radio')).filter((r) => r.offsetParent !== null)
        .find((r) => (r.textContent || '').includes(k))
      if (!t) return null
      t.scrollIntoView({ block: 'center' })
      const b = t.getBoundingClientRect()
      return { x: b.left + 10, y: b.top + b.height / 2 }
    }, kw)
    if (!pos) { console.log('  未找到 radio:', kw); return }
    await page.mouse.click(pos.x, pos.y)
    await sleep(1800)
  }

  console.log('\n=== 初始 ===')
  console.log(JSON.stringify(await read(), null, 1))

  await clickRadio('经典暖阁')
  console.log('\n=== 点「经典暖阁」后（关键：画布应变 classic）===')
  console.log(JSON.stringify(await read(), null, 1))
  await page.screenshot({ path: `${OUT}/skin-classic.png` })

  await clickRadio('plain')
  console.log('\n=== 再点「墨太白 plain」后（画布应变 plain-chrome）===')
  console.log(JSON.stringify(await read(), null, 1))
  await page.screenshot({ path: `${OUT}/skin-plain.png` })

  console.log('\npageerror:', errs.slice(0, 5).join(' | ') || '（无）')
  await browser.close()
}

main().catch((e) => { console.log('FATAL:', e && (e.message || e)); process.exit(1) })
