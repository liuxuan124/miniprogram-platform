/**
 * content 总览左卡「等高后如何填充多余高度」的方案对比。
 * 三候选：space-evenly / 行自身撑高 / 行撑高+轨道变高。
 * 输出每种方案的卡高、行高、条下留白，并出截图人工判性质。
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa/equal-height')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function tk() {
  const s = fs.readFileSync('/tmp/jwt_secret.txt', 'utf8').trim()
  const b = (i) => Buffer.from(i).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  const n = Math.floor(Date.now() / 1000)
  const h = b(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const pl = b(JSON.stringify({ userId: 1, sub: 'admin', typ: 'access', iat: n, exp: n + 7200 }))
  const bd = h + '.' + pl
  return bd + '.' + b(crypto.createHmac('sha256', s).update(bd).digest())
}

const MEASURE = () => {
  const n = document.querySelector('.content-wb .ov2')
  if (!n) return null
  const k = Array.from(n.children).map((c) => ({ h: Math.round(c.getBoundingClientRect().height) }))
  const bars = n.querySelector('.bars')
  const rows = Array.from(bars.children).map((r) => Math.round(r.getBoundingClientRect().height))
  const cr = bars.getBoundingClientRect()
  const last = bars.lastElementChild.getBoundingClientRect()
  return { k, barH: Math.round(cr.height), rowH: rows, gapBelow: Math.round(cr.bottom - last.bottom) }
}

const BASE = `
.content-wb .ov2{align-items:stretch !important}
.content-wb .ov2 > .card{display:flex !important;flex-direction:column !important}
.content-wb .ov2-side{display:flex !important;flex-direction:column !important;gap:16px !important}
.content-wb .ov2-side > .card{flex:1 !important;display:flex !important;flex-direction:column !important}
.content-wb .ov2-side > .card > .catdist{flex:1 !important;align-content:center !important}`

const VARIANTS = {
  A: BASE + `
.content-wb .ov2 > .card > .bars{flex:1 !important;justify-content:space-evenly !important}`,
  B: BASE + `
.content-wb .ov2 > .card > .bars{flex:1 !important;display:flex;flex-direction:column;justify-content:center;gap:0 !important}
.content-wb .ov2 > .card > .bars > .bar-row{flex:1 !important;align-items:center !important;min-height:26px}`,
  C: BASE + `
.content-wb .ov2 > .card > .bars{flex:1 !important;display:flex;flex-direction:column;justify-content:stretch;gap:0 !important}
.content-wb .ov2 > .card > .bars > .bar-row{flex:1 !important;align-items:center !important;min-height:26px}
.content-wb .ov2 > .card > .bars > .bar-row > .bar-track{height:14px !important}`,
}

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const br = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1400 },
  })
  const t = tk()
  for (const [key, css] of Object.entries(VARIANTS)) {
    const pg = await br.newPage()
    await pg.evaluateOnNewDocument((x) => {
      localStorage.setItem('access_token', x)
      localStorage.setItem('admin-theme', 'warm')
    }, t)
    await pg.goto(`${ADMIN}/content/overview`, { waitUntil: 'networkidle2', timeout: 45000 })
    await sleep(2200)
    await pg.evaluate(() => {
      document.querySelectorAll('.content-wb .ov2 > div').forEach((d) => {
        if (d.querySelector('.card')) d.classList.add('ov2-side')
      })
    })
    await pg.addStyleTag({ content: css })
    await sleep(600)
    const m = await pg.evaluate(MEASURE)
    await pg.screenshot({ path: path.join(OUT, `22-tune-${key}.png`) })
    console.log(
      `\n方案 ${key}\n  卡高度=${JSON.stringify(m.k.map((x) => x.h))}  bars区=${m.barH}  行高=${JSON.stringify(m.rowH)}  条下留白=${m.gapBelow}`
    )
    await pg.close()
  }
  await br.close()
})()
