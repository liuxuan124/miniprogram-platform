/**
 * 线上排查：切换左侧菜单时右侧出现的悬浮元素，到底是谁注入的
 * 做法：用真实 Chrome + 加载用户实际装的扩展 → 复现 → 枚举 DOM 里所有非 #app 的注入节点
 * 用法：node scripts/qa/probe-admin-right-float.js
 */
const crypto = require('crypto')
const path = require('path')
const fs = require('fs')
const puppeteer = require('puppeteer-core')

const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN || 'https://admin.zfculture.site'
const EXT_ROOT = `${process.env.HOME}/Library/Application Support/Google/Chrome/Default/Extensions`
const SECRET = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function b64u(i) { return Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }
function signJwt(secret) {
  const now = Math.floor(Date.now() / 1000)
  const body = `${b64u(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))}.${b64u(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200 }))}`
  return `${body}.${b64u(crypto.createHmac('sha256', secret).update(body).digest())}`
}

/** 列出本地已装扩展的绝对路径（取最新版本） */
function listExtPaths() {
  const out = []
  if (!fs.existsSync(EXT_ROOT)) return out
  for (const id of fs.readdirSync(EXT_ROOT)) {
    const dir = path.join(EXT_ROOT, id)
    const vers = fs.readdirSync(dir).sort().reverse()
    for (const v of vers) {
      const p = path.join(dir, v)
      if (fs.existsSync(path.join(p, 'manifest.json'))) { out.push(p); break }
    }
  }
  return out
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-features=IsolateOrigins,site-per-process',
  ]
  const exts = listExtPaths()
  if (exts.length) {
    args.push(`--load-extension=${exts.join(',')}`)
    args.push(`--disable-extensions-except=${exts.join(',')}`)
  }
  console.log('加载扩展数:', exts.length)

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false, // 扩展注入必须非 headless 才稳定
    args,
    defaultViewport: { width: 1902, height: 996 },
  })
  const page = (await browser.pages())[0] || (await browser.newPage())
  await page.evaluateOnNewDocument((t) => {
    try { localStorage.setItem('access_token', t) } catch (e) {}
  }, signJwt(SECRET))

  await page.goto(`${ADMIN}/commerce/channels`, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch((e) => console.log('goto:', e.message))
  await sleep(6000)

  const dump = async (tag) => {
    const info = await page.evaluate(() => {
      const app = document.getElementById('app')
      const vw = innerWidth, vh = innerHeight
      // 1) 所有 fixed 定位且贴右边缘的元素
      const fixed = []
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        if (cs.position !== 'fixed') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right < vw - 160) continue // 只看贴右边的
        fixed.push({
          tag: el.tagName,
          id: el.id,
          cls: (el.className && String(el.className).slice(0, 90)) || '',
          inApp: !!(app && app.contains(el)),
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          z: cs.zIndex,
          bg: cs.backgroundColor,
        })
      }
      // 2) body 直接子节点里不属于 #app 的（扩展注入容器）
      const stray = Array.from(document.body.children)
        .filter((el) => el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE' && el !== app)
        .map((el) => ({ tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 90) }))

      // 3) 右边缘 60px 内、可见、且不是 app 后代的可疑元素（含 shadow host）
      const edge = []
      for (const el of document.querySelectorAll('*')) {
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right < vw - 60) continue
        if (r.left > vw) continue
        if (r.top > vh || r.bottom < 0) continue
        const inApp = !!(app && app.contains(el))
        const hasShadow = !!el.shadowRoot
        if (inApp && !hasShadow) continue
        // 只保留叶子或 shadow host
        const childEls = el.querySelectorAll('*').length
        if (childEls > 6 && !hasShadow) continue
        edge.push({
          tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 90),
          inApp, hasShadow, childCount: childEls,
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          attrs: Array.from(el.attributes).map((a) => `${a.name}=${a.value}`).join(' ').slice(0, 160),
        })
      }
      return { vw, vh, fixed, stray, edge }
    })
    console.log(`\n===== ${tag} (视口 ${info.vw}x${info.vh}) =====`)
    console.log('-- fixed 贴右元素 --')
    for (const f of info.fixed) console.log('  ', JSON.stringify(f))
    console.log('-- body 直属非 #app 节点 --')
    for (const s of info.stray) console.log('  ', JSON.stringify(s))
    console.log('-- 右边缘可疑元素(非app/含shadow) --')
    for (const e of info.edge) console.log('  ', JSON.stringify(e))
    return info
  }

  await dump('初始 /commerce/channels')

  // 点左侧菜单
  const clicked = await page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.menu-item'))
    const target = items.find((n) => (n.textContent || '').includes('商品管理'))
    if (target) { target.click(); return '商品管理' }
    return items.map((i) => (i.textContent || '').trim()).slice(0, 20).join(',')
  })
  console.log('\n点击菜单:', clicked)

  // 切换瞬间就抓（每 40ms 抓一次，共 2.5s）
  for (let i = 0; i < 12; i++) {
    await sleep(200)
    const snap = await page.evaluate(() => {
      const app = document.getElementById('app')
      const hits = []
      for (const el of document.querySelectorAll('*')) {
        const cs = getComputedStyle(el)
        if (cs.position !== 'fixed') continue
        const r = el.getBoundingClientRect()
        if (r.width === 0 || r.height === 0) continue
        if (r.right < innerWidth - 120) continue
        if (r.top > innerHeight || r.bottom < 0) continue
        hits.push({
          tag: el.tagName, id: el.id, cls: String(el.className || '').slice(0, 80),
          inApp: !!(app && app.contains(el)),
          rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)],
          bg: cs.backgroundColor, txt: (el.textContent || '').trim().slice(0, 20),
        })
      }
      return { t: Date.now() % 100000, path: location.pathname, hits }
    })
    if (snap.hits.length) {
      console.log(`\n[切换中 t+${i * 200}ms] path=${snap.path} 右侧fixed:`)
      for (const h of snap.hits) console.log('   ', JSON.stringify(h))
      const f = path.join(OUT, `right-float-t${i}.png`)
      await page.screenshot({ path: f, clip: { x: 1902 - 260, y: 0, width: 260, height: 996 } })
      console.log('    截图:', f)
    }
  }

  await sleep(2500)
  await dump('切换后稳定态')
  const f2 = path.join(OUT, 'right-float-final.png')
  await page.screenshot({ path: f2, clip: { x: 1902 - 260, y: 0, width: 260, height: 996 } })
  console.log('\n最终右侧截图:', f2)

  await browser.close()
}

main().catch((e) => { console.error('FATAL', e); process.exit(1) })
