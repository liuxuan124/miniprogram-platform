/**
 * WeChat DevTools smoke — connect automator :9421, walk key pages.
 * Run: node scripts/smoke-devtools-pass.js
 */
const path = require('path')
const fs = require('fs')
const automator = require('miniprogram-automator')

const PROJECT = path.join(__dirname, '..', 'miniapp')
const OUT = path.join(__dirname, '..', 'docs', 'smoke-pass-20260914.json')

const TAB_PAGES = [
  '/pages/index/index',
  '/pages/discover/discover',
  '/pages/planet/planet',
  '/pages/shop/shop',
  '/pages/mine/mine',
]

const NAV_PAGES = [
  '/pages/search/search',
  '/pages/join/join',
  '/pages/share/share',
  '/pages/contribute/contribute',
  '/pages/resources/resources',
  '/pages/states/states?state=payfail',
  '/pages/cart/cart',
  '/pages/content-list/content-list',
  '/pages/product-detail/product-detail?demo=pay1',
  '/pages/content-detail/content-detail?demo=1',
  '/pages/moment-detail/moment-detail?demo=1',
  '/pages/file-preview/file-preview?demo=1',
  '/pkg-trade/order-list/order-list',
  '/pkg-trade/reviews/reviews',
  '/pkg-user/favorites/favorites',
  '/pkg-user/service-chat/service-chat',
  '/pkg-user/settings/settings',
  '/pkg-user/member-center/member-center',
]

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function checkPage(miniProgram, url, mode) {
  const row = { url, mode, status: 'FAIL', error: '', path: '', title: '' }
  try {
    if (mode === 'tab') {
      await miniProgram.switchTab(url)
    } else {
      await miniProgram.navigateTo(url)
    }
    await sleep(900)
    const page = await miniProgram.currentPage()
    row.path = page && page.path
    try {
      const data = await page.data()
      row.hasData = data != null
      if (data && data.loading === true) row.note = 'loading=true'
    } catch (_) { /* some pages block data() */ }
    // white-screen heuristic: page exists
    if (row.path) {
      row.status = 'PASS'
    } else {
      row.error = 'no current page path'
    }
    if (mode === 'nav') {
      try { await miniProgram.navigateBack() } catch (_) { /* ignore */ }
      await sleep(200)
    }
  } catch (e) {
    row.error = (e && e.message) || String(e)
    row.status = 'FAIL'
    try { await miniProgram.navigateBack() } catch (_) { /* ignore */ }
  }
  return row
}

async function codePathChecks() {
  const repo = path.resolve(__dirname, '..')
  console.log('repo=', repo)
  const checks = []
  const read = (rel) => fs.readFileSync(path.join(repo, rel), 'utf8')
  const assertInc = (id, rel, needle, expect = true) => {
    let ok = false
    let err = ''
    try {
      const t = read(rel)
      ok = expect ? t.includes(needle) : !t.includes(needle)
    } catch (e) {
      err = (e && e.message) || String(e)
    }
    checks.push({ id, status: ok ? 'PASS' : 'FAIL', file: rel, needle, expect, error: err })
  }
  assertInc('A2', 'miniapp/pages/product-detail/product-detail.js', '/pkg-trade/reviews/reviews')
  assertInc('A3', 'backend/src/main/java/com/miniprogram/dto/CartItemVO.java', 'productType')
  assertInc('A3b', 'backend/src/main/java/com/miniprogram/service/impl/CartServiceImpl.java', 'setProductType')
  assertInc('A4', 'miniapp/pkg-trade/order-list/order-list.js', '/pages/shop/shop')
  assertInc('A5', 'miniapp/pkg-user/favorites/favorites.js', '/pages/discover/discover')
  assertInc('A6', 'miniapp/pages/search/search.js', '/pages/shop/shop')
  assertInc('B2', 'miniapp/pages/contribute/contribute.js', '/api/v1/mp/creator/contents')
  assertInc('B4', 'miniapp/pkg-user/service-chat/service-chat.js', 'getOrderList')
  assertInc('B5', 'miniapp/pages/order-create/order-create.js', 'state=payfail')
  assertInc('B6', 'miniapp/pages/file-preview/file-preview.wxml', 'loadProgress')
  assertInc('B7', 'miniapp/pages/moment-detail/moment-detail.js', 'onSortTap')
  assertInc('B8', 'miniapp/pages/planet/planet.js', 'isPinned')
  return checks
}

async function main() {
  const report = {
    at: new Date().toISOString(),
    automator: null,
    tabs: [],
    pages: [],
    code: [],
    summary: {},
  }

  report.code = await codePathChecks()

  const autoPorts = [Number(process.env.AUTO_PORT) || 0, 9422, 9421].filter(Boolean)
  let miniProgram
  const connectErrors = []
  for (const port of [...new Set(autoPorts)]) {
    try {
      miniProgram = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${port}` })
      report.automator = `connected:${port}`
      break
    } catch (e) {
      connectErrors.push(`${port}: ${(e && e.message) || e}`)
    }
  }
  if (!miniProgram) {
    report.automator = 'connect_fail: ' + connectErrors.join(' | ')
    // fallback: try launch
    try {
      miniProgram = await automator.launch({
        projectPath: PROJECT,
        cliPath: '/Applications/wechatwebdevtools.app/Contents/MacOS/cli',
        port: 9421,
      })
      report.automator = 'launched'
    } catch (e2) {
      report.automator = 'launch_fail: ' + ((e2 && e2.message) || e2)
    }
  }

  if (miniProgram) {
    for (const url of TAB_PAGES) {
      const row = await checkPage(miniProgram, url, 'tab')
      report.tabs.push(row)
      console.log(row.status, 'TAB', url, row.error || row.path)
    }
    for (const url of NAV_PAGES) {
      // ensure on a tab before navigate
      try { await miniProgram.switchTab('/pages/index/index') } catch (_) {}
      await sleep(300)
      const row = await checkPage(miniProgram, url, 'nav')
      report.pages.push(row)
      console.log(row.status, 'NAV', url, row.error || row.path)
    }
    try { await miniProgram.disconnect() } catch (_) {}
  }

  const all = [...report.tabs, ...report.pages, ...report.code]
  report.summary = {
    total: all.length,
    pass: all.filter((x) => x.status === 'PASS').length,
    fail: all.filter((x) => x.status === 'FAIL').length,
    automator: report.automator,
  }
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2))
  console.log('\nSUMMARY', report.summary)
  console.log('Wrote', OUT)
  if (report.summary.fail > 0) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
