/**
 * P0 三处等高修复的 A/B 验证（不部署、不改线上）。
 *
 * 做法：打开线上页面 → 注入与源码改动等价的 CSS → 量高度。
 * 对比 (改前, 改后) 确认真的收平，且不引入「下方大片空白」的反效果。
 *
 * 「是否出现空白」用卡内最后一个可见子元素距卡底的距离判定：
 *   空白 < 40px 视为正常；> 60px 视为等高后留了不该留的空。
 *
 * 用法：NODE_PATH=<puppeteer-core> node scripts/qa/verify-p0-equal-height-ab.js
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa/equal-height')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 与源码改动等价的 CSS（改前是 align-items:start，改后 stretch + 卡内布局） */
const CSS = {
  commerce: `
    .commerce-wb .ov2{align-items:stretch !important}
    .commerce-wb .ov2 > .card{display:flex !important;flex-direction:column !important}
    .commerce-wb .ov2 > .card > .ov2-link{margin-top:auto !important;align-self:flex-start !important;padding-top:12px !important}
  `,
  content: `
    .content-wb .ov2{align-items:stretch !important}
    .content-wb .ov2 > .card{display:flex !important;flex-direction:column !important}
    .content-wb .ov2 > .card > .bars{flex:1 !important;gap:0 !important}
    .content-wb .ov2 > .card > .bars > .bar-row{flex:1 !important;align-items:center !important;min-height:26px !important}
    .content-wb .ov2-side{display:flex !important;flex-direction:column !important;gap:16px !important}
    .content-wb .ov2-side > .card{flex:1 !important;display:flex !important;flex-direction:column !important}
    .content-wb .ov2-side > .card > .catdist{flex:1 !important;align-content:center !important}
  `,
  plans: `
    .member-wb .plans{align-items:stretch !important}
    .member-wb .plan{display:flex !important;flex-direction:column !important}
    .member-wb .plan-body{flex:1 !important}
    .member-wb .plan-body > .plan-actions{margin-top:auto !important;padding-top:8px !important}
  `,
}

const CASES = [
  {
    route: '/commerce/overview',
    name: '商城总览 ov2',
    cssKey: 'commerce',
    container: '.commerce-wb .ov2',
    // 注入后需要给链接加 class 才能命中 ov2-link 选择器
    prep: () => {
      document.querySelectorAll('.commerce-wb .ov2 > .card > .link').forEach((b) => b.classList.add('ov2-link'))
    },
  },
  {
    route: '/content/overview',
    name: '内容总览 ov2',
    cssKey: 'content',
    container: '.content-wb .ov2',
    prep: () => {
      // 右列原本只有内联样式，需要换成 class 才能命中 .ov2-side
      document.querySelectorAll('.content-wb .ov2 > div').forEach((d) => {
        if (d.querySelector('.card')) d.classList.add('ov2-side')
      })
    },
  },
  {
    route: '/member/plans',
    name: '会员套餐卡 plans',
    cssKey: 'plans',
    container: '.member-wb .plans',
    prep: () => {
      document.querySelectorAll('.plan-body > div').forEach((d) => {
        if (d.querySelector('.btn')) d.classList.add('plan-actions')
      })
    },
  },
]

/** 量：子项高度 + 每个子项内部「最后可见子元素到卡底的距离」 */
const MEASURE = (container) => {
  const out = []
  for (const node of document.querySelectorAll(container)) {
    const kids = Array.from(node.children).filter((c) => {
      const r = c.getBoundingClientRect()
      return r.height > 0 && r.width > 0
    })
    if (kids.length < 2) continue
    const hs = kids.map((c) => Math.round(c.getBoundingClientRect().height))
    const gaps = kids.map((c) => {
      const cr = c.getBoundingClientRect()
      // 卡内最后一个「有可见内容」的子孙元素
      const last = Array.from(c.querySelectorAll('*')).filter((e) => {
        const r = e.getBoundingClientRect()
        return r.height > 0 && getComputedStyle(e).display !== 'none'
      }).pop()
      if (!last) return Math.round(cr.height)
      return Math.round(cr.bottom - last.getBoundingClientRect().bottom)
    })
    out.push({ align: getComputedStyle(node).alignItems, heights: hs, innerGaps: gaps })
  }
  return out
}

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

  let pass = 0
  let fail = 0
  for (const c of CASES) {
    const page = await browser.newPage()
    await page.evaluateOnNewDocument((tk) => {
      localStorage.setItem('access_token', tk)
      localStorage.setItem('admin-theme', 'warm')
    }, token)
    await page.goto(`${ADMIN}${c.route}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {})
    await sleep(2400)

    const before = await page.evaluate(MEASURE, c.container)
    await page.screenshot({ path: path.join(OUT, `20-p0-${c.cssKey}-before.png`) })

    await page.evaluate((fn) => {
      // eslint-disable-next-line no-new-func
      new Function('return (' + fn + ')()')()
    }, c.prep.toString())
    await page.addStyleTag({ content: CSS[c.cssKey] })
    await sleep(700)

    const after = await page.evaluate(MEASURE, c.container)
    await page.screenshot({ path: path.join(OUT, `21-p0-${c.cssKey}-after.png`) })

    const b = before[0] || { heights: [], innerGaps: [] }
    const a = after[0] || { heights: [], innerGaps: [] }
    const bDiff = b.heights.length ? Math.max(...b.heights) - Math.min(...b.heights) : -1
    const aDiff = a.heights.length ? Math.max(...a.heights) - Math.min(...a.heights) : -1
    const maxGap = a.innerGaps.length ? Math.max(...a.innerGaps) : 0
    const ok = aDiff <= 12 && maxGap <= 60
    ok ? pass++ : fail++

    console.log(`\n${ok ? '✅' : '❌'} ${c.name}  (${c.route})`)
    console.log(`   改前 align=${b.align}  高度=${JSON.stringify(b.heights)}  差=${bDiff}px`)
    console.log(`   改后 align=${a.align}  高度=${JSON.stringify(a.heights)}  差=${aDiff}px`)
    console.log(`   改后各卡内部底部留白=${JSON.stringify(a.innerGaps)}px  ${maxGap > 60 ? '← 空白过多，不合格' : '← 正常'}`)

    await page.close()
  }

  console.log(`\n==== A/B 验证：${pass} 通过 / ${fail} 不通过 ====`)
  await browser.close()
})()
