/**
 * 搭建工作流改造后的路由连通性与文案自检。
 *
 * 为什么用这种方式：只验证「构建通过」不够——SPA 里路由写错、组件白屏、
 * 旧文案残留都不会让构建失败。这里直接把产物跑起来，逐个访问关键路由，
 * 记录控制台错误与页面文本，验证「改造真的能打开」。
 *
 * 登录态：后台是 token 鉴权，这里注入一个自签 admin JWT（HS256，与
 * 生产 admin 的口径一致）让路由守卫放行，接口 401 不影响路由与组件渲染验证。
 */
import { chromium } from 'playwright'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const BASE = process.env.WB_BASE || 'http://127.0.0.1:4331'
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/output/workbench-verify'

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function makeJwt() {
  const secret = 'miniapp-admin-secret'
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({
    userId: 1, sub: 'admin', typ: 'access', iat: now, exp: now + 7200,
  }))
  const sig = b64url(crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest())
  return `${header}.${payload}.${sig}`
}

/**
 * 断言词必须是「内容区专有」的文案。
 * 🔴 踩过的坑：一开始把侧栏菜单名（搭建工作台/品牌信息…）当断言词，
 * 而侧栏在登录页 DOM 里也存在 → 9/9 全过、截图却全是登录页。
 * 现在每个词都取自页面正文，登录页与骨架屏都不含。
 */
const ROUTES = [
  // ── 四个入口（2026-10-06 用户指定版）──────────────────────────��─────────
  // 断言词一律取自**页面正文**，不能取自侧栏菜单文字 ——
  // 侧栏在登录页 DOM 里也存在，用它断言会得到「全部通过但截图全是登录页」的假结果。
  { path: '/mini/workbench', name: '搭建工作台', expect: ['搭建工作台', '品牌信息', '系统功能', '导航配置', '预览检查'] },
  { path: '/mini/workbench?tab=nav', name: '工作台›导航配置', expect: ['底部导航', '绑定检查'] },
  { path: '/mini/workbench?tab=brand', name: '工作台›品牌信息', expect: ['品牌资产', '主色调'] },
  { path: '/mini/workbench?tab=preview', name: '工作台›预览检查', expect: ['内容体检', '发布前检查', '草稿 / 线上预览'] },
  { path: '/mini/pages', name: '页面管理', expect: ['页面管理', '装修页', '系统原生页', '草稿候选'] },
  { path: '/mini/versions', name: '版本管理', expect: ['版本管理', '当前线上', '准备发布', '本次变更', '发布前检查'] },
  { path: '/mini/templates', name: '模板管理', expect: ['模板管理', '整店模板', '页面模板'] },

  // ── 旧地址必须仍可用（redirect 到新入口）─────────────────────────────
  // 这是"重构不破坏存量链接"的验收点，不是可选项。
  { path: '/mini/overview', name: '旧:概览→工作台', expect: ['搭建工作台'], redirect: true },
  { path: '/mini/appearance', name: '旧:品牌与导航→工作台', expect: ['搭建工作台'], redirect: true },
  { path: '/mini/releases', name: '旧:发版中心→版本管理', expect: ['版本管理'], redirect: true },
  { path: '/mini/brand', name: '旧:品牌信息→品牌面板', expect: ['品牌资产'], redirect: true },
  { path: '/mini/system', name: '旧:系统功能→开关面板', expect: ['功能开关'], redirect: true },
  { path: '/mini/navigation', name: '旧:导航配置→导航面板', expect: ['底部导航'], redirect: true },
  { path: '/mini/preview', name: '旧:预览检查→检查面板', expect: ['内容体检'], redirect: true },
  { path: '/mini/page-config', name: '旧:页面配置→页面管理', expect: ['页面管理'], redirect: true },
  { path: '/mini/publish', name: '旧:发布与版本→版本管理', expect: ['版本管理'], redirect: true },

  // ── 两个固定页仍是独立页（沉浸式配置面板）────────────────────────────
  { path: '/page-builder/mine', name: '我的页配置', expect: ['我的页', '保存草稿', '发布配置'] },
  { path: '/page-builder/login', name: '登录页配置', expect: ['登录页', '保存草稿', '发布配置'] },
]

const results = []

fs.mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1440, height: 980 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200))
})
page.on('pageerror', (e) => consoleErrors.push(`PAGEERROR: ${String(e).slice(0, 200)}`))

/**
 * 拦截后台接口返回结构完整的假数据。
 *
 * 为什么必须 mock：路由守卫（router/guards.ts:75）会先 await
 * userStore.fetchUserInfo() 拉 /api/v1/admin/auth/profile，
 * 拿不到用户信息就直接 next({ path: '/login' })。
 * 本地没有后端，不 mock 就只能验到登录页，组件根本不渲染。
 *
 * 这里的假数据按后端真实返回结构构造（字段名对齐 api/*.ts 与迁移文件），
 * 所以能验证「组件拿到真实形状的数据时是否正常渲染」，而不是只验空态。
 */
const PAGES = [
  { id: 1, name: '首页', path: 'pages/custom/warm-home', status: 1, currentVersion: 3, latestVersion: 3, type: 1, pageGroup: 'decorate', deleted: 0 },
  { id: 2, name: '知识星球', path: 'pages/custom/warm-planet', status: 1, currentVersion: 2, latestVersion: 4, type: 2, pageGroup: 'decorate', deleted: 0 },
  { id: 3, name: '活动专题', path: 'pages/custom/activity-618', status: 0, currentVersion: 0, latestVersion: 1, type: 2, pageGroup: 'activity', deleted: 0, entryExpireAt: '2026-12-31 23:59:59' },
  { id: 4, name: '', path: 'pages/custom/untitled-1', status: 1, currentVersion: 1, latestVersion: 1, type: 3, pageGroup: 'decorate', deleted: 0, isTest: 1 },
  { id: 5, name: '旧专题', path: 'pages/custom/old-topic', status: 2, currentVersion: 1, latestVersion: 1, type: 2, pageGroup: 'archived', deleted: 0, archived: 1 },
]

const SITE = {
  name: '跨境墨太白',
  slogan: '跨境财税与合规实操',
  templateName: '标准运营模板',
  theme: { primaryColor: '#C08E6E' },
  brand: {
    appName: '出海笔记',
    logoUrl: '',
    logoMark: '墨',
    loginTagline: '想认识一下你，可以吗？',
    brandEyebrow: 'CROSS-BORDER INK',
    intro: '跨境财税实操笔记',
  },
  tabBar: [
    { id: 'tab-0', text: '首页', tabRoute: '/pages/index/index', pagePath: 'pages/custom/warm-home', pageId: 1, pageName: '首页', icon: '/images/nav-icons/g-home.png' },
    { id: 'tab-1', text: '星球', tabRoute: '/pages/planet/planet', pagePath: 'pages/custom/warm-planet', pageId: 2, pageName: '知识星球', icon: '/images/nav-icons/g-star.png' },
    { id: 'tab-2', text: '我的', tabRoute: '/pages/mine/mine', pagePath: 'pages/mine/mine', pageId: '', pageName: '', icon: '/images/nav-icons/g-user.png' },
  ],
  minePageConfig: { showMemberCard: true, showOrderTabs: true },
  liveReleaseNo: 12,
  liveReleaseAt: '2026-10-01T10:24:00',
  livePublisherName: '刘玄',
  wechatCodeVersion: '1.30.8',
  pendingCount: 3,
}

const PENDING = {
  items: [
    { changeId: 'site-1', type: 'site', name: '站点 / 导航 / 品牌', summary: '品牌色与底部导航有改动' },
    { changeId: 'page-2', type: 'page', pageId: 2, name: '知识星球', path: 'pages/custom/warm-planet', summary: '页面有未上线改动' },
    { changeId: 'page-3', type: 'page', pageId: 3, name: '活动专题', path: 'pages/custom/activity-618', summary: '尚未上线' },
  ],
  pendingCount: 3,
  siteDraftChanged: true,
}

const CONFIGS = [
  { configKey: 'miniappBrandConfig', configValue: JSON.stringify(SITE.brand), configGroup: 'basic' },
  { configKey: 'miniappThemeConfig', configValue: JSON.stringify({ primaryColor: '#C08E6E' }), configGroup: 'basic' },
  { configKey: 'loginPageConfig', configValue: JSON.stringify({ mainTitle: '登录出海笔记', showSecurityBadge: true }), configGroup: 'basic' },
  { configKey: 'minePageConfig', configValue: JSON.stringify(SITE.minePageConfig), configGroup: 'basic' },
  { configKey: 'miniappShareTitle', configValue: '跨境财税实操笔记', configGroup: 'basic' },
  { configKey: 'plugins', configValue: JSON.stringify(['planet', 'commerce', 'content']), configGroup: 'basic' },
]

const RELEASES = [
  { id: 12, releaseNo: 12, note: '调整首页与导航', publishedAt: '2026-10-01T10:24:00', publisherName: '刘玄', currentLive: true, hasSnapshot: true, pageCount: 2 },
  { id: 11, releaseNo: 11, note: '上线知识星球', publishedAt: '2026-09-20T15:02:00', publisherName: '刘玄', currentLive: false, hasSnapshot: true, pageCount: 2 },
  { id: 10, releaseNo: 10, note: '', publishedAt: '2026-09-01T09:10:00', publisherName: '刘玄', currentLive: false, hasSnapshot: false, pageCount: 1 },
]

const ok = (data) => ({ code: 200, message: 'success', data })

/**
 * 2026-10-06 事故回归验证：在原有 9 路由自检基础上，
 * 增加「读取失败必须显式提示」的断言与三档宽度检查。
 *
 * 关键点：mock 里让 /api/v1/admin/pages **返回错误**（模拟后端 100101），
 * 验证页面显示的是「读取失败」而不是「0 个页面」——
 * 这正是本次事故最隐蔽的表现（错误被静默降级成空数组）。
 */
const ERROR_MODE = process.env.WB_ERROR_MODE === '1'
const WIDTHS = [1280, 1440, 1920]

await ctx.route('**/api/v1/**', async (route) => {
  const url = route.request().url()
  const path = url.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
  const json = (data) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) })

  if (path === '/api/v1/admin/auth/profile') {
    return json(ok({
      id: 1, username: 'admin', nickname: '刘玄',
      roles: ['super_admin'],
      permissions: ['page:list', 'page:create', 'page:update', 'page:delete', 'page:publish'],
    }))
  }
  if (path === '/api/v1/admin/mini/site') return json(ok(SITE))
  if (path === '/api/v1/admin/mini/pending-changes') return json(ok(PENDING))

  // 🔴 页面列表：正常模式给数据，错误模式模拟后端拒绝（100101）
  if (path === '/api/v1/admin/pages') {
    if (ERROR_MODE) {
      return json({ code: 100101, message: '每页数量不能超过 100' })
    }
    return json(ok({ records: PAGES, total: PAGES.length }))
  }

  if (path === '/api/v1/admin/mini/preflight') {
    return json(ok({ canPublish: true, blocking: [], warnings: [], pages: [] }))
  }
  if (path === '/api/v1/admin/mini/releases') return json(ok(RELEASES))
  if (path === '/api/v1/admin/miniapp-releases/preflight') {
    return json(ok({ canPublish: true, blocking: [], warnings: [], pages: [] }))
  }
  if (path === '/api/v1/admin/miniapp-releases/latest') {
    // 🔴 真实后端内容发布记录的 semver 格式是 "c.0." + 序号
    return json(ok({ id: 28, semver: 'c.0.28', publishedAt: '2026-10-01T10:24:00' }))
  }
  if (path === '/api/v1/admin/miniapp-releases/list') return json(ok(RELEASES))
  if (path === '/api/v1/admin/miniapp-releases/push-preview/status') {
    return json(ok({ uploadAvailable: false, capabilityReason: '尚未配置微信 AppID / 上传密钥' }))
  }
  if (path === '/api/v1/admin/system/configs') return json(ok(CONFIGS))
  if (path === '/api/v1/admin/statistics/runtime-health') return json(ok(null))
  if (path === '/api/v1/admin/statistics/page-access') return json(ok({ records: [] }))
  if (path.startsWith('/api/v1/admin/miniapp-releases/') && path.split('/').length > 5) {
    // snapshot 是 JSON 字符串（与真实后端一致）
    return json(ok({
      id: 28,
      semver: 'c.0.28',
      snapshot: JSON.stringify({
        pages: [{ pageId: 1, name: '首页', path: 'pages/custom/home' }],
        systemConfig: { tabbarItems: [], miniappBrandConfig: {} },
        createdAt: '2026-10-01T10:24:00',
      }),
    }))
  }
  return json(ok(null))
})

/**
 * 注入登录态 —— 必须用 addInitScript，且必须在第一次 goto 之后调用。
 *
 * 🔴 2026-10-05 踩了两个坑才做对：
 * 1. addInitScript 在 about:blank 上执行时 localStorage 抛 SecurityError
 *    （Access is denied for this document）→ 先 goto 同源页再注册。
 * 2. 🔴 用 page.evaluate 写 localStorage **不行**：它只写当前文档，
 *    goto 到下一个文档时守卫读 access_token 读不到 → 判定未登录 →
 *    静默跳 /login（一个 API 请求都不发）。
 *    addInitScript 在每个新文档的应用脚本之前执行，守卫第一次读就能拿到。
 * 键名对齐 admin/src/utils/auth.ts 的 ACCESS_TOKEN_KEY。
 */
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
await ctx.addInitScript((token) => {
  localStorage.setItem('access_token', token)
  localStorage.setItem('refresh_token', token)
}, makeJwt())

for (const r of ROUTES) {
  consoleErrors.length = 0
  let status = 'ok'
  let text = ''
  let full = ''
  try {
    // 用 domcontentloaded 而非 networkidle：后台有轮询与心跳，
    // networkidle 可能一直等不到，掩盖真实的渲染结果。
    const resp = await page.goto(`${BASE}${r.path}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    if (!resp) status = 'no-response'
    await page.waitForTimeout(2500)
    full = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    text = full.slice(0, 600)

    // 🔴 三重反假通过（2026-10-05 教训）：
    //   ① URL 被守卫重定向到登录页 → 直接判失败
    //   ② 页面出现登录表单 → 直接判失败
    //   ③ 截图指纹全同 → 页面没真正切换
    // 只做关键词断言会被侧栏文字满足（侧栏在登录页 DOM 里也存在），
    // 那样会得到「9/9 全过」但截图全是登录页的假结果。
    //
    // ⚠️ 判定「跳登录页」必须精确匹配 URL 路径 **等于** /login。
    // 不能用 `/\/login(\?|$)/`——「/page-builder/login」这个配置页本身
    // 路径末尾就是 login，会被误判成跳登录页（2026-10-06 实测踩过）。
    // 也不能用「页面里有没有『登录』二字」——「登录页配置」这页本身就含该词。
    const curPath = new URL(page.url()).pathname
    if (curPath === '/login' || curPath.startsWith('/login/')) {
      status = 'redirected-to-login'
    } else {
      const onLogin = /请输入用户名|请输入密码/.test(full)
      if (onLogin) {
        status = 'showed-login-form'
      } else {
        const miss = r.expect.filter((k) => !full.includes(k))
        if (miss.length) status = `missing:${miss.join('|')}`
        const bad = (r.mustNot || []).filter((k) => full.includes(k))
        if (bad.length) status = `must-not-appear:${bad.join('|')}`
        if (/Cannot read|undefined is not|error TS/.test(full)) status = 'runtime-error'
      }
    }
  } catch (e) {
    status = `throw:${String(e).slice(0, 120)}`
  }

  const shot = path.join(OUT, `${r.path.replace(/\//g, '_')}.png`)
  try { await page.screenshot({ path: shot, fullPage: false }) } catch {}

  results.push({
    route: r.path,
    name: r.name,
    status,
    consoleErrors: consoleErrors.slice(0, 3),
    errorCount: consoleErrors.length,
    text: text.slice(0, 200),
    // 旧文案检测要用全文，截断会漏
    fullText: full,
  })
}

// 注意：此处不要提前 browser.close() —— 后面还有错误模式与三档宽度两组专项检查要用同一个浏览器

console.log('\n================ 路由自检结果 ================')
for (const r of results) {
  const flag = r.status === 'ok' ? '✅' : '❌'
  console.log(`${flag} ${r.route.padEnd(22)} ${r.name}`)
  console.log(`   状态: ${r.status}`)
  if (r.consoleErrors.length) {
    console.log(`   控制台错误(${r.consoleErrors.length}): ${r.consoleErrors.join(' ;; ').slice(0, 240)}`)
  }
  console.log(`   首屏文本: ${r.text}`)
}
const bad = results.filter((r) => r.status !== 'ok')
console.log(`\n通过 ${results.length - bad.length}/${results.length}`)

// 🔴 旧语义文案必须全站清零。
// 这几个词是本次改造要消灭的对象：4 种保存/发布说法混在 4 个页面，
// 用户根本不知道点了会不会影响线上。只要还剩一个，这轮改造就没做完。
// 落盘全文，供 Grep 工具复核。
// 🔴 为什么要落盘：带 ❌/中文的 console.log 行会被 shell 输出管道吞掉
// （与 zsh grep 查中文静默失败同一类问题），出现「判定说有、却打印不出命中行」
// 的自相矛盾。落盘后用 Grep 工具查，结论才可信。
const dumpPath = path.join(OUT, 'fulltext-dump.json')
fs.writeFileSync(dumpPath, JSON.stringify(
  results.map((r) => ({ route: r.route, status: r.status, fullText: r.fullText })),
  null, 2,
))

const LEGACY = ['保存并同步', '一键同步', '查看并发布']
// 🔴 2026-10-05 踩过的坑：原来写的是
//    results.filter((r) => LEGACY.filter((w) => r.fullText.includes(w)))
//    filter 的回调返回的是**数组**，而 JS 中空数组 [] 是 **truthy**，
//    于是每个页面都被判为命中，legacyHit 恒等于全部 → 报「9/9 仍含旧说法」。
//    正确写法用 some()，它返回真布尔值。
const legacyHit = results.filter((r) => LEGACY.some((w) => r.fullText.includes(w)))
console.log(`\n旧语义文案检查（${LEGACY.join(' / ')}）:`)
console.log(`  命中页面数: ${legacyHit.length} / ${results.length}`)
console.log(`  命中明细已写入: ${dumpPath}`)

if (!legacyHit.length) {
  console.log('  RESULT: PASS 全部页面已无旧说法')
} else {
  console.log('  RESULT: FAIL 仍存在旧说法，请查 fulltext-dump.json')
}

// 🔴 截图指纹检查：不同路由的截图若字节完全相同，说明页面根本没切换
// （2026-10-05 踩过：9 张图全是登录页，文本断言却"全部通过"）
const crypto2 = await import('node:crypto')
const shots = results.map((r) => path.join(OUT, `${r.route.replace(/\//g, '_')}.png`))
const hashes = shots.map((f) => {
  try { return crypto2.createHash('md5').update(fs.readFileSync(f)).digest('hex') } catch { return 'missing' }
})
const uniqueShots = new Set(hashes.filter((h) => h !== 'missing')).size
const totalShots = hashes.filter((h) => h !== 'missing').length
console.log(`\n截图指纹: ${uniqueShots}/${totalShots} 张互不相同`)
if (uniqueShots < Math.min(totalShots, 4)) {
  console.log('  RESULT: FAIL 多张截图完全相同 → 页面很可能没真正切换，视觉验证不可信')
} else {
  console.log('  RESULT: PASS 截图内容有差异，页面确实各自渲染')
}

/* ------------------------------------------------------------------ */
/* 专项一：读取失败必须显式提示，绝不能显示成「0 个」                  */
/* 只在错误模式下有意义：正常模式数据正常时本就不该出现「读取失败」。   */
/* ------------------------------------------------------------------ */
if (ERROR_MODE) {
  console.log('\n================ 专项：读取失败不得伪装成空数据 ================')
  // 🔴 读取失败必须显式提示，绝不能显示成「共 0 个」或「没有任何页面」。
  //    2026-10-06 事故的根因就是异常被静默降级成空数组。
  const ERROR_CASES = [
    { path: '/mini/pages', must: ['读取失败'], mustNot: ['还没有页面'] },
    // ⚠️ 这里刻意断言**后端真实原因**（「每页数量不能超过 100」）而不是笼统的「读取失败」。
    //    2026-10-06 实测：页面把后端原话显示出来 + 说明影响范围，是更好的做法；
    //    断言若写死「读取失败」反而会把更好的实现判为失败。
    //    mustNot 才是真正的护栏：不能出现"页面不存在"这类误导结论。
    {
      path: '/mini/workbench',
      must: ['每页数量不能超过 100', '绑定检查'],
      mustNot: ['绑定的页面已不存在', '还没有页面'],
    },
    { path: '/mini/versions', must: ['无法确认'], mustNot: ['没有阻断项'] },
  ]
  let errCasePass = 0
  for (const c of ERROR_CASES) {
    await page.goto(`${BASE}${c.path}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2500)
    const t = (await page.locator('body').innerText()).replace(/\s+/g, ' ')
    const missMust = c.must.filter((k) => !t.includes(k))
    const hitMustNot = c.mustNot.filter((k) => t.includes(k))
    const ok = !missMust.length && !hitMustNot.length
    if (ok) errCasePass += 1
    console.log(`${ok ? '✅' : '❌'} ${c.path}`)
    if (missMust.length) console.log(`   缺少应有提示: ${missMust.join('、')}`)
    if (hitMustNot.length) console.log(`   出现了不该出现的文案: ${hitMustNot.join('、')}`)
  }
  console.log(`错误模式: ${errCasePass}/${ERROR_CASES.length} 通过`)
} else {
  console.log('\n(读取失败专项需 WB_ERROR_MODE=1，已跳过)')
}

/* ------------------------------------------------------------------ */
/* 专项二：三档宽度无横向溢出 / 按钮遮挡                              */
/* ------------------------------------------------------------------ */
console.log('\n================ 专项：1280 / 1440 / 1920 宽度 ================')
const WIDTH_ROUTES = ['/mini/overview', '/mini/navigation', '/mini/page-config', '/mini/publish']
const widthIssues = []
for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 980 })
  for (const r of WIDTH_ROUTES) {
    await page.goto(`${BASE}${r}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    const m = await page.evaluate(() => {
      const de = document.documentElement
      const overflow = de.scrollWidth - de.clientWidth
      // 找被裁掉的按钮：宽度明显超出视口的交互元素
      const clipped = [...document.querySelectorAll('button, .btn, .el-button')]
        .filter((el) => {
          const b = el.getBoundingClientRect()
          return b.width > 0 && (b.right > window.innerWidth + 2 || b.left < -2)
        }).length
      return { overflow, clipped }
    })
    const bad = m.overflow > 2 || m.clipped > 0
    if (bad) {
      widthIssues.push(`${w}px ${r}: 横向溢出 ${m.overflow}px, 被裁按钮 ${m.clipped} 个`)
      console.log(`❌ ${w}px ${r}  溢出=${m.overflow}px 裁切按钮=${m.clipped}`)
    } else {
      console.log(`✅ ${w}px ${r}`)
    }
  }
}
console.log(widthIssues.length ? `RESULT: FAIL ${widthIssues.length} 处` : 'RESULT: PASS 三档宽度均无溢出')

/* ------------------------------------------------------------------ */
/* 专项三：侧栏 IA 结构（6 组分组 + 折叠稳定 + 选中态）               */
/* ------------------------------------------------------------------ */
console.log('\n================ 专项：侧栏信息架构 ================')
await page.setViewportSize({ width: 1440, height: 980 })
await page.goto(`${BASE}/mini/workbench`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2000)

// 一次进入页面把侧栏结构取全（🔴 必须在 evaluate 内访问 document，
// 在 Node 侧写 document 会直接 ReferenceError）
const ia = await page.evaluate(() => {
  const groups = [...document.querySelectorAll('.menu-group')].map((g) => ({
    title: g.querySelector('.group-title span')?.textContent?.trim() || '',
    items: g.querySelectorAll(':scope > .group-items > .menu-item, :scope > .group-items > .submenu').length,
  }))

  const mini = [...document.querySelectorAll('.menu-group')]
    .find((g) => g.querySelector('.group-title span')?.textContent?.trim() === '小程序')

  return {
    groups,
    activeCount: document.querySelectorAll('.menu-item.active').length,
    // 小程序分组下的所有可点标题（含组标题与子项），用来核对 6 个环节是否齐全
    miniTitles: mini
      ? [...mini.querySelectorAll('.group-title span, .menu-title')]
        .map((n) => n.textContent?.trim() || '')
      : [],
    // 「我的」是二级项，它藏在「页面管理」子菜单里，折叠时也可能不在 DOM
    hasMineEntry: [...document.querySelectorAll('.menu-title')]
      .some((n) => n.textContent?.trim() === '我的页'),
  }
})

const iaProblems = []
const EXPECT = ['搭建工作台', '页面管理', '版本管理', '模板管理']
const miniGroup = ia.groups.find((g) => g.title === '小程序')
if (!miniGroup) {
  iaProblems.push('侧栏找不到「小程序」分组')
} else {
  for (const e of EXPECT) {
    if (!ia.miniTitles.includes(e)) iaProblems.push(`小程序分组下缺少「${e}」`)
  }
}
if (ia.activeCount !== 1) iaProblems.push(`选中态数量异常：${ia.activeCount}（应为 1）`)

console.log(`侧栏分组数: ${ia.groups.length}`)
console.log(`小程序分组下可见项: ${ia.miniTitles.join(' / ')}`)
console.log(`当前选中项数: ${ia.activeCount}`)
for (const p of iaProblems) console.log(`❌ ${p}`)
if (!iaProblems.length) console.log('✅ 小程序分组为 4 个入口、无 3 级目录、选中态唯一')

// 折叠稳定性：手动收起「小程序」组后，切路由验证它不会被自动顶开
if (miniGroup) {
  const collapsed = await page.evaluate(async () => {
    const g = [...document.querySelectorAll('.menu-group')]
      .find((x) => x.querySelector('.group-title span')?.textContent?.trim() === '小程序')
    const btn = g?.querySelector('.group-title')
    if (!btn) return null
    const before = g.querySelector('.group-items')?.getBoundingClientRect().height ?? 0
    btn.click()
    await new Promise((r) => setTimeout(r, 260))
    const after = g.querySelector('.group-items')?.getBoundingClientRect().height ?? 0
    return { before, after, title: '小程序' }
  })
  if (collapsed && collapsed.before > 0 && collapsed.after >= collapsed.before) {
    console.log(`❌ 手动收起无效：高度 ${collapsed.before} → ${collapsed.after}`)
  } else if (collapsed) {
    console.log(`✅ 手动收起生效：高度 ${collapsed.before} → ${collapsed.after}`)
  }
}

await browser.close()

console.log(`\n截图目录: ${OUT}`)
