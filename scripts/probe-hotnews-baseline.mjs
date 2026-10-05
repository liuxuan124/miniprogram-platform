/**
 * 今日热门资讯（HotNews）属性面板基线探针
 *
 * 目的：在改之前先量清「哪些是真 bug、哪些是需求描述有偏差」，
 * 避免照单全接收一套无效重构。
 *
 * 关键对比：**面板显示值 vs 画布实际 computed style**。
 * 若两者一致 → 样式链路是通的，问题在别处（如存了透明色）。
 */
import { createRequire } from 'node:module'
const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')
import { readFileSync } from 'node:fs'
const TOKEN = readFileSync(process.env.TK_FILE || '/tmp/wb_tk.txt', 'utf8').trim()
const URL = process.env.URL || 'http://localhost:5180/page-builder/editor/28'
const OUT = process.env.OUT || '/tmp/hotnews-baseline.png'

const b = await chromium.launch()
const p = await b.newPage({ viewport: { width: 1600, height: 950 } })
await p.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
await p.goto(URL, { waitUntil: 'networkidle' })
await p.waitForTimeout(4000)

// 选中「今日热门资讯」组件
const dlg = p.locator('.el-overlay-message-box button', { hasText: /恢复|确定/ }).first()
if (await dlg.count()) {
  await dlg.click()
  await p.waitForTimeout(1200)
}

/*
 * 选中「今日跨境快讯」组件。
 *
 * ⚠️ 必须按**组件类型**定位，不能按文本 —— 页面上有多个带「进入 ›」「我的星球」
 * 的 warm 系组件，文本匹配会选中「品牌问候条」，属性面板就不是 hot_news 的了。
 * 正确做法：点画布上含 hot_news 标志类名的节点（.hot-news）。
 */
const hotNode = p.locator('.canvas-item-wrap').filter({ has: p.locator('.hot-news') }).first()
let target = null
if (await hotNode.count()) {
  target = hotNode
} else {
  // 退路：点组件库新增一个
  const c = p.locator('.component-card', { hasText: '今日热门' }).first()
  if (await c.count()) {
    await c.click()
    await p.waitForTimeout(1800)
  }
}
if (target) {
  await target.click({ position: { x: 20, y: 12 } })
  await p.waitForTimeout(1800)
}

const r = await p.evaluate(() => {
  const panel = document.querySelector('.hot-news-props')
  if (!panel) return { noPanel: true }
  // 面板上「更多底色」色块的 model-value（从 DOM 读不到 props，读色块背景）
  const rows = [...panel.querySelectorAll('.el-form-item')].map((it) => ({
    label: it.querySelector('.el-form-item__label')?.textContent?.trim() || '',
    hasColor: !!it.querySelector('.el-color-picker'),
    inputNum: it.querySelector('.el-input-number input')?.value || '',
  }))
  // 画布上「查看更多」按钮的实际 computed style
  const more = document.querySelector('.hot-news-more')
  const cs = more ? getComputedStyle(more) : null
  return {
    panelFields: rows.map((x) => x.label).filter(Boolean),
    colorFields: rows.filter((x) => x.hasColor).map((x) => x.label),
    moreInCanvas: !!more,
    moreStyle: cs
      ? {
          background: cs.backgroundColor,
          color: cs.color,
          borderRadius: cs.borderRadius,
        }
      : null,
    // 画布条目数 vs limit
    canvasItems: document.querySelectorAll('.hot-news-item, .hot-news-row').length,
    // 面板预览条数
    previewChips: panel.querySelectorAll('.ds-chip').length,
    previewCount: panel.querySelector('.ds-card__count')?.textContent?.trim() || '',
    sortBy: (() => {
      const sel = [...panel.querySelectorAll('.el-select')].map((s) => s.querySelector('input')?.value)
      return sel
    })(),
  }
})

console.log(JSON.stringify(r, null, 1))
await p.screenshot({ path: OUT })
console.log('截图:', OUT)
await b.close()
