/**
 * 「文章列表」属性面板回归验证（2026-10-05）
 *
 * 覆盖本轮 6 项改动：
 *   ① 手风琴折叠 + 低频区块默认收起
 *   ② 布局缩略图卡片（替代 7 个文字 radio）
 *   ③ 字号/间距迁到「样式」Tab，内容 Tab 不再有视觉字段
 *   ④ 数字控件带滑块与单位
 *   ⑤ 来源文案 4 个占位提示 + 筛选后可用条数提示
 *   ⑥ 研发术语已屏蔽（不出现 type content / query 已配置）
 *   ⑦ 分类标签联动子配置 + 空状态兜底
 *
 * 用法：node scripts/verify-articlelist.mjs [URL]
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const OUT = process.env.OUT || '/tmp/verify-articlelist.png'

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

stage('插入文章列表组件')
await page.locator('.component-card', { hasText: '文章列表' }).first().click()
await page.waitForTimeout(3000)

const panel = page.locator('.article-list-props')
check((await panel.count()) > 0, '文章列表属性面板挂载')
if (!(await panel.count())) {
  fail.forEach((m) => console.error('  XX ' + m))
  await browser.close()
  process.exit(1)
}

/* ── ① 手风琴 ── */
stage('检查手风琴折叠')
const accordion = await page.evaluate(() => {
  const pn = document.querySelector('.article-list-props')
  const items = [...pn.querySelectorAll('.el-collapse-item')]
  const open = items.filter((x) => x.querySelector('.el-collapse-item__wrap') &&
    getComputedStyle(x.querySelector('.el-collapse-item__wrap')).display !== 'none')
  return {
    count: items.length,
    titles: items.map((x) => x.querySelector('.el-collapse-item__header')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 20)),
    openCount: open.length,
    openTitles: open.map((x) => x.querySelector('.el-collapse-item__header')?.innerText.replace(/\s+/g, ' ').trim().slice(0, 10)),
  }
})
console.log('  分区:', JSON.stringify(accordion.titles))
console.log('  默认展开:', JSON.stringify(accordion.openTitles))
check(accordion.count === 5, `5 个折叠分区（实测 ${accordion.count}）`)
check(
  accordion.openTitles.some((t) => t.includes('文章展示')) &&
    !accordion.openTitles.some((t) => t.includes('来源标签')),
  '高频分区默认展开、来源标签默认收起',
)

/* ── ② 布局缩略图卡片 ── */
stage('检查布局选择器')
const layoutPicker = await page.evaluate(() => {
  const pn = document.querySelector('.article-list-props')
  const items = [...pn.querySelectorAll('.layout-pick__item')]
  return {
    count: items.length,
    names: items.map((b) => b.querySelector('.layout-pick__name')?.textContent.trim()),
    thumbs: pn.querySelectorAll('.alt').length,
    hasRadio: !!pn.querySelector('.el-radio-button'),
    activeName: pn.querySelector('.layout-pick__item.is-on .layout-pick__name')?.textContent.trim(),
    tip: pn.querySelector('.layout-pick__tip')?.textContent.replace(/\s+/g, ' ').trim(),
  }
})
console.log('  布局:', JSON.stringify(layoutPicker.names))
check(layoutPicker.count === 7, `7 种布局都可点（实测 ${layoutPicker.count}）`)
check(layoutPicker.thumbs === 7, `每种布局都有缩略骨架图（${layoutPicker.thumbs}/7）`)
check(!layoutPicker.hasRadio, '布局不再用文字 radio 按钮')
check(!!layoutPicker.activeName, `当前选中项有高亮（${layoutPicker.activeName}）`)

/* ── 点其它布局能切换 ── */
const gridItem = page.locator('.layout-pick__item').filter({ hasText: '双列网格' }).first()
if (await gridItem.count()) {
  await gridItem.click()
  await page.waitForTimeout(900)
  const after = await page.evaluate(() => ({
    active: document.querySelector('.layout-pick__item.is-on .layout-pick__name')?.textContent.trim(),
    canvasGrid: document.querySelectorAll('[class*=layout-grid]').length,
  }))
  check(after.active === '双列网格', `点缩略图切换布局（当前 ${after.active}）`)
  check(after.canvasGrid > 0, `画布同步切换到双列网格（layout-grid × ${after.canvasGrid}）`)
}

/* ── ③ 样式字段已迁到样式 Tab ── */
stage('检查样式字段归位')
const contentTab = await page.evaluate(() => {
  const pn = document.querySelector('.article-list-props')
  const labels = [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
  return labels
})
const fontInContent = contentTab.filter((t) => /字号/.test(t))
const gapInContent = contentTab.filter((t) => /间距/.test(t))
check(fontInContent.length === 0, `内容 Tab 无字号字段（实测：${fontInContent.join('/') || '无'}）`)
check(gapInContent.length === 0, `内容 Tab 无间距字段（实测：${gapInContent.join('/') || '无'}）`)

/* 切到样式 Tab 看迁移是否生效 */
stage('切到样式 Tab')
const styleTab = page.locator('.props-tabs .el-tabs__item').filter({ hasText: '样式' }).first()
if (await styleTab.count()) {
  await styleTab.scrollIntoViewIfNeeded().catch(() => {})
  await styleTab.click({ force: true }).catch(() => {})
  await page.waitForTimeout(1000)
  const stylePane = await page.evaluate(() => {
    const pn = document.querySelector('.al-style')
    if (!pn) return { missing: true }
    const labels = [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
    return {
      labels,
      sliders: pn.querySelectorAll('.num-slider').length,
      units: pn.querySelectorAll('.num-slider__unit').length,
    }
  })
  console.log('  样式 Tab:', JSON.stringify(stylePane))
  check(!stylePane.missing, '样式 Tab 渲染出文章列表专属样式面板')
  if (!stylePane.missing) {
    check(
      stylePane.labels.some((l) => /间距/.test(l)),
      `样式 Tab 有间距字段（${stylePane.labels.join('/')}）`,
    )
    check(
      stylePane.labels.filter((l) => /字号/.test(l)).length === 2,
      `样式 Tab 有 2 个字号字段（实测 ${stylePane.labels.filter((l) => /字号/.test(l)).length}）`,
    )
    check(stylePane.sliders === 3, `3 个滑块控件（实测 ${stylePane.sliders}）`)
    check(stylePane.units === 3, `3 个 px 单位标注（实测 ${stylePane.units}）`)
  }
  // 切回内容 Tab
  const contentTabBtn = page.locator('.props-tabs .el-tabs__item').filter({ hasText: '内容' }).first()
  await contentTabBtn.click({ force: true }).catch(() => {})
  await page.waitForTimeout(800)
}

/* ── ④ 研发术语屏蔽 ── */
stage('检查术语屏蔽')
const rawText = await page.evaluate(
  () => document.querySelector('.article-list-props')?.innerText || '',
)
check(!/type\s*content/.test(rawText), '界面不再出现 `type content`')
check(!/query\s*已配置/.test(rawText), '界面不再出现 `query 已配置 N 项`')
check(!/传给列表接口/.test(rawText), '界面不再出现「传给列表接口 tag 参数」')
check(/已绑定内容库/.test(rawText), '改用业务化摘要「已绑定内容库」')
const hintCount = await page.evaluate(
  () => document.querySelectorAll('.article-list-props .wb-field-hint').length,
)
check(hintCount >= 8, `说明收进 ? 气泡（${hintCount} 个）`)

/* ── ⑤ 来源标签：占位提示 + 可用条数提示 ── */
stage('展开来源标签分区')
const srcHeader = page.locator('.article-list-props .el-collapse-item__header').filter({ hasText: '来源标签' }).first()
if (await srcHeader.count()) {
  await srcHeader.click().catch(() => {})
  await page.waitForTimeout(700)
  // 开启「显示标签」才会出现文案输入框
  const sw = page.locator('.source-tag-fields .el-form-item').filter({ hasText: '显示标签' }).locator('.el-switch').first()
  if (await sw.count()) {
    await sw.click().catch(() => {})
    await page.waitForTimeout(1000)
  }
  const ph = await page.evaluate(() => {
    const pn = document.querySelector('.source-tag-fields')
    if (!pn) return { missing: true }
    return [...pn.querySelectorAll('.el-form-item')]
      .map((it) => ({
        label: it.querySelector('.el-form-item__label')?.textContent.trim(),
        placeholder: it.querySelector('input')?.placeholder || '',
      }))
      .filter((x) => /文案$/.test(x.label || ''))
  })
  console.log('  来源文案占位:', JSON.stringify(ph))
  if (!ph.missing) {
    check(ph.length === 4, `4 个来源文案输入框（实测 ${ph.length}）`)
    check(
      ph.every((x) => /^默认：/.test(x.placeholder)),
      `4 个都显示系统默认值（${ph.map((x) => x.placeholder).join(' / ')}）`,
    )
  }
} else {
  fail.push('找不到「来源标签」折叠分区')
}

/* ── ⑥ 分类标签联动 ── */
stage('检查分类标签联动')
const catSw = page.locator('.article-list-props .el-form-item').filter({ hasText: '分类标签' }).locator('.el-switch').first()
if (await catSw.count()) {
  await catSw.click().catch(() => {})
  await page.waitForTimeout(900)
  const linked = await page.evaluate(() => {
    const pn = document.querySelector('.article-list-props')
    const labels = [...pn.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())
    return {
      hasTabStyle: labels.some((l) => /标签样式/.test(l)),
      hasScope: labels.some((l) => /分类范围/.test(l)),
      hasEmpty: labels.some((l) => /无内容时/.test(l)),
    }
  })
  console.log('  联动:', JSON.stringify(linked))
  check(linked.hasTabStyle, '开启分类标签后展开「标签样式」')
  check(linked.hasScope, '开启分类标签后展开「分类范围」')
  check(linked.hasEmpty, '提供「无内容时」兜底配置')
} else {
  fail.push('找不到「分类标签」开关')
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
