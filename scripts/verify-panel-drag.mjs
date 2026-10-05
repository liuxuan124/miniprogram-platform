import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync('/tmp/wb_tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/21'
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 900 } })
await p.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)

const ok = [], fail = []
const check = (c, m) => (c ? ok.push(m) : fail.push(m))

/* 1. 卡片仍可拖拽（HTML5 DnD：dragstart 必须带 componentType） */
const dragInfo = await p.evaluate(() => {
  const card = document.querySelector('.component-card')
  return { draggable: card?.getAttribute('draggable'), hasCard: !!card }
})
check(dragInfo.hasCard, '卡片存在')
check(dragInfo.draggable === 'true', `卡片 draggable="true"（实际 ${dragInfo.draggable}）`)

/* 2. 真拖拽：HTML5 DnD 在 playwright 需手动派发事件 */
/*
 * ⚠️ drop 监听不在 `.prototype-canvas` 上，而在 CanvasArea 里带
 * `data-testid="canvas-drop-zone"` 的那个内层容器上（外层只是视觉外壳）。
 * 往错误元素派发 drop 不会报错，只是静默不插入 —— 必须用 testid 定位。
 */
const dropTarget = await p.evaluate(() => {
  const el =
    document.querySelector('[data-testid="canvas-drop-zone"]') ||
    document.querySelector('.prototype-canvas')
  if (!el) return null
  const r = el.getBoundingClientRect()
  return { sel: el.getAttribute('data-testid') ? 'canvas-drop-zone' : '.prototype-canvas', w: Math.round(r.width) }
})
check(!!dropTarget, `找到画布落点 ${dropTarget?.sel}（宽 ${dropTarget?.w}px）`)

const dragged = await p.evaluate(() => {
  const card = document.querySelector('.component-card')
  if (!card) return { ok: false, reason: 'no card' }
  const dt = new DataTransfer()
  const ev = new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt })
  card.dispatchEvent(ev)
  const payload = dt.getData('componentType')
  return { ok: true, payload, effect: dt.effectAllowed }
})
check(dragged.ok && !!dragged.payload, `拖拽携带 componentType（值 = ${dragged.payload}）`)

/*
 * 3. 点击插入仍可用（回退路径：运营不一定用拖拽）
 *
 * ⚠️ 判据用「画布内 DOM 层数」而不是 `.block-node` —— 后者是**区块缩略图**
 * 里的类名，画布上的组件节点用的是 ComponentItem 自己的类名，
 * 查 block-node 会恒为 0 → 误报「插入失效」。DOM 层数是渲染结果的直接体现。
 */
const countLayers = () =>
  p.evaluate(() => document.querySelector('.prototype-canvas')?.querySelectorAll('*').length ?? 0)

const before = await countLayers()
const addCard = p.locator('.component-card', { hasText: '分区标题' }).first()
let after = before
if (await addCard.count()) {
  await addCard.click()
  await p.waitForTimeout(800)
  after = await countLayers()
  check(after > before, `点击插入生效（画布 DOM 层数 ${before} → ${after}）`)
} else {
  fail.push('找不到「分区标题」卡片')
}

/* 4. 拖拽落到画布真的能插进去（完整 HTML5 DnD 序列） */
const full = await p.evaluate(() => {
  const card = document.querySelector('.component-card')
  const canvas =
    document.querySelector('[data-testid="canvas-drop-zone"]') ||
    document.querySelector('.prototype-canvas')
  if (!card || !canvas) return { ok: false }
  const dt = new DataTransfer()
  card.dispatchEvent(new DragEvent('dragstart', { bubbles: true, cancelable: true, dataTransfer: dt }))
  const payload = dt.getData('componentType')
  const cr = canvas.getBoundingClientRect()
  const opts = {
    bubbles: true,
    cancelable: true,
    dataTransfer: dt,
    clientX: Math.round(cr.left + cr.width / 2),
    clientY: Math.round(cr.top + 120),
  }
  canvas.dispatchEvent(new DragEvent('dragover', opts))
  canvas.dispatchEvent(new DragEvent('drop', opts))
  card.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer: dt }))
  return { ok: true, payload }
})
await p.waitForTimeout(800)
const afterDrop = await countLayers()
check(full.ok && !!full.payload, `拖拽序列派发成功（payload=${full.payload}）`)
check(afterDrop > after, `拖拽落入画布生效（层数 ${after} → ${afterDrop}）`)

console.log('通过：')
ok.forEach(m => console.log('  ✓ ' + m))
if (fail.length) { console.error('失败：'); fail.forEach(m => console.error('  ✗ ' + m)) }
console.log(`\n通过 ${ok.length} / 失败 ${fail.length}`)
await b.close()
process.exitCode = fail.length ? 1 : 0
