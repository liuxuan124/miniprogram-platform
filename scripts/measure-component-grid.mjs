/**
 * 量化测量组件卡片的等高性 —— 「先测量再动手」，别凭 CSS 推理下结论。
 * 输出：卡片高度集合 / 同列行高是否一致 / 首屏可见卡片数 / 面板是否有横向溢出
 */
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'

const TOKEN = readFileSync(process.env.TK_FILE || '/tmp/tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/21'
const OUT = process.env.OUT || '/tmp/measure-grid.png'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 900 } })
await p.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(3000)

const data = await p.evaluate(() => {
  const cards = [...document.querySelectorAll('.component-card')]
  const boxes = cards.map((c) => {
    const r = c.getBoundingClientRect()
    return { label: c.textContent.trim(), x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  })
  // 同一行 = y 相同；比较每行内两卡的高度差
  const rows = new Map()
  for (const b2 of boxes) {
    const k = b2.y
    if (!rows.has(k)) rows.set(k, [])
    rows.get(k).push(b2)
  }
  const rowStats = [...rows.entries()].map(([y, list]) => ({
    y,
    n: list.length,
    heights: list.map((x) => x.h),
    diff: list.length > 1 ? Math.max(...list.map((x) => x.h)) - Math.min(...list.map((x) => x.h)) : 0,
  }))
  const grid = document.querySelector('.component-grid')
  const gr = grid.getBoundingClientRect()
  return {
    total: boxes.length,
    uniqueHeights: [...new Set(boxes.map((b2) => b2.h))].sort((a, b) => a - b),
    rowDiffs: rowStats.map((r) => r.diff),
    maxRowDiff: Math.max(0, ...rowStats.map((r) => r.diff)),
    cardW: boxes[0]?.w,
    gridW: Math.round(gr.width),
    gridScrollW: grid.scrollWidth,
    gridClientW: grid.clientWidth,
    hOverflow: grid.scrollWidth > grid.clientWidth + 1,
    // 首屏（面板可视区）内可见卡片数
    inView: boxes.filter((b2) => b2.y < gr.bottom && b2.y + b2.h > gr.top).length,
    recentH: (() => {
      const lbl = [...document.querySelectorAll('.category-label')].find((e) => e.textContent.includes('最近使用'))
      if (!lbl) return null
      const next = []
      let n = lbl.nextElementSibling
      for (let i = 0; i < 8 && n; i++) { next.push(n); n = n.nextElementSibling }
      const last = next[next.length - 1]
      if (!last) return null
      return Math.round(last.getBoundingClientRect().bottom - lbl.getBoundingClientRect().top)
    })(),
    gridCols: getComputedStyle(grid).gridTemplateColumns,
  }
})

console.log('卡片总数        :', data.total)
console.log('grid 列定义     :', data.gridCols)
console.log('卡片宽度        :', data.cardW, '/ 面板宽', data.gridW)
console.log('唯一高度集合    :', JSON.stringify(data.uniqueHeights))
console.log('各行高度差      :', JSON.stringify(data.rowDiffs))
console.log('最大同行高度差  :', data.maxRowDiff, data.maxRowDiff === 0 ? '✅ 等高' : '❌ 不等高')
console.log('横向溢出        :', data.hOverflow ? `❌ scrollW=${data.gridScrollW} > clientW=${data.gridClientW}` : '✅ 无')
console.log('首屏可见卡片数  :', data.inView)
console.log('「最近使用」区高:', data.recentH, 'px')

await p.screenshot({ path: OUT })
await b.close()
process.exitCode = data.maxRowDiff === 0 ? 0 : 1
