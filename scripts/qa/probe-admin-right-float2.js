/**
 * 右侧悬浮元素定位 v2：在 /commerce/orders（用户截图所在页）复现，
 * 1) 截图右侧 300px → 我直接读图确认外观
 * 2) elementFromPoint 反查该坐标最上层元素
 * 3) 遍历所有 shadow host（含 top layer / dialog）
 * 4) 切菜单前后各抓一次做对比
 * 用法：node scripts/qa/probe-admin-right-float2.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'https://admin.zfculture.site'
const SECRET = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const VW = 1902, VH = 996

function b64u(i) { return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-features=IsolateOrigins,site-per-process'],
    defaultViewport: { width: VW, height: VH },
  })
  const page = (await browser.pages())[0] || (await browser.newPage())
  await page.evaluateOnNewDocument((t) => { try { localStorage.setItem('access_token', t) } catch (e) {} }, signJwt(SECRET))
  await page.goto(`${ADMIN}/commerce/orders`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('goto', e.message))
  await sleep(7000)

  const probe = () => page.evaluate(() => {
    const app = document.getElementById('app')
    const out = { path: location.pathname, scroll: { x: scrollX, y: scrollY }, hits: [], shadowHosts: [], topRight: null }

    // 视口右上角往左 300px / 下 900px 内，所有可见元素
    const box = { l: innerWidth - 300, t: 0, r: innerWidth, b: innerHeight }
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.right < box.l || r.left > box.r || r.bottom < box.t || r.top > box.b) continue
      if (el.children.length > 3) continue // 只留叶子
      const cs = getComputedStyle(el)
      out.hits.push({
        tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 70),
        inApp: !!(app && app.contains(el)),
        pos: cs.position, z: cs.zIndex,
        rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        bg: cs.backgroundColor,
        txt: (el.textContent || '').trim().slice(0, 14),
      })
    }
    // 所有 shadow host
    for (const el of document.querySelectorAll('*')) {
      if (el.shadowRoot) {
        const r = el.getBoundingClientRect()
        out.shadowHosts.push({
          tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 60),
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
        })
      }
    }
    return out
  })

  const shot = async (tag) => {
    const f = path.join(OUT, `r2-${tag}.png`)
    await page.screenshot({ path: f, clip: { x: VW - 300, y: 0, width: 300, height: VH } })
    // 再来一张整页，便于看上下文
    const f2 = path.join(OUT, `r2-${tag}-full.png`)
    await page.screenshot({ path: f2 })
    console.log(`  截图: ${f}`)
    return f
  }

  console.log('\n########## A. 初始 /commerce/orders ##########')
  let a = await probe()
  console.log('path:', a.path, 'scroll:', JSON.stringify(a.scroll))
  console.log('右侧 300px 内可见叶子元素:')
  for (const h of a.hits) console.log('  ', JSON.stringify(h))
  console.log('shadow hosts:', JSON.stringify(a.shadowHosts))
  await shot('A-orders')

  // 切到「卡券中心」
  console.log('\n########## 切换左侧菜单 → 卡券中心 ##########')
  const clicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'))
    const t = items.find((n) => (n.textContent || '').includes('卡券中心'))
    if (t) { t.click(); return '卡券中心' }
    return 'NOT_FOUND:' + items.map((i) => (i.textContent || '').trim()).slice(0, 25).join(',')
  })
  console.log('点击:', clicked)

  // 切换过程中连续抓
  for (let i = 0; i < 6; i++) {
    await sleep(120)
    const s = await page.evaluate(() => {
      const app = document.getElementById('app')
      const hits = []
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right < innerWidth - 120) continue
        if (el.children.length > 2) continue
        const cs = getComputedStyle(el)
        hits.push({
          tag: el.tagName, cls: String(el.className || '').slice(0, 60),
          inApp: !!(app && app.contains(el)), pos: cs.position, z: cs.zIndex,
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          bg: cs.backgroundColor, txt: (el.textContent || '').trim().slice(0, 12),
        })
      }
      return { path: location.pathname, hits, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }
    })
    const interesting = s.hits.filter((h) => !h.inApp || h.pos === 'fixed')
    if (interesting.length || s.sw > s.cw) {
      console.log(`\n[t+${i * 120}ms] path=${s.path} scrollW=${s.sw} clientW=${s.cw}${s.sw > s.cw ? '  ⚠横向溢出' : ''}`)
      for (const h of interesting) console.log('    ', JSON.stringify(h))
      await shot(`B-t${i}`)
    }
  }

  await sleep(2500)
  console.log('\n########## C. 切换后稳定态 ##########')
  const c = await probe()
  console.log('path:', c.path)
  for (const h of c.hits) console.log('  ', JSON.stringify(h))
  await shot('C-after')

  await browser.close()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
