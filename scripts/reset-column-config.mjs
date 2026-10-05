/**
 * 把页面 28 草稿里 warm_columns 的配置复位到默认值。
 *
 * 为什么需要：verify-column.mjs 会切「获取方式」、切布局、关演示卡片并落到草稿。
 * 不复位的话，下一次跑验证的初始状态就不对（我踩过：mock 一直是 0，
 * 差点误判成「代码没生效」，实际是上一轮测试把 preview_mock 写成了 false）。
 *
 * 用法：node scripts/reset-column-config.mjs [URL]
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
page.setDefaultTimeout(15000)

await page.addInitScript((t) => localStorage.setItem('access_token', t), TOKEN)
await page.goto(URL, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(4500)
for (const sel of ['.el-overlay-message-box button', '.el-dialog__footer button']) {
  const btn = page.locator(sel).last()
  if (await btn.count()) {
    await btn.click().catch(() => {})
    await page.waitForTimeout(600)
  }
}

const result = await page.evaluate(() => {
  /**
   * ⚠️ 不要用 `querySelector('.x:has(.y)')`：它在部分 Chromium 版本下
   * 对动态插入的节点返回 null（我踩过，报 noTarget 却其实节点就在）。
   * 直接遍历 + Array.find 最稳。
   */
  const el = [...document.querySelectorAll('.canvas-item-wrap')].find((w) =>
    w.querySelector('.dsl-warm-block--warm_columns'),
  )
  const id = el?.getAttribute('data-component-id')
  if (!id) return { noTarget: true, wraps: document.querySelectorAll('.canvas-item-wrap').length }
  let c = el.__vueParentComponent
  let ps = null
  while (c) {
    const s = c.setupState
    if (s) {
      const p = s.pageStore?.value || s.pageStore
      if (p && typeof p.selectComponent === 'function' && p.updateComponentProps) {
        ps = p
        break
      }
    }
    c = c.parent
  }
  if (!ps) return { noStore: true }
  // 只复位「验证脚本会改的那几个」，标题/跳转等原有配置保持不动
  ps.updateComponentProps(id, {
    preview_mock: true,
    fetch_mode: 'auto',
    limit: 4,
    layout: 'scroll',
  })
  return { ok: true, id }
})
console.log('复位:', JSON.stringify(result))
await page.waitForTimeout(1200)

const saveBtn = page.locator('button').filter({ hasText: '保存草稿' }).first()
if (await saveBtn.count()) {
  await saveBtn.click({ force: true }).catch(() => {})
  await page.waitForTimeout(2500)
  console.log('已保存草稿')
} else {
  console.log('找不到「保存草稿」按钮，未落库（刷新后会丢）')
}
await browser.close()
