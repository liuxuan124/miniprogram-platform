#!/usr/bin/env node
/**
 * 小程序端结构冒烟：首页 DSL 流式块数量 + banner 占位
 * 需微信开发者工具已打开项目且 automator 端口可用
 */
const fs = require('fs')
const path = require('path')
const { connectAutomator, ROOT } = require('./render-parity-automator-connect')

const OUT_DIR = path.join(ROOT, 'agent-team/testing/evidence/render-parity')
const OUT = path.join(OUT_DIR, 'automator-report.json')

async function main() {
  const report = { ok: false, at: new Date().toISOString(), port: null, home: {}, tabbar: {} }
  const { mp, port } = await connectAutomator()
  report.port = port

  // mini-dom 分批采集会在首页注入 parityBatch；先切到独立页，确保首页实例被销毁，
  // 再回首页读取真实接口状态，避免同路由 reLaunch 复用测试注入态。
  await mp.reLaunch('/pages/mine/mine')
  await new Promise((r) => setTimeout(r, 500))
  await mp.reLaunch('/pages/index/index')
  await new Promise((r) => setTimeout(r, 3500))
  const page = await mp.currentPage()

  let pageData = {}
  try {
    pageData = await page.data()
  } catch (e) {
    pageData = { _dataError: String(e.message || e) }
  }

  const flowCount = await page.$$('dsl-renderer').then((els) => els.length).catch(() => -1)
  const warmCount = await page.$$('dsl-warm-block').then((els) => els.length).catch(() => -1)
  const bannerFallback = await page.$('.dsl-banner__fallback').then(Boolean).catch(() => false)
  const bannerImage = await page.$('.dsl-banner__image').then(Boolean).catch(() => false)
  const floatBtn = await page.$('dsl-float-button').then(Boolean).catch(() => false)

  const flowLen = Array.isArray(pageData.flowComponents) ? pageData.flowComponents.length : 0
  const homeLen = Array.isArray(pageData.homeBlocks) ? pageData.homeBlocks.length : 0

  report.home = {
    path: page.path,
    dslMode: !!pageData.dslMode,
    dslPending: !!pageData.dslPending,
    loading: !!pageData.loading,
    flowComponentsLen: flowLen,
    homeBlocksLen: homeLen,
    dslRendererCount: flowCount,
    warmBlockCount: warmCount,
    hasBannerFallback: bannerFallback,
    hasBannerImage: bannerImage,
    hasFloatButton: floatBtn,
    error: pageData.error || null,
  }

  try {
    const tabBar = await mp.evaluate(() => {
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      const tb = cur && typeof cur.getTabBar === 'function' && cur.getTabBar()
      const list = (tb && tb.data && tb.data.list) || []
      return { count: list.length, texts: list.map((i) => i.text) }
    })
    report.tabbar = tabBar
  } catch (e) {
    report.tabbar = { error: String(e.message || e) }
  }

  const hasContent =
    flowLen > 0 ||
    homeLen > 0 ||
    flowCount > 0 ||
    warmCount > 0
  report.ok = hasContent && report.tabbar.count >= 4 && !pageData.error

  const tabRoutes = [
    '/pages/index/index',
    '/pages/discover/discover',
    '/pages/planet/planet',
    '/pages/shop/shop',
    '/pages/mine/mine',
  ]
  report.tabs = []
  for (const route of tabRoutes) {
    const entry = { route }
    try {
      await mp.switchTab(route)
      await new Promise((r) => setTimeout(r, 2000))
      const p = await mp.currentPage()
      entry.path = p.path
      const d = await p.data().catch(() => ({}))
      entry.flowLen = Array.isArray(d.flowComponents) ? d.flowComponents.length : 0
      const productList = Array.isArray(d.flowComponents)
        ? d.flowComponents.find((component) => component && component.type === 'product_list')
        : null
      if (productList) {
        entry.productList = {
          configuredLimit: Number(productList.props && productList.props.limit) || 0,
          runtimeDataCount: Array.isArray(productList.runtimeData) ? productList.runtimeData.length : 0,
        }
      }
      const shotName = `tab-${route.replace(/\//g, '-').replace(/^-/, '')}.png`
      entry.screenshot = shotName
      await mp.screenshot({ path: path.join(OUT_DIR, shotName) })
    } catch (e) {
      entry.error = String(e.message || e)
    }
    report.tabs.push(entry)
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  console.log(JSON.stringify(report, null, 2))
  console.log(`Wrote ${OUT}`)

  try { await mp.disconnect() } catch (e) { /* ignore */ }

  if (!report.ok) process.exit(1)
}

main().catch((e) => {
  console.error(e.message || e)
  process.exit(1)
})
