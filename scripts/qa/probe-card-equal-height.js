/**
 * 卡片等高批量体检
 *
 * 背景：CSS Grid/Flex 的 cross 轴默认 stretch；显式写
 *   align-items: start / flex-start
 * 子项就各按内容高度收缩 → 同一排卡片一高一矮、底部参差。
 *
 * 本探针不猜，直接量：对每个候选容器，读取其直接子元素的
 * getBoundingClientRect().height，算出 max-min 差值。
 * 差值 > 12px 即判定为「肉眼可见的不齐」。
 *
 * 同时输出：子元素数量、容器 computed 的 align-items、
 * 容器 selector 路径，便于人工确认是不是刻意设计。
 *
 * 用法：
 *   ADMIN_BASE=https://admin.zfculture.site node scripts/qa/probe-card-equal-height.js
 *   只测线上（默认）；加 LOCAL=1 测本地 dev。
 */
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer-core')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const ADMIN = process.env.ADMIN_BASE || 'https://admin.zfculture.site'
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 差值超过这个 px 就认为肉眼可见（≈ 一行 13px 正文的 2/3） */
const THRESHOLD = 12

/**
 * 待测页面。selector 是候选容器；null 表示跳过该页。
 * 依据 = 源码里 grid/flex + align-items:start 的静态扫描结果
 * + admin/src/router/index.ts 的真实路由（不要凭目录名猜）。
 */
const TARGETS = [
  // ---- A 类：等宽卡片网格，权益/条目数天然不等 ----
  { route: '/member/plans', name: '会员套餐卡（member-wb .plans）', selectors: ['.member-wb .plans', '.plans'] },
  // ---- A 类扩展：auto-fill/auto-fit 卡片网格 ----
  { route: '/member/role-tags', name: '角色标签卡', selectors: ['[class*="grid"]'] },
  { route: '/community/members', name: '社区套餐卡', selectors: ['.plan-grid', '.tier-grid'] },
  { route: '/community/membership', name: '星球会员套餐', selectors: ['.plan-grid', '.tier-grid'] },
  { route: '/activity/list', name: '活动卡', selectors: ['[class*="grid"]'] },
  { route: '/commerce/products', name: '商品卡', selectors: ['[class*="grid"]'] },
  { route: '/content/authors', name: '作者卡', selectors: ['[class*="grid"]'] },
  { route: '/appointment/list', name: '预约卡', selectors: ['[class*="grid"]'] },
  // ---- 已修的做回归 ----
  { route: '/member/overview', name: '会员总览 ov2（已修，回归）', selectors: ['.member-wb .ov2', '.ov2'] },
  // ---- B 类：主栏 + 侧栏（需人工确认侧栏是否「该撑高」）----
  { route: '/commerce/overview', name: '商城总览 ov2', selectors: ['.commerce-wb .ov2', '.ov2'] },
  { route: '/content/overview', name: '内容总览 ov2', selectors: ['.content-wb .ov2', '.ov2'] },
  { route: '/member/plans', name: '会员套餐 plans-layout（主栏+侧栏）', selectors: ['.plans-layout'] },
  { route: '/content/files/edit', name: '文件编辑 edit-layout', selectors: ['.edit-layout'] },
  { route: '/mini/overview', name: '小程序总览 .ov', selectors: ['.ov'] },
  { route: '/mini/appearance', name: '小程序外观 .ov', selectors: ['.ov'] },
  { route: '/page-builder/appearance', name: '页面装修 ap-grid', selectors: ['.ap-grid'] },
  { route: '/page-builder/login', name: '登录页配置 login-layout', selectors: ['.login-layout'] },
  { route: '/page-builder/mine', name: '我的页配置 mine-layout', selectors: ['.mine-layout', '.pv'] },
  { route: '/product/1', name: '商品编辑 editor-layout', selectors: ['.editor-layout', '.asset-split'] },
  { route: '/content/note/1', name: '内容编辑 edit-layout', selectors: ['.edit-layout'] },
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

/** 页面内执行：量每个 selector 下直接子元素的高度差 */
const MEASURE = (selectors, threshold) => {
  const out = []
  for (const sel of selectors) {
    let nodes = []
    try {
      nodes = Array.from(document.querySelectorAll(sel))
    } catch (e) {
      continue
    }
    for (const node of nodes) {
      // 只看有 ≥2 个「块级子项」的容器，且子项在同一行（top 相同）
      const kids = Array.from(node.children).filter((c) => {
        const r = c.getBoundingClientRect()
        return r.height > 0 && r.width > 0 && getComputedStyle(c).display !== 'none'
      })
      if (kids.length < 2) continue
      const rects = kids.map((c) => c.getBoundingClientRect())
      const hs = rects.map((r) => Math.round(r.height))
      const tops = rects.map((r) => Math.round(r.top))
      // 同一行判定：top 的极差 < 20px
      const topSpread = Math.max(...tops) - Math.min(...tops)
      if (topSpread >= 20) continue
      const max = Math.max(...hs)
      const min = Math.min(...hs)
      const diff = max - min
      out.push({
        sel,
        alignItems: getComputedStyle(node).alignItems,
        display: getComputedStyle(node).display,
        count: kids.length,
        heights: hs,
        diff,
        passed: diff <= threshold,
      })
    }
  }
  return out
}

;(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })
  const token = makeToken()
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox'],
    defaultViewport: { width: 1680, height: 1200 },
  })
  const page = await browser.newPage()
  page.on('pageerror', () => {})

  const report = []
  for (const t of TARGETS) {
    await page.evaluateOnNewDocument((tk) => {
      localStorage.setItem('access_token', tk)
      localStorage.setItem('admin-theme', 'warm')
    }, token)
    let ok = true
    await page.goto(`${ADMIN}${t.route}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {
      ok = false
    })
    await sleep(2200)
    let res = []
    try {
      res = await page.evaluate(MEASURE, t.selectors, THRESHOLD)
    } catch (e) {
      res = []
    }
    const failed = res.filter((r) => !r.passed)
    report.push({ ...t, loaded: ok, results: res, failed: failed.length })
    const tag = failed.length ? 'FAIL' : res.length ? 'PASS' : '— 无命中'
    console.log(
      `[${tag}] ${t.route.padEnd(28)} ${t.name}` +
        (failed.length
          ? `  ← ${failed.length} 个容器不齐: ` +
            failed.map((f) => `${f.sel}(${f.count}项差${f.diff}px, align=${f.alignItems})`).join('; ')
          : res.length
            ? `  (${res.length} 个容器均齐)`
            : '')
    )
  }

  fs.writeFileSync(path.join(OUT, 'card-equal-height-report.json'), JSON.stringify(report, null, 2))
  const totalFailed = report.reduce((n, r) => n + r.failed, 0)
  console.log(`\n==== 汇总：${report.length} 个页面，${totalFailed} 处肉眼可见不齐 ====`)
  console.log(`报告：${path.join(OUT, 'card-equal-height-report.json')}`)
  await browser.close()
})()
