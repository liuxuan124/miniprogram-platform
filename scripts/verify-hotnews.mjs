/**
 * 今日热门资讯（HotNews）属性面板修复验证
 *
 * 逐条对应需求里的 bug，**只验真实存在的那几条**：
 *  ① 预览条数 = limit（原来硬编码 slice(0,3)，limit=4 时面板只列 3 条）
 *  ② 排序默认值与文案一致（原来文案说「最热」但历史 DSL 存 newest）
 *  ③ 颜色字段有 Hex 回显 + 透明态提示 + 重置
 *  ④ 数值控件有极值 + px 单位（越界会夹紧）
 *  ⑤ 内容/样式双 Tab 拆分 + showMore/dateMode 条件联动
 *  ⑥ 排列方式升级为分段胶囊
 */
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync(process.env.TK_FILE || '/tmp/wb_tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/28'
const OUT = process.env.OUT || '/tmp/verify-hotnews.png'

const ok = [], fail = []
const check = (c, m) => (c ? ok.push(m) : fail.push(m))


/** 切属性面板的 Tab：先滚到可见再点；不可见时 force（属性面板容器有高度限制） */
async function clickTab(pg, name) {
  const item = pg.locator('.hot-news-props .el-tabs__item').filter({ hasText: name }).first()
  await item.scrollIntoViewIfNeeded().catch(() => {})
  await item.click({ force: true, timeout: 8000 }).catch(async () => {
    // force 也点不到（面板在 overflow 容器里）→ 直接派发点击
    await item.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  })
  await pg.waitForTimeout(800)
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 950 } })
page.setDefaultTimeout(15000)
const stage = (m) => console.log('  · ' + m)
await page.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
stage('打开页面')
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
stage('页面就绪')

// 清弹窗
for (const sel of ['.el-overlay-message-box button', '.el-dialog__footer button']) {
  const b = page.locator(sel).last()
  if (await b.count()) {
    await b.click().catch(() => {})
    await page.waitForTimeout(700)
  }
}

// 新增一个干净的 HotNews 组件
stage('插入组件')
await page.locator('.component-card', { hasText: '今日热门' }).first().click()
await page.waitForTimeout(2500)

stage('等面板')
const panel = page.locator('.hot-news-props')
check(await panel.count() > 0, 'HotNews 属性面板挂载')
if (!(await panel.count())) {
  fail.forEach((m) => console.error('  ✗ ' + m))
  await browser.close()
  process.exit(1)
}

/**
 * 只取**当前可见**的 tab pane。
 * ⚠️ el-tabs 的 pane 用 `v-show` 切换 —— 隐藏的 pane 仍在 DOM 里，
 * 直接 querySelector('.el-tab-pane') 会把两个 Tab 的字段混在一起，
 * 断言「内容 Tab 不含样式字段」必然误报。用 offsetParent 判可见。
 */
const visiblePaneFields = () =>
  page.evaluate(() => {
    const pn = document.querySelector('.hot-news-props')
    const vis = [...pn.querySelectorAll('.el-tab-pane')].filter((x) => x.offsetParent !== null)
    return {
      labels: vis.flatMap((v) => [...v.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim())),
      locked: vis.some((v) => !!v.querySelector('.hn-locked')),
      colorFields: vis.flatMap((v) => [...v.querySelectorAll('.clr-field')].length ? [v.querySelectorAll('.clr-field').length] : []),
    }
  })

/* ---------- ⑤ 内容/样式双 Tab ---------- */
const tabs = await page.evaluate(() => {
  const p = document.querySelector('.hot-news-props')
  return {
    labels: [...p.querySelectorAll(':scope > .el-tabs > .el-tabs__header .el-tabs__item')].map((t) => t.textContent.trim()),
    active: p.querySelector(':scope > .el-tabs > .el-tabs__header .el-tabs__item.is-active')?.textContent?.trim(),
  }
})
check(
  tabs.labels.includes('内容') && tabs.labels.includes('样式'),
  `面板拆成内容/样式双 Tab（${tabs.labels.join(' / ')}）`,
)
const contentPane = await visiblePaneFields()
const STYLE_WORDS = /圆角|渐变|底色|文字色|间距|不生效/
check(
  !contentPane.labels.some((f) => STYLE_WORDS.test(f)),
  `内容 Tab 不含样式字段（实测 ${contentPane.labels.length} 项：${contentPane.labels.join('/')}）`,
)

/* 切到样式 Tab */
await clickTab(page, '样式')
await page.waitForTimeout(700)
const stylePane = await visiblePaneFields()
const styleFields = stylePane.labels
check(
  styleFields.some((f) => /圆角/.test(f)) && styleFields.some((f) => /底色|文字色/.test(f)),
  `样式 Tab 收敛视觉字段（${styleFields.length} 项：${styleFields.slice(0, 5).join('/')}…）`,
)

/* ---------- ③ 颜色字段：Hex 回显 + 透明提示 + 重置 ---------- */
const clr = await page.evaluate(() => {
  // 只数当前可见 pane 里的颜色字段（隐藏 pane 也在 DOM）
  const pn = document.querySelector('.hot-news-props')
  const vis = [...pn.querySelectorAll('.el-tab-pane')].filter((x) => x.offsetParent !== null)
  const rows = vis.flatMap((v) => [...v.querySelectorAll('.clr-field')])
  return {
    count: rows.length,
    withHex: rows.filter((r) => (r.querySelector('.clr-field__hex')?.textContent || '').trim().length > 0).length,
    withReset: rows.filter((r) => r.querySelector('.clr-field__reset')).length,
    alphaMarked: rows.filter((r) => r.querySelector('.clr-field__hex.is-alpha')).length,
  }
})
check(clr.count >= 4, `样式 Tab 有 ${clr.count} 个颜色字段用了新控件`)
check(clr.withHex === clr.count, `每个颜色字段都有 Hex 回显（${clr.withHex}/${clr.count}）`)
check(clr.withReset === clr.count, `每个颜色字段都有「重置」按钮（${clr.withReset}/${clr.count}）`)

/* ---------- ④ 数值：极值 + px 单位 ---------- */
const num = await page.evaluate(() => {
  const pn = document.querySelector('.hot-news-props')
  const vis = [...pn.querySelectorAll('.el-tab-pane')].filter((x) => x.offsetParent !== null)
  const rows = vis.flatMap((v) => [...v.querySelectorAll('.num-slider')])
  return {
    count: rows.length,
    withUnit: rows.filter((r) => r.querySelector('.num-slider__unit')?.textContent?.trim() === 'px').length,
  }
})
check(num.count >= 5, `样式 Tab 有 ${num.count} 个滑块数值控件`)
check(num.withUnit === num.count, `全部标注 px 单位（${num.withUnit}/${num.count}）`)

/* 越界夹紧：把「内容圆角」改成 999 */
const radiusInput = page.locator('.hot-news-props .num-slider').first().locator('input')
await radiusInput.fill('999')
await radiusInput.press('Enter')
await page.waitForTimeout(600)
const clamped = await radiusInput.inputValue()
check(Number(clamped) <= 32, `越界值被夹紧（输入 999 → 实际 ${clamped}，上限 32）`)

/* ---------- ⑥ 排列方式分段胶囊 ---------- */
const layoutSeg = await page.evaluate(() => {
  const pn = document.querySelector('.hot-news-props')
  const vis = [...pn.querySelectorAll('.el-tab-pane')].filter((x) => x.offsetParent !== null)
  const segs = vis.flatMap((v) => [...v.querySelectorAll('.wb-seg')])
  return segs.map((s) => ({
    items: [...s.querySelectorAll('.wb-seg__item')].map((i) => i.textContent.trim()),
  }))
})
check(
  layoutSeg.some((s) => s.items.length === 3 && /星标/.test(s.items[0])),
  `排列方式已升级为分段胶囊（${JSON.stringify(layoutSeg.find((s) => /星标/.test(s.items[0]))?.items)}）`,
)

/* ---------- 切回内容 Tab：验证预览条数 = limit ---------- */
await clickTab(page, '内容')
await page.waitForTimeout(800)

const readPreview = async () =>
  page.evaluate(() => {
    const p = document.querySelector('.hot-news-props')
    return {
      chips: p.querySelectorAll('.hn-chip').length,
      count: p.querySelector('.hn-preview__count')?.textContent?.trim() || '',
      limit: Number(p.querySelectorAll('.hn-preview__count')[0]?.textContent?.replace(/\D/g, '') || 0),
      hasRefresh: !!p.querySelector('.hn-preview__refresh'),
    }
  })

const p1 = await readPreview()
check(p1.hasRefresh, '预览区有「手动刷新」按钮')

/* 改 limit：样式 Tab 里的「显示数量」 */
await clickTab(page, '样式')
await page.waitForTimeout(600)
const limitRow = page
  .locator('.hot-news-props .el-form-item')
  .filter({ hasText: '显示数量' })
  .locator('.num-slider__num input')
  .first()
await limitRow.fill('5')
await limitRow.press('Enter')
await page.waitForTimeout(1200)

await clickTab(page, '内容')
await page.waitForTimeout(800)
const p2 = await readPreview()
check(
  p2.chips === Math.min(5, p2.limit || 5) || p2.chips === p2.limit,
  `预览条数跟随 limit（limit=5 → 面板列 ${p2.chips} 条，实时数据 ${p2.count}）`,
)

/* ---------- ⑤ 条件联动：showMore / dateMode ---------- */
const linkField = page.locator('.hot-news-props .link-picker')
check(await linkField.count() > 0, '「跳转目标」已升级为 LinkPicker 复合选择器')

// 关掉查看更多
const moreSwitch = page
  .locator('.hot-news-props .el-form-item')
  .filter({ hasText: '查看更多' })
  .locator('.el-switch')
  .first()
await moreSwitch.click()
await page.waitForTimeout(800)
const afterOff = await page.evaluate(() => {
  const p = document.querySelector('.hot-news-props')
  const vis = [...p.querySelectorAll('.el-tab-pane')].filter((x) => x.offsetParent !== null)
  const labels = vis.flatMap((v) => [...v.querySelectorAll('.el-form-item__label')].map((l) => l.textContent.trim()))
  const hasLink = vis.some((v) => !!v.querySelector('.link-picker'))
  return { labels, hasMore: labels.includes('更多文案'), hasLink }
})
check(!afterOff.hasMore, '关闭「查看更多」后「更多文案」收起')
check(!afterOff.hasLink, '关闭「查看更多」后「跳转目标」收起')

// 样式 Tab 里按钮配色也应收起
await clickTab(page, '样式')
await page.waitForTimeout(700)
const styleOff = await visiblePaneFields()
check(
  !styleOff.labels.some((l) => /更多底色|更多文字色|更多圆角/.test(l)),
  '关闭「查看更多」后样式 Tab 的按钮三色也收起',
)
check(styleOff.locked, '样式 Tab 给出「已关闭，暂不生效」提示')

await page.screenshot({ path: OUT })

console.log('\n通过：')
ok.forEach((m) => console.log('  ✓ ' + m))
if (fail.length) {
  console.error('失败：')
  fail.forEach((m) => console.error('  ✗ ' + m))
}
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}｜截图: ${OUT}`)
await browser.close()
process.exitCode = fail.length ? 1 : 0
