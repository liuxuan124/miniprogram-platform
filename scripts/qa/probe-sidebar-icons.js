/**
 * 侧边栏「审核中心 / 全局资源位」图标渲染探针
 *
 * 背景：Sidebar.vue 的 rawMenuGroups 里两条菜单早已写了 icon: 'Warning' / 'Promotion'，
 * 但 iconMap 白名单没注册 → iconMap[item.icon] 为 undefined → el-icon 静默渲染空。
 * 静态 grep 产物只能证明代码进包，本探针证明「浏览器里真的有 svg」。
 *
 * 已知坑（来自 prod-deploy-preflight / probe-prod-render）：
 *  1) 登录态 localStorage key 是 access_token（admin/src/utils/auth.ts）
 *  2) protocolTimeout 默认 30s 不够 → launch 要 180000
 *  3) SPA 内 history.pushState 不触发 vue-router → 跳转只能整页 goto()
 *  4) networkidle2 在长轮询页面永远等不到 → 用 domcontentloaded + 固定 sleep
 *  5) 选择器写错会误判「空白」→ 先把真实 DOM 结构 dump 出来再断言
 */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = path.join(__dirname, '../../output/probe')
const BASE = 'https://admin.zfculture.site'

function log(...a) { console.log(...a) }

;(async () => {
  fs.mkdirSync(OUT, { recursive: true })

  // 自签 admin JWT（HS256，payload 与 prod-deploy-preflight 一致）
  const secretRes = await new Promise((resolve, reject) => {
    require('child_process').exec(
      `ssh zfculture 'sudo grep -E "^JWT_SECRET=" /opt/miniprogram-platform/config/backend.env | cut -d= -f2- | tr -d "\\r\\n"'`,
      { maxBuffer: 1024 * 1024 },
      (e, so) => (e ? reject(e) : resolve(so.trim())),
    )
  })
  const SECRET = secretRes.trim()
  if (!SECRET) { log('❌ 拿不到 JWT_SECRET'); process.exit(1) }

  const crypto = require('crypto')
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const iat = Math.floor(Date.now() / 1000)
  const header = b64({ alg: 'HS256', typ: 'JWT' })
  const payload = b64({ userId: 1, sub: 'admin', typ: 'access', iat, exp: iat + 7200 })
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${payload}`).digest('base64url')
  const token = `${header}.${payload}.${sig}`

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 180000,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  })

  const consoleErrors = []
  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1440, height: 900 })
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
    })

    // 注入登录态
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.evaluate((t) => {
      localStorage.setItem('access_token', t)
      localStorage.setItem('token', t)
    }, token)

    // 整页跳转到运营中心任一子页（触发侧边栏渲染）
    await page.goto(`${BASE}/ops/moderation`, { waitUntil: 'domcontentloaded' })
    await new Promise((r) => setTimeout(r, 6000))

    // 先 dump 真实 DOM 结构，避免凭想象写选择器
    const dump = await page.evaluate(() => {
      const items = [...document.querySelectorAll('.menu-icon')]
      return {
        url: location.href,
        menuIconCount: items.length,
        // 前 8 个菜单项的标题 + 其 menu-icon 里的 svg 情况
        sample: items.slice(0, 10).map((el) => {
          const li = el.closest('li, .el-sub-group, a, div')
          const title = li ? (li.innerText || '').trim().slice(0, 12) : '?'
          const svg = el.querySelector('svg')
          return {
            title,
            hasSvg: !!svg,
            svgHTML: svg ? svg.outerHTML.slice(0, 60) : null,
            box: (() => { const r = el.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}` })(),
          }
        }),
        // 运营中心分组下的完整菜单文本
        opsGroupText: (() => {
          const all = [...document.querySelectorAll('.menu-icon')]
            .map((el) => (el.closest('li, .el-sub-group, a, div')?.innerText || '').trim())
            .filter((t) => /私域引流|搜索运营|审核中心|全局资源位/.test(t))
          return all
        })(),
      }
    })

    log('=== URL ===\n' + dump.url)
    log('=== .menu-icon 元素总数: ' + dump.menuIconCount + ' ===')
    log('=== 前 10 个菜单项 ===')
    dump.sample.forEach((s, i) => {
      log(`  [${i}] "${s.title}" hasSvg=${s.hasSvg} box=${s.box} ${s.svgHTML || ''}`)
    })
    log('=== 运营中心四项匹配到的文本 ===')
    dump.opsGroupText.forEach((t) => log('  · ' + t))

    await page.screenshot({ path: path.join(OUT, 'sidebar-icons.png'), fullPage: false })

    // 精确定位：找到文本为「审核中心」「全局资源位」的元素，看其 .menu-icon 内有无 svg
    const targeted = await page.evaluate(() => {
      const want = ['审核中心', '全局资源位', '私域引流', '搜索运营']
      const res = {}
      for (const w of want) {
        const nodes = [...document.querySelectorAll('*')].filter(
          (el) => el.children.length === 0 && (el.textContent || '').trim() === w,
        )
        if (!nodes.length) { res[w] = 'NOT_FOUND'; continue }
        const el = nodes[0]
        const iconBox = el.closest('.menu-item, li, a, div')?.querySelector('.menu-icon')
          || el.parentElement?.querySelector('.menu-icon')
        if (!iconBox) { res[w] = 'NO_ICON_BOX'; continue }
        const svg = iconBox.querySelector('svg')
        res[w] = svg
          ? `SVG_OK path=${svg.querySelectorAll('path').length} box=${Math.round(iconBox.getBoundingClientRect().width)}x${Math.round(iconBox.getBoundingClientRect().height)}`
          : 'SVG_MISSING'
      }
      return res
    })

    log('=== 目标断言 ===')
    let pass = true
    for (const w of ['审核中心', '全局资源位']) {
      const v = targeted[w]
      const ok = String(v).startsWith('SVG_OK')
      if (!ok) pass = false
      log(`  ${ok ? '✅' : '❌'} ${w}: ${v}`)
    }
    log('  (对照组) 私域引流: ' + targeted['私域引流'] + ' | 搜索运营: ' + targeted['搜索运营'])

    log('=== console 错误 ===')
    if (!consoleErrors.length) log('  无')
    else consoleErrors.slice(0, 8).forEach((e) => log('  · ' + e))

    log('\n截图: ' + path.join(OUT, 'sidebar-icons.png'))
    log(pass ? '\n🎉 PASS: 两个图标均已渲染' : '\n❌ FAIL')
    process.exitCode = pass ? 0 : 1
  } finally {
    await browser.close()
  }
})().catch((e) => { console.error('探针异常:', e); process.exit(2) })
