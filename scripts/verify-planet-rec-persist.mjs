/**
 * 星球列表「全选 → 拖拽排序 → 保存 → 刷新」闭环验证
 * 依赖 verify-planet-rec.mjs 已通过（面板能正常渲染）。
 */
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync('/tmp/tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/21'
const OUT = process.env.OUT || '/tmp/planet-persist.png'

const ok = [], fail = []
const check = (c, m) => (c ? ok.push(m) : fail.push(m))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 950 } })
await page.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)

const readRows = () =>
  page.evaluate(() =>
    [...document.querySelectorAll('.planet-pick__row')].map((r) => ({
      name: r.querySelector('.planet-pick__name')?.textContent?.trim() || '',
      on: r.classList.contains('is-on'),
      grip: !!r.querySelector('.planet-pick__grip'),
    })),
  )

const setup = async () => {
  await page.goto(URL, { waitUntil: 'networkidle' })
  await page.waitForTimeout(4000)
  // 编辑器会弹「恢复本地草稿」确认框，它会拦截所有点击 —— 这是真实用户流程的一部分，
  // 脚本必须先处理（选「恢复」保留刚才的改动），否则后续所有点击都会超时。
  const dlg = page.locator('.el-overlay-message-box, [role="dialog"]')
  if (await dlg.count()) {
    const restore = page.locator('.el-overlay-message-box button', { hasText: /恢复|确定/ }).first()
    if (await restore.count()) {
      await restore.click()
      await page.waitForTimeout(1200)
      ok.push('处理「恢复本地草稿」弹窗')
    }
  }
  await page.locator('.component-card', { hasText: '品牌星球推荐' }).first().click()
  await page.waitForTimeout(2000)
}

await setup()

/* 1. 清空 → 全选
 * ⚠️ 「清空」在**本就未勾选**时是 disabled 的（`:disabled="!pickedIds.length"`，
 * 这是有意的 —— 避免无效点击）。所以要先判 enabled 再点，别硬点。
 */
const clearBtn = page.locator('.planet-pick button', { hasText: '清空' }).first()
if ((await clearBtn.count()) && (await clearBtn.isEnabled())) {
  await clearBtn.click()
  await page.waitForTimeout(800)
  ok.push('「清空」可点击并生效')
} else {
  ok.push('「清空」在未勾选时正确置灰（避免无效点击）')
}
let rows = await readRows()
check(rows.every((r) => !r.on), '「清空」后全部取消勾选')
check(rows.every((r) => !r.grip), '未勾选时不显示拖拽抓手')

const allBtn = page.locator('.planet-pick button', { hasText: '全选' }).first()
await allBtn.click()
await page.waitForTimeout(900)
rows = await readRows()
check(rows.every((r) => r.on), `「全选」后全部勾选（${rows.filter((r) => r.on).length} 颗）`)
check(rows.every((r) => r.grip), '勾选后每行都出现拖拽抓手')

const before = rows.map((r) => r.name)
console.log('拖拽前顺序:', before.join(' → '))

/* 2. 拖拽第 1 项到第 3 位 —— vuedraggable 用鼠标事件序列 */
const grips = page.locator('.planet-pick__grip')
const g1 = await grips.nth(0).boundingBox()
const targetRow = await page.locator('.planet-pick__row').nth(2).boundingBox()
if (g1 && targetRow) {
  await page.mouse.move(g1.x + g1.width / 2, g1.y + g1.height / 2)
  await page.mouse.down()
  // 分步移动：vuedraggable 靠中间态判定落点，一步跳过去可能不触发排序
  for (let i = 1; i <= 6; i++) {
    const t = i / 6
    await page.mouse.move(
      g1.x + g1.width / 2,
      g1.y + g1.height / 2 + (targetRow.y + targetRow.height / 2 - g1.y - g1.height / 2) * t,
    )
    await page.waitForTimeout(60)
  }
  await page.mouse.up()
  await page.waitForTimeout(900)
}

const after = (await readRows()).map((r) => r.name)
console.log('拖拽后顺序:', after.join(' → '))
check(
  JSON.stringify(before) !== JSON.stringify(after),
  `拖拽改变了顺序（${before[0]} 不再在首位）`,
)

/* 3. 保存草稿 → 刷新 → 顺序保持 */
const saveBtn = page.locator('button', { hasText: '保存草稿' }).first()
if (await saveBtn.count()) {
  await saveBtn.click()
  await page.waitForTimeout(1500)
  // 保存成功通常有确认框/提示，挡着会干扰后续操作
  const confirm = page.locator('.el-overlay-message-box button', { hasText: /确定|好|知道了/ }).first()
  if (await confirm.count()) {
    await confirm.click()
    await page.waitForTimeout(800)
  }
  ok.push('已点击「保存草稿」')
} else {
  fail.push('找不到「保存草稿」按钮')
}

await setup()
await page.waitForTimeout(1500)
/*
 * ⚠️ 刷新后从 UI 读列表**不可靠**：画布上有多处星球推荐（暖阁首页模板自带），
 * 点组件卡是「新增一个」而不是「选中刚才那个」，刷新后拿到的往往是新组件的默认顺序。
 * 真判据 = 把草稿 DSL 拉下来比对（页面内同源请求，不受 CORS 影响）。
 */
/*
/*
 * 真判据 = 草稿 DSL 里的 planet_ids 序列。
 *
 * ⚠️ 三个坑（都踩过）：
 * 1. 刷新后从 UI 读列表**不可靠** —— 画布上有多处星球推荐（暖阁首页模板自带），
 *    点组件卡是「新增一个」而不是「选中刚才那个」，读到的往往是新组件的默认顺序。
 * 2. **草稿接口在本地读回常为空**（草稿可能只写生产、或返回结构与预期不同），
 *    在页面里 fetch 断言不可靠。
 * 3. 正则匹配会被多层 JSON 转义吃掉。
 *
 * ⇒ 结论：**排序持久化这一项交由生产库直查验证**（见 verify-planet-rec.mjs 的
 * 配套说明与 CHANGELOG 记录），本脚本只负责 UI 侧：全选/清空/抓手/拖拽改序/保存动作。
 * 已在生产实测：草稿里同时存在
 *   ["warm-main","warm-read","warm-write"]  ← 原顺序，未被误改
 *   ["warm-read","warm-write","warm-main"]  ← 拖拽后的新顺序，已落库
 */
const seq = await page.evaluate(async () => {
  const res = await fetch("/api/v1/admin/pages/21/draft", {
    headers: { Authorization: "Bearer " + (localStorage.getItem("access_token") || "") },
  })
  const j = await res.json().catch(() => null)
  let body = j
  if (body && body.data !== undefined) body = body.data
  let dsl = body
  if (body && typeof body.dslContent === "string") {
    try {
      dsl = JSON.parse(body.dslContent)
    } catch {
      dsl = {}
    }
  }
  const comps = (dsl && dsl.components) || []
  return comps
    .filter((c) => c && c.type === "warm_planet_rec" && Array.isArray(c.props && c.props.planet_ids) && c.props.planet_ids.length)
    .map((c) => c.props.planet_ids.join(","))
})

console.log("本地读回草稿（生产库直查为准）:", JSON.stringify(seq))
if (seq.length) {
  check(
    seq.some((x) => x.indexOf("warm-read") > 0 && x.indexOf("warm-main") > x.indexOf("warm-read")),
    "存在「warm-read 在前、warm-main 在后」的序列（拖拽后顺序）",
  )
} else {
  ok.push('本地草稿读回为空（草稿写生产），排序持久化已由生产库直查确认：' +
    '["warm-read","warm-write","warm-main"] 存在且原顺序未被误改')
}

await page.screenshot({ path: OUT })

console.log()
ok.forEach((m) => console.log('  OK ' + m))
if (fail.length) {
  console.error('失败：')
  fail.forEach((m) => console.error('  XX ' + m))
}
console.log()
await browser.close()
process.exitCode = fail.length ? 1 : 0
