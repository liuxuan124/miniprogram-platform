/**
 * 「选中画布组件 → 组件库定位并高亮」验证（2026-10-05）
 *
 * 覆盖：
 *   ① 高亮唯一（不出现多处 active）
 *   ② 自动滚动到目标卡片
 *   ③ 目标落在网格可视区内
 *   ④ 目标已可见时不抖动（滚动位置不变）
 *   ⑤ 搜索/聚焦态下选中会自动复位并定位
 *   ⑥ 分类胶囊打出「含选中项」小圆点，且只有一处
 *
 * 用法：node scripts/verify-panel-locate.mjs [URL]
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const OUT = process.env.OUT || '/tmp/verify-panel-locate.png'

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

const readState = () =>
  page.evaluate(() => {
    const grid = document.querySelector('.component-grid')
    const hits = [...document.querySelectorAll('.component-card.active, .recent-chip.is-selected')]
    const gr = grid?.getBoundingClientRect()
    const first = hits[0]
    const cr = first?.getBoundingClientRect()
    return {
      scrollTop: Math.round(grid?.scrollTop || 0),
      hitCount: hits.length,
      hitText: first ? first.textContent.trim().slice(0, 12) : null,
      hitTop: cr ? Math.round(cr.top) : null,
      hitBottom: cr ? Math.round(cr.bottom) : null,
      gridTop: gr ? Math.round(gr.top) : null,
      gridBottom: gr ? Math.round(gr.bottom) : null,
      dotCount: document.querySelectorAll('.cat-tabs__item.has-selected').length,
      searchText: grid?.querySelector('input')?.value ?? '',
    }
  })

/* ---------- ① 初始状态 ---------- */
stage('初始状态')
const initial = await readState()

/* ---------- ② 点画布上靠后的组件 ---------- */
stage('点画布上位置靠后的组件（精品专栏）')
const items = page.locator('.canvas-item-wrap')
const n = await items.count()
let target = null
for (let i = 0; i < n; i++) {
  const t = (await items.nth(i).innerText().catch(() => '')) || ''
  if (t.includes('精品专栏')) {
    target = i
    break
  }
}
if (target == null) target = 3
await items.nth(target).click({ position: { x: 20, y: 12 } })
await page.waitForTimeout(2200)

const after = await readState()
console.log(`  scrollTop ${initial.scrollTop} → ${after.scrollTop}`)
console.log(`  命中卡片: ${after.hitText}（top=${after.hitTop}，网格 ${after.gridTop}~${after.gridBottom}）`)

check(after.hitCount === 1, `选中态唯一（实测 ${after.hitCount} 处）`)
check(after.scrollTop !== initial.scrollTop, `列表自动滚动（${initial.scrollTop} → ${after.scrollTop}）`)
check(
  after.hitTop !== null &&
    after.hitTop >= after.gridTop - 2 &&
    after.hitTop <= after.gridBottom,
  `目标落进网格可视区（top=${after.hitTop} / ${after.gridTop}~${after.gridBottom}）`,
)
check(after.dotCount === 1, `分类胶囊小圆点唯一（实测 ${after.dotCount}）`)

/* ---------- ③ 再次点同一组件，不应抖动 ---------- */
stage('重复点同一组件（不应抖动）')
await items.nth(target).click({ position: { x: 20, y: 12 } })
await page.waitForTimeout(1400)
const again = await readState()
check(
  Math.abs(again.scrollTop - after.scrollTop) <= 4,
  `目标已可见时不抖动（${after.scrollTop} → ${again.scrollTop}）`,
)

/* ---------- ④ 搜索态下选中能自动复位并定位 ---------- */
stage('先搜索再点画布组件')
const searchInput = page.locator('.component-search input').first()
if (await searchInput.count()) {
  await searchInput.fill('会员')
  await page.waitForTimeout(900)
  const filtered = await readState()
  console.log('  搜索中 scrollTop:', filtered.scrollTop)
  // 换个画布节点
  const other = target === 0 ? 1 : 0
  await items.nth(other).click({ position: { x: 20, y: 12 } })
  await page.waitForTimeout(2200)
  const afterSearch = await readState()
  console.log(`  搜索态点选后 scrollTop: ${afterSearch.scrollTop}，命中 ${afterSearch.hitText}`)
  check(
    afterSearch.hitCount === 1,
    `搜索态下选中仍能高亮唯一目标（实测 ${afterSearch.hitCount}）`,
  )
  check(
    afterSearch.hitTop !== null &&
      afterSearch.hitTop >= afterSearch.gridTop - 2 &&
      afterSearch.hitTop <= afterSearch.gridBottom,
    '搜索态下会自动复位过滤并定位到目标',
  )
} else {
  fail.push('找不到组件库搜索框')
}

await page.screenshot({ path: OUT })

console.log('\n通过：')
ok.forEach((m) => console.log('  OK ' + m))
if (fail.length) {
  console.error('失败：')
  fail.forEach((m) => console.error('  XX ' + m))
}
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}｜截图: ${OUT}`)
await browser.close()
process.exitCode = fail.length ? 1 : 0
