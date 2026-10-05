import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync('/tmp/tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/21'
const OUT = process.env.OUT || '/tmp/planet-rec.png'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1700, height: 950 } })
await p.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(3500)

const ok = [], fail = []
const check = (c, m) => (c ? ok.push(m) : fail.push(m))

/* 1. 插入「品牌星球推荐」组件 */
const card = p.locator('.component-card', { hasText: '品牌星球推荐' }).first()
if (!(await card.count())) {
  console.error('✗ 找不到「品牌星球推荐」卡片')
  await b.close()
  process.exit(2)
}
await card.click()
await p.waitForTimeout(1200)

/* 2. 属性面板出现且是 WarmPlanetRec */
const panelOk = await p.evaluate(() => !!document.querySelector('.planet-rec-props'))
check(panelOk, '属性面板挂载（.planet-rec-props）')
if (!panelOk) {
  fail.forEach(m => console.error('  ✗ ' + m))
  await p.screenshot({ path: OUT })
  await b.close()
  process.exit(1)
}

/* 3. 面板高度（对比基准：改造前平铺文案约 900+px） */
const h = await p.evaluate(() => {
  const el = document.querySelector('.planet-rec-props')
  return el ? Math.round(el.getBoundingClientRect().height) : 0
})
console.log(`面板高度: ${h}px`)

/* 4. 画布双分支：初始多卡（wh-planets） */
const readCanvas = () =>
  p.evaluate(() => ({
    // ⚠️ 用全文档查询而非限定某个 wrapper：页面上可能已有多个星球推荐组件
    // （暖阁首页模板里就带了好几处），限定作用域会读到 0 而误判「画布没渲染」。
    multi: document.querySelectorAll('.wh-planets__row .wh-pcard').length,
    single: document.querySelectorAll('.wh-planet__h').length,
    planets: document.querySelectorAll('.wh-planets').length,
  }))

const before = await readCanvas()
check(before.multi >= 1, `初始为多星球横滑（横滑卡 ${before.multi} 张 / 单卡 ${before.single}）`)

/* 5. 切到「只展示主星球」→ 画布应变单卡 */
const seg = p.locator('.wb-seg__item', { hasText: '只展示主星球' }).first()
check((await seg.count()) > 0, '分段控件有「只展示主星球」项')
await seg.click()
await p.waitForTimeout(800)

const afterSingle = await readCanvas()
check(afterSingle.single >= 1, `切「只展示主星球」后画布出现单卡通栏（${afterSingle.single} 个）`)
check(
  afterSingle.multi < before.multi,
  `切单卡后横滑卡减少（${before.multi} → ${afterSingle.multi}）`,
)

/* 6. 联动：「最多展示 / 指定星球 / 点击行为」收起 */
const linked = await p.evaluate(() => {
  const el = document.querySelector('.planet-rec-props')
  const txt = el.innerText
  return {
    lockedTip: !!el.querySelector('.pr-locked-tip'),
    collapsedNote: !!el.querySelector('.pr-collapsed'),
    planetPick: !!el.querySelector('.planet-pick'),
    hasWhy: txt.includes('不生效') || txt.includes('自动展示主打星球'),
    segCount: document.querySelectorAll('.wb-seg').length,
  }
})
check(linked.lockedTip, '单卡模式显示锁定提示文案')
check(linked.collapsedNote, '单卡模式收起「指定展示哪些星球」')
check(linked.planetPick === false, '单卡模式下星球选择列表确实不渲染')
check(linked.hasWhy, '收起提示说明了原因')
check(linked.segCount === 1, `单卡模式下只剩 1 个分段控件（实际 ${linked.segCount}，点击行为已收起）`)

/* 7. 切回多星球横滑 → 恢复编辑 + 画布恢复横滑 */
const segMulti = p.locator('.wb-seg__item', { hasText: '多星球横滑' }).first()
await segMulti.click()
await p.waitForTimeout(800)
const back = await readCanvas()
check(back.multi > afterSingle.multi, `切回「多星球横滑」后横滑卡恢复（${afterSingle.multi} → ${back.multi}）`)
check(back.single < afterSingle.single, `单卡分支关闭（${afterSingle.single} → ${back.single}）`)

const restored = await p.evaluate(() => ({
  planetPick: !!document.querySelector('.planet-pick'),
  segs: document.querySelectorAll('.wb-seg').length,
  locked: !!document.querySelector('.pr-locked-tip'),
}))
check(restored.planetPick, '切回后星球选择列表恢复')
check(restored.segs >= 2, `两个单选框都已升级为分段控件（.wb-seg × ${restored.segs}）`)
check(!restored.locked, '切回后锁定提示消失')

/* 8. ? 提示气泡 + 预设 + 全选/清空 */
const tools = await p.evaluate(() => {
  const el = document.querySelector('.planet-rec-props')
  return {
    hints: el.querySelectorAll('.wb-field-hint').length,
    hintBtns: [...el.querySelectorAll('.wb-field-hint')].map((b) => b.textContent.trim()),
    allBtn: [...el.querySelectorAll('button')].some((x) => x.textContent.trim() === '全选'),
    clearBtn: [...el.querySelectorAll('button')].some((x) => x.textContent.trim() === '清空'),
    // 平铺长文案是否已清除
    flatText: el.innerText.includes('点右上角') || el.innerText.includes('不勾选 = 展示后台'),
  }
})
check(tools.hints >= 3, `长说明已收进 ? 气泡（${tools.hints} 个，${tools.hintBtns.join('')}）`)
check(tools.allBtn, '星球列表表头有「全选」')
check(tools.clearBtn, '星球列表表头有「清空」')
check(tools.flatText === false, '面板上不再平铺长段解释文案')

/* 9. 拖拽抓手（勾选后出现） */
const grip = await p.evaluate(() => {
  const rows = document.querySelectorAll('.planet-pick__row')
  const on = document.querySelectorAll('.planet-pick__row.is-on')
  return {
    rows: rows.length,
    onRows: on.length,
    grips: document.querySelectorAll('.planet-pick__grip').length,
    listHasHandle: !!document.querySelector('.planet-pick__list [handle]') || !!document.querySelector('.planet-pick__list'),
  }
})
console.log(`星球列表: ${grip.rows} 行 / 已勾选 ${grip.onRows} / 抓手 ${grip.grips}`)
check(grip.listHasHandle, '拖拽容器已挂载')

await p.screenshot({ path: OUT })

console.log('\n通过：')
ok.forEach(m => console.log('  ✓ ' + m))
if (fail.length) { console.error('失败：'); fail.forEach(m => console.error('  ✗ ' + m)) }
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}｜截图: ${OUT}`)
await b.close()
process.exitCode = fail.length ? 1 : 0
