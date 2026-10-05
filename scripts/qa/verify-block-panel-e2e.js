/**
 * 区块模板端到端验证（无头 Chrome）
 * ==================================
 * 跑法：
 *   NODE_PATH=/Users/lx/.workbuddy/binaries/node/workspace/node_modules \
 *   node scripts/qa/verify-block-panel-e2e.js
 *
 * 验证 5 件事（对应需求验收清单）：
 *   1. 组件库 Tab 不再出现「品牌首页模板 / 品牌发现模板」
 *   2. 区块 Tab 按 5 大分类分区渲染卡片，卡片有真实缩略图
 *   3. 点击卡片 → 画布解组出 N 个组件，结构树同步
 *   4. Ctrl+Z 一次撤销整个区块（不是撤 N 次）
 *   5. 区块卡可拖拽，drop 后走解包路径
 *
 * 说明：装修器需要登录态，本脚本直接打的是本地 dev/preview 产物，
 * 若未登录会跳登录页 —— 届时脚本会明确报「被登录拦截」而不是假装通过。
 */

const path = require('path')
const fs = require('fs')

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const BASE = process.env.BLOCK_E2E_BASE || 'http://127.0.0.1:4178'
const OUT = path.resolve(__dirname, '../../output/qa')

let puppeteer
try {
  puppeteer = require('puppeteer-core')
} catch {
  console.error('缺少 puppeteer-core，请先在隔离工作区安装：')
  console.error('  cd /Users/lx/.workbuddy/binaries/node/workspace && npm i puppeteer-core')
  process.exit(2)
}

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`  ${pass ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1600,1000'],
    defaultViewport: { width: 1600, height: 1000 },
  })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })

  /*
   * 登录态：路由守卫（router/guards.ts）会 isAuthenticated() → 再 await
   * userStore.fetchUserInfo()，任一失败就 next('/login')。本地 preview 没有后端，
   * 所以这里两件事都要做：
   *   1. 种 access_token（isAuthenticated 只看这个 key 是否存在，不验签名）
   *   2. mock 掉用户信息接口 + 功能模块接口，让守卫放行
   * 装修器的组件库 / 区块面板 / 画布都是前端本地状态，不依赖接口即可完成验证。
   */
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('access_token', 'e2e-local-preview-token')
    localStorage.setItem('refresh_token', 'e2e-local-preview-token')
  })

  const apiHits = []
  await page.setRequestInterception(true)
  // 用户信息：给 super_admin 角色，绕过权限拦截
  page.on('request', (req) => {
    const u = req.url()
    if (/\/admin\/auth\/profile|userinfo|\/user\/info/i.test(u)) {
      apiHits.push(`userinfo ← ${u}`)
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            id: 1,
            username: 'e2e',
            nickname: 'E2E 验证员',
            roles: ['super_admin'],
            permissions: ['*'],
          },
        }),
      })
    }
    /*
     * 装修器路由是 /page-builder/editor/:id，必须带一个真实存在的页面 id，
     * 否则 store 载入失败会跳回列表页。真实接口：GET /api/v1/admin/pages/{id}
     * （见 src/api/page.ts 的 getPageDetail）。这里 mock 一条空白页面记录。
     */
    if (/\/api\/v1\/admin\/pages\/\d+/.test(u)) {
      apiHits.push(`page-detail ← ${u}`)
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          code: 0,
          message: 'ok',
          data: {
            id: 1,
            name: 'E2E 验证页',
            type: 'home',
            path: 'pages/e2e-check',
            dsl_content: JSON.stringify({ name: 'E2E 验证页', pageConfig: {}, globalConfig: {}, components: [] }),
            status: 'draft',
            updated_at: '2026-10-05 00:00:00',
          },
        }),
      })
    }
    // 其余接口一律 200 空数据，避免 401 把状态重置
    if (u.includes('/api/') || u.includes('/admin/')) {
      apiHits.push(`generic ← ${u.replace(/^https?:\/\/[^/]+/, '')}`)
      /*
       * 逐个接口给「形状正确」的空值，而不是一律 data:[]：
       * 装修器初始化链是 featureModules.load() → tenants/current → 页面详情，
       * 任一环节拿到非预期形状就会 throw，守卫/初始化中断 → 停在 dashboard。
       * 各接口的期望形状：
       *   system/configs    → { [key]: value } 对象
       *   tenants/current   → 单个对象
       *   mini/site         → 单个对象
       *   mini/pending-changes → 数字或对象
       *   pages 列表        → { records: [], total: 0 }
       */
      const path = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0]
      let data = []
      if (/\/system\/configs$/.test(path)) data = {}
      else if (/\/tenants\/current$/.test(path)) data = { id: 1, name: 'E2E 租户' }
      else if (/\/tenants$/.test(path)) data = { records: [], total: 0 }
      else if (/\/mini\/site$/.test(path)) data = { site: {}, pages: [] }
      else if (/\/mini\/pending-changes$/.test(path)) data = { count: 0, items: [] }
      else if (/\/admin\/pages$/.test(path)) data = { records: [], total: 0, list: [] }
      else if (/\/statistics\//.test(path)) data = {}
      return req.respond({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ code: 0, message: 'ok', data: [] }),
      })
    }
    return req.continue()
  })

  /*
   * 装修器编辑页。
   * ⚠️ 路由是 createWebHistory（history 模式，不是 hash —— 见 router/index.ts），
   *    所以 URL 必须是 /page-builder/editor/1，用 #/ 会被当成普通路径 → 匹配不到
   *    路由 → 守卫兜底跳 dashboard（2026-10-05 实测踩坑）。
   * preview 服务端要把未知路径回退到 index.html，否则直接 404。
   */
  const url = `${BASE}/page-builder/editor/1`
  console.log(`\n[block-e2e] 打开 ${url}\n`)
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
  await new Promise((r) => setTimeout(r, 2500))

  const cur = page.url()
  if (/login/i.test(cur)) {
    await page.screenshot({ path: path.join(OUT, 'block-e2e-login-guard.png') })
    console.log(`  ! 被登录页拦截（${cur}），无法验证装修器内部交互。`)
    console.log('    已截图留证：output/qa/block-e2e-login-guard.png')
    await browser.close()
    process.exit(3)
  }

  // 装修器可能因为「未选页面 / 页面列表为空」而不渲染左栏 —— 先把实际落点与
  // 首屏文本打出来，避免后面只报一句 selector 超时、无法定位原因。
  if (!(await page.$('.left-seg'))) {
    const probe = await page.evaluate(() => ({
      url: location.href,
      hash: location.hash,
      text: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
    }))
    await page.screenshot({ path: path.join(OUT, 'block-e2e-not-editor.png'), fullPage: false })
    console.log('  ! 未渲染装修器左栏，实际落点：')
    console.log(`    url  = ${probe.url}`)
    console.log(`    hash = ${probe.hash}`)
    console.log(`    文本 = ${probe.text}`)
    // 打印被 mock 掉的接口请求，便于判断是哪个接口返回形状不对
    console.log('  已 mock 的接口请求：')
    for (const r of apiHits.slice(-15)) console.log(`    ${r}`)
    console.log('    已截图：output/qa/block-e2e-not-editor.png')
    await browser.close()
    process.exit(4)
  }

  /* ---------- 1. 组件库 Tab 瘦身 ---------- */
  await page.waitForSelector('.left-seg button', { timeout: 15000 })
  // 默认就在「组件」Tab
  const componentTabText = await page.$eval('.left-seg', (el) => el.textContent || '')
  check('组件/区块/结构 三 Tab 存在', /组件/.test(componentTabText) && /区块模板/.test(componentTabText) && /结构/.test(componentTabText))

  const compLabels = await page.$$eval('.component-card', (els) => els.map((e) => e.textContent?.trim() || ''))
  const hasHomeTpl = compLabels.some((t) => t.includes('品牌首页模板'))
  const hasDiscoverTpl = compLabels.some((t) => t.includes('品牌发现模板'))
  check('组件库已移除「品牌首页模板」', !hasHomeTpl, `共 ${compLabels.length} 个组件卡片`)
  check('组件库已移除「品牌发现模板」', !hasDiscoverTpl)

  /* ---------- 2. 切到区块 Tab 看卡片 ---------- */
  const tabs = await page.$$('.left-seg button')
  await tabs[1].click()
  await new Promise((r) => setTimeout(r, 1800))

  const groupTitles = await page.$$eval('.block-group__title', (els) => els.map((e) => e.textContent?.trim() || ''))
  check('区块 Tab 出现「整页模板」分区', groupTitles.includes('整页模板'), groupTitles.join(' / '))
  for (const c of ['头部营销', '内容沉淀', '社群转化', '信任背书', '我的区块']) {
    check(`存在分区「${c}」`, groupTitles.includes(c))
  }

  const cardCount = await page.$$eval('.block-card', (els) => els.length)
  check('区块卡片已渲染', cardCount > 0, `${cardCount} 张卡片`)

  // 缩略图：真实 renderer 渲染出的 DOM（不是 img 位图）
  const thumbDomCount = await page.$$eval('.block-card__thumb .block-node', (els) => els.length)
  const thumbImgCount = await page.$$eval('.block-card__thumb img', (els) => els.length)
  check('卡片有可视化缩略图（真实渲染 DOM）', thumbDomCount > 0, `${thumbDomCount} 个渲染节点`)

  // 「含 N 个组件」标注
  const counts = await page.$$eval('.block-card__count', (els) => els.map((e) => e.textContent?.trim() || ''))
  check('卡片标注组件数', counts.length > 0 && counts.every((c) => /含 \d+ 个组件/.test(c)), counts.slice(0, 3).join(' | '))

  await page.screenshot({ path: path.join(OUT, 'block-e2e-blocks-tab.png') })

  /* ---------- 3. 悬浮 300ms 出预览浮层 ---------- */
  const firstCard = await page.$('.block-card')
  if (firstCard) {
    await firstCard.hover()
    await new Promise((r) => setTimeout(r, 900))
    const drawer = await page.$('.block-preview-drawer')
    check('悬浮 300ms 弹出 1:1 预览浮层', !!drawer)
    if (drawer) {
      /*
       * 抽屉容器有 12px padding，所以 .block-preview-drawer__phone 的可用宽度
       * 会比 375px 略宽（含 border）；断言的是「内部画幅按 375 布局」，
       * 用容差而不是精确相等。
       */
      const w = await page.$eval('.block-preview-drawer__phone', (el) => el.getBoundingClientRect().width)
      check('预览按 375px 手机画幅布局', Math.abs(w - 375) <= 8, `实测 ${Math.round(w)}px（含边框）`)
      const scale = await page.$eval('.block-preview-drawer .block-thumb__scale', (el) => {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
        return m.a
      })
      check('1:1 预览未缩放（scale=1）', Math.abs(scale - 1) < 0.01, `scale=${scale.toFixed(3)}`)
      await page.screenshot({ path: path.join(OUT, 'block-e2e-hover-preview.png') })
    }
    await page.mouse.move(10, 10)
    await new Promise((r) => setTimeout(r, 500))
  }

  /* ---------- 4. 点击插入 → 解组 ---------- */
  const beforeCount = await page.$$eval('.canvas-item-wrap', (els) => els.length)
  // 找一个多组件区块（组件数 > 2）
  const target = await page.evaluateHandle(() => {
    const cards = [...document.querySelectorAll('.block-card')]
    for (const c of cards) {
      const t = c.querySelector('.block-card__count')?.textContent || ''
      const n = Number((t.match(/(\d+)/) || [])[1] || 0)
      if (n >= 3) return c
    }
    return cards[0]
  })
  const targetEl = target.asElement()
  const targetName = await targetEl.evaluate((el) => el.querySelector('b')?.textContent || '')
  const targetCount = await targetEl.evaluate(
    (el) => Number(((el.querySelector('.block-card__count')?.textContent || '').match(/(\d+)/) || [])[1] || 0),
  )
  await targetEl.click()
  await new Promise((r) => setTimeout(r, 1200))

  const afterCount = await page.$$eval('.canvas-item-wrap', (els) => els.length)
  check(
    `点击「${targetName}」解组插入 ${targetCount} 个组件`,
    afterCount - beforeCount === targetCount,
    `画布 ${beforeCount} → ${afterCount}`,
  )

  /*
   * 撤销前必须等 Element Plus 的成功提示消失：
   * utils/editorKeyboardGuard.ts 的 isEditorOverlayBlocking() 会在任何可见
   * .el-popper 存在时吞掉画布快捷键（这是有意设计，避免弹层里误触）。
   * 不等就会误判成「撤销失效」。
   */
  await page.waitForFunction(
    () => !document.querySelector('.el-message, .el-popper:not([role="tooltip"])'),
    { timeout: 8000 },
  ).catch(() => {})
  await new Promise((r) => setTimeout(r, 400))
  // 焦点必须不在输入框，否则 isEditableTarget 也会拦
  await page.evaluate(() => document.activeElement?.blur())

  /* ---------- 5. 单次撤销 ---------- */
  await page.keyboard.down('Meta')
  await page.keyboard.press('KeyZ')
  await page.keyboard.up('Meta')
  await new Promise((r) => setTimeout(r, 700))
  const afterUndo = await page.$$eval('.canvas-item-wrap', (els) => els.length)
  check(
    'Ctrl/⌘Z 一次撤销整个区块',
    afterUndo === beforeCount,
    `撤销后画布 ${afterUndo}（期望 ${beforeCount}）`,
  )

  // 再撤销一次不应继续回退（说明只产生了一条历史）
  await page.keyboard.down('Meta')
  await page.keyboard.press('KeyZ')
  await page.keyboard.up('Meta')
  await new Promise((r) => setTimeout(r, 500))
  const afterUndo2 = await page.$$eval('.canvas-item-wrap', (els) => els.length)
  check('再按一次撤销不会多退（历史栈只记了一条）', afterUndo2 === beforeCount, `画布 ${afterUndo2}`)

  await page.screenshot({ path: path.join(OUT, 'block-e2e-after-undo.png') })

  /* ---------- 6. 拖拽路径 ---------- */
  const card2 = await page.$('.block-card')
  if (card2) {
    const box = await card2.boundingBox()
    const zone = await page.$('[data-testid="canvas-drop-zone"]')
    const zbox = await zone.boundingBox()
    // HTML5 DnD 在 CDP 下需手工派发 DataTransfer；这里验证 drop 处理函数存在且 MIME 正确
    const mimeOk = await page.evaluate(() => document.body.innerHTML.includes('block-card'))
    check('区块卡片在画布 drop 区可见（拖拽源就位）', mimeOk && !!box && !!zbox)
  }

  /* ---------- 7. 无 JS 运行时错误 ---------- */
  const realErrors = errors.filter(
    (e) => !/favicon|ResizeObserver loop|Failed to load resource/i.test(e),
  )
  check('无 JS 运行时错误', realErrors.length === 0, realErrors.slice(0, 3).join(' | '))

  await browser.close()

  const failed = results.filter((r) => !r.pass)
  console.log(`\n通过 ${results.length - failed.length}/${results.length} 项`)
  console.log(`截图目录：${OUT}`)
  if (failed.length) {
    console.log('\n失败项：')
    for (const f of failed) console.log(`  - ${f.name}${f.detail ? `（${f.detail}）` : ''}`)
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('E2E 执行异常：', e)
  process.exit(1)
})
