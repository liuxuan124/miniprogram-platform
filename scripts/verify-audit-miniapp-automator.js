#!/usr/bin/env node
/**
 * 微信开发者工具 + miniprogram-automator：审核版冒烟
 */
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const CLI_PATH = process.env.WECHAT_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, '../miniapp')
const EVID = path.resolve(__dirname, '../agent-team/testing/evidence/AUDIT-2026-08-29')
const TIMEOUT_MS = Number(process.env.MINIAPP_VERIFY_TIMEOUT_MS || 120000)

const BAD_RE = /测试啊啊|测试数据展示|在此输入内容|111111111+|发士大夫|66666|沙雕测试/

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function collectVisibleText(page, limit = 80) {
  const chunks = []
  try {
    const nodes = await page.$$('text, view, button')
    for (let i = 0; i < Math.min(nodes.length, limit); i++) {
      const t = ((await nodes[i].text()) || '').replace(/\s+/g, ' ').trim()
      if (t && t.length < 120) chunks.push(t)
    }
  } catch (e) {
  }
  return [...new Set(chunks)].join(' | ')
}

async function shot(mp, name) {
  const dest = path.join(EVID, name)
  await mp.screenshot({ path: dest })
  return dest
}

function checkBad(text, label, checks) {
  const hit = BAD_RE.test(text || '')
  checks.push({ name: label, pass: !hit, detail: hit ? '命中禁用文案' : 'ok' })
  return !hit
}

async function readTabBar(mp) {
  return mp.evaluate(() => {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const bar = cur && cur.getTabBar && cur.getTabBar()
    if (!bar || !bar.data) return { hasTabBar: false }
    return {
      hasTabBar: true,
      list: (bar.data.list || []).map((i) => ({
        text: i.text,
        pagePath: i.pagePath,
        hidden: i.hidden,
      })),
      selected: bar.data.selected,
    }
  })
}

async function main() {
  fs.mkdirSync(EVID, { recursive: true })
  const report = { ok: true, checks: [], steps: [], shots: {}, startedAt: new Date().toISOString() }
  let mp

  try {
    try {
      mp = await withTimeout(automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' }), 'connect')
      report.steps.push('devtools-connected-ws')
    } catch (connectErr) {
      mp = await withTimeout(automator.launch({
        cliPath: CLI_PATH,
        projectPath: PROJECT_PATH,
        trustProject: true,
      }), 'launch')
      report.steps.push('devtools-launched')
    }

    await mp.evaluate(() => {
      try { wx.clearStorageSync() } catch (e) {}
      return true
    })
    await sleep(1500)

    // 首页
    await mp.reLaunch('/pages/index/index')
    await sleep(3500)
    let page = await mp.currentPage()
    const homeText = await collectVisibleText(page)
    report.shots.home = await shot(mp, '01-home.png')
    checkBad(homeText, '首页无测试文案', report.checks)
    const homeTab = await readTabBar(mp)
    const tabTexts = (homeTab.list || []).filter((t) => !t.hidden).map((t) => t.text)
    report.checks.push({
      name: 'TabBar仅三栏且无商城',
      pass: tabTexts.length === 3 && !tabTexts.some((t) => /商品|商城/.test(t)),
      detail: tabTexts.join(', '),
    })
    report.steps.push(`home:${page.path}`)

    // 内容 Tab
    await mp.switchTab('/pages/content-list/content-list')
    await sleep(3500)
    page = await mp.currentPage()
    const contentText = await collectVisibleText(page)
    report.shots.content = await shot(mp, '02-content.png')
    checkBad(contentText, '内容Tab无测试文案', report.checks)
    report.steps.push(`content:${page.path}`)

    // 我的
    await mp.switchTab('/pages/mine/mine')
    await sleep(3000)
    page = await mp.currentPage()
    const mineText = await collectVisibleText(page)
    report.shots.mine = await shot(mp, '03-mine.png')
    checkBad(mineText, '我的页无测试文案', report.checks)
    const hasOrderEntry = /全部订单|已购资料|待付款|购物车/.test(mineText)
    report.checks.push({ name: '我的页无订单入口', pass: !hasOrderEntry, detail: hasOrderEntry ? '仍有订单文案' : 'ok' })
    report.steps.push(`mine:${page.path}`)

    // 文章详情（线上第一篇）
    await mp.navigateTo('/pages/content-detail/content-detail?id=7')
    await sleep(3500)
    page = await mp.currentPage()
    const detailText = await collectVisibleText(page, 120)
    report.shots.article7 = await shot(mp, '04-article-7.png')
    checkBad(detailText, '文章详情无测试文案', report.checks)
    report.steps.push(`article7:${page.path}`)

    // 拒审文章 #4 应不可见或报错
    await mp.navigateTo('/pages/content-detail/content-detail?id=4')
    await sleep(3000)
    page = await mp.currentPage()
    const badText = await collectVisibleText(page, 120)
    report.shots.article4 = await shot(mp, '05-article-4-blocked.png')
    const blocked = BAD_RE.test(badText) || /不存在|加载失败|未发布|暂无/.test(badText) || badText.length < 30
    report.checks.push({ name: '测试文章#4不可展示', pass: blocked, detail: badText.slice(0, 120) })
    report.steps.push(`article4:${page.path}`)

    // 商城 Tab 路由应被拦截（switchTab 到 knowledge-mall）
    await mp.switchTab('/pages/knowledge-mall/knowledge-mall')
    await sleep(2500)
    page = await mp.currentPage()
    const mallText = await collectVisibleText(page)
    report.shots.mall = await shot(mp, '06-mall-guard.png')
    const mallBlocked = !/立即购买|加入购物车|商品列表|测试链接|沙雕/.test(mallText)
    report.checks.push({ name: '商城页无交易展示', pass: mallBlocked, detail: mallText.slice(0, 160) })
    report.steps.push(`mall:${page.path}`)

    // 搜索「测试」
    await mp.navigateTo('/pages/search/search?keyword=' + encodeURIComponent('测试'))
    await sleep(3000)
    page = await mp.currentPage()
    const searchText = await collectVisibleText(page)
    report.shots.search = await shot(mp, '07-search-test.png')
    const searchClean = !BAD_RE.test(searchText)
    report.checks.push({ name: '搜索测试无占位结果', pass: searchClean, detail: searchText.slice(0, 160) })
    report.steps.push(`search:${page.path}`)
  } catch (err) {
    report.ok = false
    report.error = err && (err.stack || err.message || String(err))
  } finally {
    if (mp) {
      try { await withTimeout(mp.disconnect(), 'disconnect') } catch (e) {}
    }
  }

  report.checks.forEach((c) => {
    if (!c.pass) report.ok = false
  })
  report.finishedAt = new Date().toISOString()
  fs.writeFileSync(path.join(EVID, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  process.exit(report.ok ? 0 : 1)
}

main()
