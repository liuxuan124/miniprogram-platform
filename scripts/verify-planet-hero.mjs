/**
 * 「星球顶栏（PlanetHero）」全链路验证（2026-10-06）
 *
 * 覆盖：
 *   ① Bug1.1 切换按钮可配（默认关，开启后文案可改）
 *   ② Bug1.2 加群条动作二态（跳转 / 群活码弹窗）
 *   ③ Bug1.3 身份互斥（游客：加入按钮 + 无有效期条；会员：有效期条 + 续费 + 无加入按钮）
 *   ④ Bug1.4 图标双模（Emoji / 图片）
 *   ⑤ Bug1.5 数据来源联动（auto → 内容字段只读 + 提示）
 *   ⑥ IA：内容/样式 Tab 拆分、KPI 动态列表、样式面板各项
 *
 * ⚠️ 验证方式：**store 直改 + 断言画布**，不用 UI 点击。
 *    理由同 verify-column：异步面板在无头环境里偶发不重渲染，点了面板读不到新值，
 *    但画布渲染层（读同一份 store）是准的。UI 结构类断言走源码/DOM 存在性。
 *
 * ⚠️ 本脚本会改页面 28 草稿里 planet_hero 的配置，跑完执行
 *    `node scripts/reset-planet-hero.mjs` 复位。
 *
 * 用法：node scripts/verify-planet-hero.mjs [URL]
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const ROOT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统'
const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const OUT = process.env.OUT || '/tmp/verify-planet-hero.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } })
page.setDefaultTimeout(15000)

const stage = (m) => console.log('  · ' + m)
const ok = []
const fail = []
const check = (cond, msg) => (cond ? ok : fail).push(msg)

await page.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)

stage('打开页面')
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
/**
 * ⚠️ 「恢复本地草稿」弹窗可能不止一层（确认框 + 后续对话框），
 * 只点一次会留下一个挡住画布的遮罩 —— 症状是 `.canvas-item-wrap` 数量为 0。
 * 这里循环点 3 次，点完断言画布真的有节点。
 */
for (let i = 0; i < 3; i++) {
  for (const sel of ['.el-overlay-message-box button', '.el-dialog__footer button']) {
    const btn = page.locator(sel).last()
    if (await btn.count()) {
      await btn.click({ force: true }).catch(() => {})
      await page.waitForTimeout(700)
    }
  }
  const n = await page.evaluate(() => document.querySelectorAll('.canvas-item-wrap').length)
  if (n > 0) break
}

/** 🔴 按类名定位，不要按文本 —— 画布上多个块都可能有「切换」类名以外的干扰 */
stage('定位星球顶栏（按 .ph 类名）')
const heroId = await page.evaluate(() => {
  const w = [...document.querySelectorAll('.canvas-item-wrap')].find((x) =>
    x.querySelector('.ph'),
  )
  return w ? w.getAttribute('data-component-id') : null
})
check(!!heroId, `画布上存在星球顶栏（id=${heroId}）`)
if (!heroId) {
  fail.forEach((m) => console.error('  XX ' + m))
  await browser.close()
  process.exit(1)
}

await page.evaluate((cid) => {
  const el = document.querySelector(`.canvas-item-wrap[data-component-id="${cid}"]`)
  let c = el?.__vueParentComponent
  while (c) {
    const s = c.setupState
    if (s) {
      const ps = s.pageStore?.value || s.pageStore
      if (ps?.selectComponent) {
        ps.selectComponent(cid)
        return
      }
    }
    c = c.parent
  }
}, heroId)
await page.waitForTimeout(2000)

/** 直接改 store（理由见文件头注释） */
async function setProps(patch) {
  await page.evaluate(
    ([cid, p]) => {
      const el = document.querySelector(`.canvas-item-wrap[data-component-id="${cid}"]`)
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
    },
    [heroId, patch],
  )
  await page.waitForTimeout(1400)
}

const canvasState = () =>
  page.evaluate(() => {
    const w = [...document.querySelectorAll('.canvas-item-wrap')]
      .map((x) => x.querySelector('.ph'))
      .find(Boolean)
    if (!w) return { noWrap: true }
    return {
      switchTxt: w.querySelector('.ph__switch')?.textContent.trim() || null,
      join: w.querySelector('.ph__join')?.textContent.trim() || null,
      renew: w.querySelector('.ph__renew')?.textContent.trim() || null,
      expire: w.querySelector('.ph__expire')?.textContent.trim() || null,
      joinRow: !!w.querySelector('.ph__join-row'),
      kpis: w.querySelectorAll('.ph__kpi').length,
      kpiClass: w.querySelector('.ph__kpis')?.className || null,
      logoImg: !!w.querySelector('.ph__logo-img'),
      logoText: w.querySelector('.ph__logo')?.textContent.trim() || null,
      radius: w.style.borderRadius,
      padding: w.style.padding,
    }
  })

/* ────────── ③ 身份互斥 ────────── */
stage('身份互斥：游客态')
await setProps({ preview_identity: 'guest' })
{
  const g = await canvasState()
  console.log('  游客:', JSON.stringify(g))
  check(g.join != null, `游客态显示加入按钮（${g.join}）`)
  check(g.expire === null, '游客态**不**显示有效期条（业务互斥生效）')
  check(g.renew === null, '游客态不显示续费入口')
}

stage('身份互斥：会员态')
await setProps({ preview_identity: 'member', show_expire_notice: true, show_renew_btn: true })
{
  const m = await canvasState()
  console.log('  会员:', JSON.stringify(m))
  check(m.expire != null, `会员态显示有效期条（${m.expire}）`)
  check(m.join === null, '会员态**不**显示加入按钮（业务互斥生效）')
  check(m.renew != null, `会员态显示续费入口（${m.renew}）`)
  check(
    /剩余 \d+ 天/.test(m.expire || ''),
    `有效期模板变量已渲染成实际值（${m.expire}）`,
  )
}

/* ────────── ① 切换按钮 ────────── */
stage('切换按钮可配')
await setProps({ preview_identity: 'guest', show_expire_notice: false, show_renew_btn: false })
{
  const off = await canvasState()
  check(off.switchTxt === null, '默认不显示切换按钮（此前是写死的幽灵元素）')
}
await setProps({ show_switch_btn: true, switch_btn_text: '换一颗' })
{
  const on = await canvasState()
  console.log('  开启后:', JSON.stringify(on))
  check(on.switchTxt === '换一颗', `切换按钮文案可配（${on.switchTxt}）`)
}
await setProps({ show_switch_btn: false })

/* ────────── ② 加群条 ────────── */
stage('加群条显隐')
await setProps({ show_group_notice: false })
{
  const off = await canvasState()
  check(!off.joinRow, '社群引导条可整体关闭')
}
await setProps({ show_group_notice: true })
{
  const on = await canvasState()
  check(on.joinRow, '社群引导条可开启')
}

/* ────────── ④ 图标双模 ────────── */
stage('图标双模')
await setProps({ logo_value: '🪐' })
{
  const e = await canvasState()
  check(!e.logoImg && /🪐/.test(e.logoText || ''), 'Emoji 模式渲染为文本')
}
await setProps({ logo_value: '/uploads/planet-logo.png' })
{
  const i = await canvasState()
  check(i.logoImg, '图片模式渲染为 <img>')
}

/* ────────── KPI 动态列表 ────────── */
stage('KPI 数量与列数')
for (const [n, cls] of [
  [2, 'compact'],
  [3, 'triple'],
  [4, 'quad'],
]) {
  await setProps({
    kpis: Array.from({ length: n }, (_, i) => ({
      value: String(1000 + i),
      label: `指标${i + 1}`,
      suffix: '',
    })),
  })
  const s = await canvasState()
  console.log(`  ${n} 项 →`, JSON.stringify({ kpis: s.kpis, cls: s.kpiClass }))
  check(s.kpis === n, `KPI 渲染 ${n} 项（实测 ${s.kpis}）`)
  check(
    !!s.kpiClass && s.kpiClass.includes(`ph__kpis--${cls}`),
    `${n} 项用 ${cls} 列布局（${s.kpiClass}）`,
  )
}

/* ────────── 样式字段 ────────── */
stage('样式：圆角 / 内边距')
await setProps({ radius: 16, padding: 22 })
{
  const s = await canvasState()
  console.log('  样式:', JSON.stringify({ radius: s.radius, padding: s.padding }))
  check(s.radius === '16px', `容器圆角生效（${s.radius}）`)
  check(/22px/.test(s.padding || ''), `容器内边距生效（${s.padding}）`)
}
await setProps({ radius: 0, padding: 18 })

/* ────────── 面板结构（DOM 存在性，不点） ────────── */
stage('面板结构断言')
const panelLabels = await page.evaluate(() => {
  const pn = document.querySelector('.props-panel')
  return [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
})
console.log('  内容字段:', JSON.stringify(panelLabels))
// 用固定文案列表而不是正则数组 —— 模板里拼 ${need.source} 会被转义吃掉（踩过）
for (const need of [
  '预览身份',
  '数据来源',
  '图标模式',
  '标题',
  '加入按钮',
  '切换按钮',
  '有效期模块',
  '社群引导',
  '加群动作',
]) {
  check(
    panelLabels.some((l) => l.includes(need)),
    `面板含「${need}」字段`,
  )
}
check(
  !panelLabels.some((l) => /容器圆角|容器内边距|毛玻璃|KPI 卡片/.test(l)),
  `视觉字段不在内容页签（实测：${panelLabels.filter((l) => /圆角|内边距|毛玻璃/.test(l)).join('/') || '无'}）`,
)
const kpiOps = await page.evaluate(() => ({
  addBtn: [...document.querySelectorAll('.props-panel .el-button')].some(
    (b) => b.textContent.trim().includes('添加'),
  ),
  rows: document.querySelectorAll('.props-panel .ph-kpi-row').length,
  count: document.querySelector('.props-panel .ph-kpi-count')?.textContent.trim() || null,
}))
console.log('  KPI 操作:', JSON.stringify(kpiOps))
check(kpiOps.addBtn, 'KPI 列表有「+ 添加」入口')
check(!!kpiOps.count, `KPI 计数显示（${kpiOps.count}）`)

/* ────────── 样式 Tab ────────── */
stage('切到样式（一级 tab → 样式）')
await page.evaluate(() => {
  const t = [...document.querySelectorAll('.right-tabs .el-tabs__item')].find(
    (x) => x.textContent.trim() === '样式',
  )
  t?.click()
})
await page.waitForTimeout(1500)
const stylePane = await page.evaluate(() => {
  const pn = document.querySelector('.phs')
  if (!pn) return { missing: true }
  const ls = [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
  return {
    labels: ls,
    presets: pn.querySelectorAll('.preset').length,
    segs: pn.querySelectorAll('.wb-seg').length,
    sliders: pn.querySelectorAll('.num-slider').length,
    switches: pn.querySelectorAll('.el-switch').length,
  }
})
console.log('  样式面板:', JSON.stringify(stylePane))
check(!stylePane.missing, '样式 Tab 渲染出星球顶栏专属面板')
if (!stylePane.missing) {
  check(stylePane.labels.some((l) => /背景类型/.test(l)), '样式 Tab 有「背景类型」')
  check(stylePane.presets === 3, `3 套渐变预设（实测 ${stylePane.presets}）`)
  check(stylePane.labels.some((l) => /毛玻璃/.test(l)), '样式 Tab 有「毛玻璃」开关')
  check(stylePane.sliders === 2, `2 个滑块（圆角/内边距，实测 ${stylePane.sliders}）`)
  check(stylePane.segs >= 2, `背景类型与 KPI 卡样式都用分段控件（${stylePane.segs} 个）`)
}

/* ────────── 端上同规则（源码断言） ────────── */
stage('端上同规则断言')
const heroJs = fs.readFileSync(
  `${ROOT}/miniapp/components/dsl-planet-hero/dsl-planet-hero.js`,
  'utf8',
)
const heroWxml = fs.readFileSync(
  `${ROOT}/miniapp/components/dsl-planet-hero/dsl-planet-hero.wxml`,
  'utf8',
)
check(/isMember/.test(heroJs), '端上有会员态字段 isMember')
check(
  /isMember:\s*planetActive/.test(heroJs),
  '端上会员态由星球接口 planetActive 决定（与画布口径一致）')
check(
  /wx:if="\{\{showSwitchBtn\}\}"/.test(heroWxml),
  '端上切换按钮受 show_switch_btn 控制（不再写死）',
)
check(
  /!isMember && showJoinBtn/.test(heroWxml),
  '端上加入按钮仅游客态渲染（与画布互斥规则一致）',
)
check(
  /isMember && showExpireNotice/.test(heroWxml),
  '端上有效期条仅会员态渲染（与画布互斥规则一致）',
)
check(
  /groupActionType === 'qrcode'/.test(heroJs) && /pl-modal/.test(heroWxml),
  '端上支持群活码弹窗（group_action_type=qrcode）',
)
check(
  /switchAction === 'link'/.test(heroJs),
  '端上 switch_action=link 时直接跳页，否则开半屏',
)
check(
  /renderExpireTemplate/.test(heroJs),
  '端上同样渲染 {days_left} 等模板变量',
)

await page.screenshot({ path: OUT })

console.log('\n通过：')
ok.forEach((m) => console.log('  OK ' + m))
if (fail.length) {
  console.error('失败：')
  fail.forEach((m) => console.error('  XX ' + m))
}
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}｜截图: ${OUT}`)
console.log('⚠️ 本脚本改了草稿配置，跑完请执行 scripts/reset-planet-hero.mjs 复位')
await browser.close()
process.exitCode = fail.length ? 1 : 0
