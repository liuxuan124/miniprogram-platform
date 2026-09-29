#!/usr/bin/env node
/**
 * 后台 H5 黄金页 DOM 要素抽取（Playwright）
 */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'agent-team/testing/evidence/render-parity')
const OUT = path.join(OUT_DIR, 'admin-dom.json')
const BASE = (process.env.PLAYWRIGHT_BASE_URL || process.env.ADMIN_URL || 'http://127.0.0.1').replace(/\/$/, '')

const { EXTRACT_FN_SOURCE } = require('./render-parity-dom-signatures')

async function loginAdmin(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.fill('input[type="text"]', process.env.ADMIN_USER || 'admin')
  const adminPass = process.env.ADMIN_PASS
  if (!adminPass) throw new Error('请设置环境变量 ADMIN_PASS（仓库公开，禁止硬编码后台密码）')
  await page.fill('input[type="password"]', adminPass)
  await page.click('.login-form button, button:has-text("登")')
  await page.waitForURL((url) => !String(url).includes('/login'), { timeout: 90000 })
}

async function main() {
  let chromium
  try {
    chromium = require(path.join(ROOT, 'admin/node_modules/playwright')).chromium
  } catch (e) {
    throw new Error('请先 cd admin && npm install（需要 playwright）')
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } })

  try {
    await loginAdmin(page)
    const url = `${BASE}/h5/golden-parity?embed=1`
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await page.waitForSelector('[data-parity-root]', { timeout: 60000 })
    let parityCount = 0
    for (let i = 0; i < 45; i += 1) {
      parityCount = await page.locator('[data-parity-type]').count()
      if (parityCount >= 40) break
      await page.waitForTimeout(2000)
    }
    if (parityCount < 40) {
      const dbg = await page.evaluate(() => ({
        url: location.href,
        root: !!document.querySelector('[data-parity-root]'),
        empty: !!document.querySelector('.golden-parity__empty'),
        loading: !!document.querySelector('.el-loading-mask'),
        title: document.title,
      }))
      await page.screenshot({ path: path.join(OUT_DIR, 'admin-golden-fail.png'), fullPage: true })
      throw new Error(`[data-parity-type] count=${parityCount}, expected >= 40 · ${JSON.stringify(dbg)}`)
    }
    await page.locator('.phone-content').evaluate((el) => { el.scrollTop = el.scrollHeight })
    await page.waitForTimeout(1200)
    const blocks = await page.evaluate(EXTRACT_FN_SOURCE)
    const report = {
      ok: Array.isArray(blocks) && blocks.length > 0,
      at: new Date().toISOString(),
      url,
      count: blocks.length,
      blocks,
    }
    fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
    console.log(JSON.stringify({ ok: report.ok, count: report.count, out: OUT }, null, 2))
    if (!report.ok) process.exit(1)
  } finally {
    await browser.close()
  }
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
