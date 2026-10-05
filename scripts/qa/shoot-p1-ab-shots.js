/**
 * P1 两处的 A/B 对照截图：现状 vs 强行等高。
 * 只注入 CSS 截图，**不部署、不改线上**。
 *
 * 用法：NODE_PATH=<puppeteer-core> node scripts/qa/shoot-p1-ab-shots.js
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa/p1-ab')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 强行等高：只改 align-items，最小改动，用于观察后果 */
const FORCE_STRETCH = {
  'files-edit': `
    .edit-layout{align-items:stretch !important}
  `,
  'pb-appearance': `
    .ap-grid{align-items:stretch !important}
  `,
}

const CASES = [
  { key: 'files-edit', route: '/content/files/edit', name: '内容管理›文件管理›编辑文件', container: '.edit-layout' },
  { key: 'pb-appearance', route: '/page-builder/appearance', name: '页面装修›页面外观', container: '.ap-grid' },
]

function tk() {
  const s = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const b = (i) => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const n = Math.floor(Date.now() / 1000)
  const h = b(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = b(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: n, exp: n + 7200 }))
  const bd = h + '.' + pl
  return bd + '.' + b(crypto.createHmac('sha256', s).update(bd).digest())
}

const MEASURE = (container) => {
  const node = document.querySelector(container)
  if (!node) return null
  const kids = Array.from(node.children).filter((c) => c.getBoundingClientRect().height > 0)
  const hs = kids.map((c) => Math.round(c.getBoundingClientRect().height))
  // 每个子卡内「最后可见元素到卡底」的留白
  const gaps = kids.map((c) => {
    const cr = c.getBoundingClientRect()
    const last = Array.from(c.querySelectorAll('*'))
      .filter((e) => {
        const r = e.getBoundingClientRect()
        return r.height > 0 && getComputedStyle(e).display !== 'none'
      })
      .pop()
    if (!last) return Math.round(cr.height)
    return Math.round(cr.bottom - last.getBoundingClientRect().bottom)
  })
  return { align: getComputedStyle(node).alignItems, heights: hs, innerGaps: gaps }
}

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const br = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1200 },
  })
  const t = tk()

  for (const c of CASES) {
    // 现状
    let pg = await br.newPage()
    await pg.evaluateOnNewDocument((x) => {
      localStorage.setItem('access_token', x)
      localStorage.setItem('admin-theme', 'warm')
    }, t)
    await pg.goto(`${ADMIN}${c.route}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
    await sleep(2400)
    const before = await pg.evaluate(MEASURE, c.container)
    await pg.screenshot({ path: path.join(OUT, `30-${c.key}-A现状.png`) })
    await pg.close()

    // 强行等高
    pg = await br.newPage()
    await pg.evaluateOnNewDocument((x) => {
      localStorage.setItem('access_token', x)
      localStorage.setItem('admin-theme', 'warm')
    }, t)
    await pg.goto(`${ADMIN}${c.route}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
    await sleep(2400)
    await pg.addStyleTag({ content: FORCE_STRETCH[c.key] })
    await sleep(600)
    const after = await pg.evaluate(MEASURE, c.container)
    await pg.screenshot({ path: path.join(OUT, `31-${c.key}-B强行等高.png`) })
    await pg.close()

    const bDiff = before?.heights?.length ? Math.max(...before.heights) - Math.min(...before.heights) : -1
    const aDiff = after?.heights?.length ? Math.max(...after.heights) - Math.min(...after.heights) : -1
    const maxGap = after?.innerGaps?.length ? Math.max(...after.innerGaps) : 0
    console.log(`\n${c.name}  (${c.route})`)
    console.log(`  现状   align=${before?.align}  高度=${JSON.stringify(before?.heights)}  差=${bDiff}px`)
    console.log(`  等高后 align=${after?.align}  高度=${JSON.stringify(after?.heights)}  差=${aDiff}px`)
    console.log(`  等高后卡内留白=${JSON.stringify(after?.innerGaps)}px  ${maxGap > 200 ? '← 大片空白，不建议' : ''}`)
    console.log(`  截图：30-${c.key}-A现状.png / 31-${c.key}-B强行等高.png`)
  }
  console.log(`\n目录：${OUT}`)
  await br.close()
})()
