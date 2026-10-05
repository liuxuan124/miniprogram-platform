/**
 * 把页面 28 草稿里 planet_hero 的配置复位到默认值。
 *
 * 为什么需要：verify-planet-hero.mjs 会切身份、改布局、动 KPI 与样式字段并落到草稿。
 * 不复位的话下一轮跑的初始状态就不对（我踩过：专栏那轮 mock 一直是 0，
 * 差点误判成代码没生效，实际是上一轮测试改了数据）。
 *
 * 用法：node scripts/reset-planet-hero.mjs [URL]
 */
import { createRequire } from 'node:module'
import fs from 'node:fs'

const require = createRequire(process.cwd() + '/')
const { chromium } = require('playwright')

const URL = process.argv[2] || 'http://localhost:5180/page-builder/editor/28'
const TOKEN = fs.readFileSync('/tmp/wb_tk.txt', 'utf8').trim()

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1700, height: 1000 } })
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
  // ⚠️ 别用 querySelector('.x:has(.y)')：对动态插入节点会返回 null（踩过）
  const el = [...document.querySelectorAll('.canvas-item-wrap')].find((w) =>
    w.querySelector('.ph'),
  )
  const id = el?.getAttribute('data-component-id')
  if (!id) return { noTarget: true }
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
  // 只复位「验证脚本会改的那几个」，原有文案配置保持不动
  ps.updateComponentProps(id, {
    preview_identity: 'guest',
    show_switch_btn: false,
    switch_btn_text: '切换',
    show_expire_notice: false,
    show_renew_btn: false,
    show_group_notice: true,
    group_action_type: 'link',
    logo_value: '🪐',
    radius: 0,
    padding: 18,
    kpis: [
      { value: '3,241', label: '球友', suffix: '' },
      { value: '1.2万', label: '沉淀内容', suffix: '' },
      { value: '27', label: '今日新增', suffix: '' },
      { value: '8', label: '持续草', suffix: '折' },
    ],
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
