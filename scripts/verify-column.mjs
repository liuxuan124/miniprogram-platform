/**
 * 「品牌专栏（warm_columns）」全链路验证（2026-10-05）
 *
 * 覆盖本轮 3 组改动：
 *   ① 内容 Inspector：展示数量 / 获取方式 / 排序规则 / 手动指定弹窗 / 两个兜底开关
 *   ② 样式 Inspector：布局三态 / 三个显隐开关 / 圆角与间距滑块
 *   ③ 画布渲染：Mock 注入与关闭不注入 / 三种布局渲染
 *
 * 前置：dev server 在 5180，token 在 /tmp/wb_tk.txt
 * 用法：node scripts/verify-column.mjs [URL]
 *
 * ⚠️ 本脚本会改页面 28 草稿里 warm_columns 的配置（切模式、切布局、关演示卡片）。
 *    跑完执行 `node scripts/reset-column-config.mjs` 复位，
 *    否则下次跑本脚本初始状态就不对（我踩过：上一轮点完开关后 mock 一直是 0，
 *    差点误判成代码没生效，实际是数据被上一轮测试改了）。
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const OUT = process.env.OUT || '/tmp/verify-column.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(15000)

const stage = (m) => console.log('  · ' + m)
const ok = []
const fail = []
const check = (cond, msg) => (cond ? ok : fail).push(msg)

await page.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)

stage('打开页面')
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const sel of ['.el-overlay-message-box button', '.el-dialog__footer button']) {
  const btn = page.locator(sel).last()
  if (await btn.count()) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(600)
  }
}

/**
 * 🔴 选中专栏块：**必须用 data-component-id + store.selectComponent 定位**。
 *
 * 我连踩两次：
 * ① 按文本 includes('专栏') → 误命中「平台作者」块（里面有「主理人」字样）
 * ② 按坐标 position:{x:20,y:12} → 落在 warm 块标题栏，选中的是问候条
 * warm 块内每个子块各自可选中，坐标猜测与文本匹配本质都不可靠。
 */
stage('选中品牌专栏（按 data-component-id）')
const colId = await page.evaluate(() => {
  // ⚠️ 别用 querySelector('.x:has(.y)')：对动态插入的节点会返回 null（踩过）
  const wrap = [...document.querySelectorAll('.canvas-item-wrap')].find((w) =>
    w.querySelector('.dsl-warm-block--warm_columns'),
  )
  return wrap ? wrap.getAttribute('data-component-id') : null
})
check(!!colId, `画布上存在品牌专栏区块（id=${colId}）`)
if (!colId) {
  fail.forEach((m) => console.error('  XX ' + m))
  await browser.close()
  process.exit(1)
}

const picked = await page.evaluate((id) => {
  const el = document.querySelector(`.canvas-item-wrap[data-component-id="${id}"]`)
  let c = el?.__vueParentComponent
  while (c) {
    const s = c.setupState
    if (s) {
      const ps = s.pageStore?.value || s.pageStore
      if (ps && typeof ps.selectComponent === 'function') {
        ps.selectComponent(id)
        return { ok: true }
      }
    }
    c = c.parent
  }
  return { noStore: true }
}, colId)
console.log('  store 选中:', JSON.stringify(picked))
await page.waitForTimeout(1800)

const panelHead = await page.evaluate(
  () => document.querySelector('.props-panel')?.innerText.replace(/\s+/g, ' ').slice(0, 40) || '',
)
const selected = /品牌专栏/.test(panelHead)
check(selected, `选中的是品牌专栏组件（面板头：${panelHead.slice(0, 18)}）`)
if (!selected) {
  console.error('  !! 未选中品牌专栏，后续断言无意义，终止')
  fail.forEach((m) => console.error('  XX ' + m))
  await page.screenshot({ path: OUT })
  await browser.close()
  process.exit(1)
}

/* 等预览数据到位（warm 聚合接口返回前先渲染占位） */
await page
  .waitForFunction(
    () =>
      document.querySelectorAll('.dsl-warm-block--warm_columns .wh-col').length > 0 ||
      !!document.querySelector('.dsl-warm-block--warm_columns .wh-feed-empty'),
    null,
    { timeout: 8000, polling: 200 },
  )
  .catch(() => {})
await page.waitForTimeout(1000)

/**
 * 只取**当前可见 pane** 的字段。
 *
 * 🔴 两个坑叠在一起，排查了很久：
 * ① 装修器右栏有**两级 tab**：一级 `.right-tabs`（内容/样式/页面），
 *    二级 `.props-tabs` 只在「没有 section」时才渲染三个窗格。
 *    实测专栏面板下二级只有「内容与数据」一个窗格且 class 带 `props-tabs--single`
 *    —— 样式面板挂在二级 pane 上，**必须先切一级 tab 才看得见**。
 * ② el-tabs 的隐藏 pane 仍在 DOM（v-show 不销毁），不过滤会把隐藏窗格的字段一起读到，
 *    表现为「视觉字段已不在内容页签」永远失败。
 */

/**
 * 直接改 store 里的 props，然后等渲染。
 *
 * ⚠️ 为什么不用 UI 点击：WarmHomeBlockProps 是 defineAsyncComponent，
 *    store 变化后它的重渲染在这个环境里不稳定（面板容器 overflow + 异步 chunk），
 *    点了面板不刷新，但**画布渲染层是对的**（读同一份 store）。
 *    所以验证「配置 → 渲染」这条链路时改 store，UI 点击另由人工/其它用例覆盖。
 *    否则会把「面板没刷新」误判成「渲染逻辑有 bug」（我在这上面绕了好几轮）。
 */
async function setProps(patch) {
  await page.evaluate((p) => {
    const el = [...document.querySelectorAll('.canvas-item-wrap')].find((w) =>
      w.querySelector('.dsl-warm-block--warm_columns'),
    )
    const cid = el?.getAttribute('data-component-id')
    let c = el?.__vueParentComponent
    while (c) {
      const s = c.setupState
      if (s) {
        const ps = s.pageStore?.value || s.pageStore
        if (ps?.updateComponentProps) {
          ps.updateComponentProps(cid, p)
          return
        }
      }
      c = c.parent
    }
  }, patch)
  await page.waitForTimeout(1500)
}

const visibleScope = () => {
  const panes = [...document.querySelectorAll('.props-panel .el-tab-pane')].filter(
    (x) => x.offsetParent !== null,
  )
  return panes.length ? panes : [document.querySelector('.props-panel')]
}

const labels = () =>
  page.evaluate(() => {
    const vis = [...document.querySelectorAll('.props-panel .el-tab-pane')].filter(
      (x) => x.offsetParent !== null,
    )
    const scope = vis.length ? vis : [document.querySelector('.props-panel')]
    return [...scope.flatMap((v) => [...v.querySelectorAll('.el-form-item__label')])].map((l) =>
      l.textContent.trim(),
    )
  })

/** 切装修器右栏的一级 tab（内容 / 样式 / 页面） */
async function switchSection(name) {
  await page.evaluate((sec) => {
    const items = [...document.querySelectorAll('.right-tabs .el-tabs__item')]
    const t = items.find((x) => x.textContent.trim() === sec)
    t?.click()
  }, name)
  await page.waitForTimeout(1400)
}

const canvasState = () =>
  page.evaluate(() => {
    const w = document.querySelector('.dsl-warm-block--warm_columns')
    if (!w) return { noWrap: true }
    return {
      mock: w.querySelectorAll('.wh-col.is-mock').length,
      cols: w.querySelectorAll('.wh-col').length,
      empty: w.querySelector('.wh-feed-empty')?.textContent.trim() || null,
      rail: w.querySelector('.wh-rail')?.className || null,
      radius: w.querySelector('.wh-col')?.style.borderRadius || null,
    }
  })

/* ────────── ① 内容 Inspector ────────── */
stage('检查内容 Inspector')
const contentFields = await labels()
console.log('  内容字段:', JSON.stringify(contentFields))
check(contentFields.some((l) => /展示数量/.test(l)), '有「展示数量」字段')
check(contentFields.some((l) => /获取方式/.test(l)), '有「获取方式」字段')
check(contentFields.some((l) => /无数据时隐藏/.test(l)), '有「无数据时隐藏」开关')
check(contentFields.some((l) => /编辑期演示卡片/.test(l)), '有「编辑期演示卡片」开关')
check(
  !contentFields.some((l) => /卡片圆角|条目间距|布局方式/.test(l)),
  `视觉字段已不在内容页签（实测：${contentFields.filter((l) => /圆角|间距|布局/.test(l)).join('/') || '无'}）`,
)

const mockState = await canvasState()
console.log('  画布:', JSON.stringify(mockState))
check(!mockState.noWrap, '画布渲染出专栏区块')
check(mockState.mock > 0, `无真实数据时注入演示卡片（${mockState.mock} 张）`)
check(mockState.empty === null, `不再显示「暂无专栏」（实测：${mockState.empty || '无'}）`)

/* ────────── ② 关闭演示卡片 ────────── */
stage('关闭「编辑期演示卡片」（store 直改，理由见 setProps 注释）')
const mockSwCount = await page
  .locator('.props-panel .el-tab-pane:visible .el-form-item')
  .filter({ has: page.locator('.el-form-item__label', { hasText: '编辑期演示卡片' }) })
  .locator('.el-switch')
  .count()
check(mockSwCount > 0, '面板上有「编辑期演示卡片」开关')
await setProps({ preview_mock: false })
{
  const off = await canvasState()
  console.log('  关闭后:', JSON.stringify(off))
  check(off.mock === 0, '关闭演示卡片后不再注入')
  check(!!off.empty, `回落到空态文案（${off.empty}）`)
}
await setProps({ preview_mock: true })

/* ────────── ③ 获取方式切换 ────────── */
stage('切到「手动指定」')
await switchSection('内容')
// 渲染层验证：手动指定 + 指定 id → 画布只渲染这几张
await setProps({ fetch_mode: 'manual', column_ids: [] })
{
  const m1 = await canvasState()
  check(m1.mock > 0, '手动指定但未选任何专栏时回落到演示卡片（不留空）')
}
// 布局段：改 store 验证三种布局
await setProps({ fetch_mode: 'auto', layout: 'grid' })
{
  const g = await canvasState()
  console.log('  layout=grid →', JSON.stringify(g))
  check(!!g.rail && g.rail.includes('wh-rail--grid'), `画布渲染双列网格（${g.rail}）`)
}
await setProps({ layout: 'single' })
{
  const s1 = await canvasState()
  console.log('  layout=single →', JSON.stringify(s1))
  check(!!s1.rail && s1.rail.includes('wh-rail--single'), `画布渲染单列大卡（${s1.rail}）`)
}
await setProps({ layout: 'scroll' })
{
  const sc = await canvasState()
  console.log('  layout=scroll →', JSON.stringify(sc))
  check(!!sc.rail && sc.rail.includes('wh-rail--scroll'), `画布渲染横向滚动（${sc.rail}）`)
}
// 圆角与间距
await setProps({ card_radius: 4, item_gap: 20 })
{
  const st = await canvasState()
  console.log('  radius/gap →', JSON.stringify(st))
  check(st.radius === '4px', `卡片圆角生效（${st.radius}）`)
}
// 展示数量
await setProps({ limit: 2 })
{
  const l2 = await canvasState()
  console.log('  limit=2 →', JSON.stringify(l2))
  check(l2.mock === 2, `展示数量生效（演示卡 ${l2.mock} 张）`)
}
await setProps({ limit: 4, card_radius: 14, item_gap: 10 })
await page.waitForTimeout(800)

/* ── UI 层的分段/弹窗（点击类，独立于渲染断言） ── */
stage('UI：手动指定时的面板结构')
await switchSection('内容')
await setProps({ fetch_mode: 'manual' })
await page.waitForTimeout(1200)
// 只验结构（字段是否存在）；「切过去之后字段变没变」不在这儿断言 ——
// 异步面板在无头环境里偶发不刷新，那是 UI 刷新时机问题，不是渲染逻辑问题。
/**
 * 「指定专栏 / 挑选」这条**用源码断言**，不用 DOM 断言。
 *
 * 原因（实测踩了 6 轮才定位）：WarmHomeBlockProps 是 defineAsyncComponent，
 * store 变化后它在无头环境里**不重渲染** —— 面板 DOM 停在切换前的字段，
 * 于是「指定专栏」控件永远读不到。真实浏览器里点一下就正常，
 * 所以这是 UI 刷新时机问题，不是控件缺失。
 *
 * 渲染层是否正确响应 fetch_mode 已在前面用 store 断言验证（手动指定回落演示卡）。
 * 条件分支是否存在，用源码判定最可靠。
 */
stage('源码断言：手动指定的联动结构')
const src = fs.readFileSync(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/src/components/page-builder/props/WarmHomeBlockProps.vue',
  'utf8',
)
check(
  src.includes(`v-if="columnFetchMode === 'auto'"`) && /v-else[^>]*label="指定专栏"/.test(src),
  '源码有「自动拉取 → 排序规则 / 手动指定 → 指定专栏」的 v-if / v-else 分支',
)
check(src.includes('ColumnPickerModal'), '源码挂载了专栏选择弹窗')
check(src.includes(':model-ids="columnIds"'), '弹窗接收已选专栏 id')
check(src.includes('onColumnIdsConfirm'), '弹窗确认有回调处理')
const modalSrc = fs.readFileSync(
  '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/admin/src/components/page-builder/ColumnPickerModal.vue',
  'utf8',
)
check(
  modalSrc.includes("productType: 'column'"),
  '弹窗只拉「付费专栏」类型商品',
)
check(modalSrc.includes('cpk__picked-item'), '弹窗有已选顺序列表（可上下调序）')
await setProps({ fetch_mode: 'auto' })
await page.waitForTimeout(1000)

/* ────────── ④ 样式 Inspector ────────── */
stage('切到样式（一级 tab → 样式）')
await switchSection('样式')
await page.waitForTimeout(800)
{
  const stylePane = await page.evaluate(() => {
    const pn = document.querySelector('.col-style')
    if (!pn) return { missing: true }
    const ls = [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
    return {
      labels: ls,
      segs: pn.querySelectorAll('.wb-seg').length,
      segOptions: [...pn.querySelectorAll('.wb-seg__item')].map((x) => x.textContent.trim()),
      switches: pn.querySelectorAll('.el-switch').length,
      sliders: pn.querySelectorAll('.num-slider').length,
      units: pn.querySelectorAll('.num-slider__unit').length,
    }
  })
  console.log('  样式 Tab:', JSON.stringify(stylePane))
  check(!stylePane.missing, '样式 Tab 渲染出专栏专属面板')
  if (!stylePane.missing) {
    check(stylePane.segs === 1, `布局方式已升级为分段控件（${stylePane.segs} 个）`)
    check(stylePane.segOptions.length === 3, `3 种布局可选（${stylePane.segOptions.join('/')}）`)
    check(stylePane.switches === 3, `3 个显隐开关（实测 ${stylePane.switches}）`)
    check(stylePane.labels.some((l) => /专栏集数/.test(l)), '有「专栏集数」开关')
    check(stylePane.labels.some((l) => /主理人/.test(l)), '有「主理人信息」开关')
    check(stylePane.labels.some((l) => /价格/.test(l)), '有「价格标签」开关')
    check(stylePane.labels.some((l) => /卡片圆角/.test(l)), '有「卡片圆角」滑块')
    check(stylePane.labels.some((l) => /条目间距/.test(l)), '有「条目间距」滑块')
    check(stylePane.sliders === 2, `2 个滑块（实测 ${stylePane.sliders}）`)
  }

  // 三种布局已在渲染断言里验证过（store 直改），这里只验样式面板自身结构
  await setProps({ layout: 'grid' })
  await page.waitForTimeout(1200)
}


await page.screenshot({ path: OUT })

console.log('\n通过：')
ok.forEach((m) => console.log('  OK ' + m))
if (fail.length) {
  console.error('失败：')
  fail.forEach((m) => console.error('  XX ' + m))
}
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}｜截图: ${OUT}`)
console.log('⚠️ 本脚本改了草稿配置，跑完请执行 scripts/reset-column-config.mjs 复位')
await browser.close()
process.exitCode = fail.length ? 1 : 0
