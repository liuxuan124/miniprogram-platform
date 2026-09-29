#!/usr/bin/env node
/**
 * 小程序自动化巡检（miniprogram-automator）
 * 用法：
 *   node scripts/qa/mp-auto-audit.js tabs           逐 Tab 截图 + 控制台错误
 *   node scripts/qa/mp-auto-audit.js product <id>   商品详情跳转-跳回复现
 *   node scripts/qa/mp-auto-audit.js crawl          全量注册页面逐个打开截图
 */
const path = require('path')
const automator = require('miniprogram-automator')

const PROJECT = path.resolve(__dirname, '../../miniapp')
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const TABS = [
  { name: 'index', path: '/pages/index/index' },
  { name: 'discover', path: '/pages/discover/discover' },
  { name: 'planet', path: '/pages/planet/planet' },
  { name: 'shop', path: '/pages/shop/shop' },
  { name: 'mine', path: '/pages/mine/mine' },
]

async function launch() {
  let miniProgram = null
  let lastErr = null
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      miniProgram = await automator.launch({ projectPath: PROJECT })
      break
    } catch (e) {
      lastErr = e
      console.log(`launch attempt ${attempt} failed: ${String(e.message || e).slice(0, 80)}, retrying...`)
      // eslint-disable-next-line no-await-in-loop
      await sleep(15000)
    }
  }
  if (!miniProgram) throw lastErr || new Error('launch failed')
  const consoleLog = []
  miniProgram.on('console', (msg) => {
    const line = `[${msg.type}] ${msg.args.map((a) => String(a && a._value !== undefined ? a._value : a)).join(' ')}`
    consoleLog.push(line)
    if (msg.type === 'error' || msg.type === 'warn') console.log('CONSOLE', line.slice(0, 400))
  })
  return { miniProgram, consoleLog }
}

async function currentPath(miniProgram) {
  const page = await miniProgram.currentPage()
  return page.path
}

async function main() {
  const mode = process.argv[2] || 'tabs'
  const arg = process.argv[3] || '1'
  const { miniProgram } = await launch()
  console.log('launched')
  // fresh 模式或 tabs 模式：先清本地缓存，确保拉到线上最新 DSL
  if (mode === 'tabs' || mode === 'fresh' || process.env.QA_FRESH === '1') {
    try {
      await miniProgram.callWxMethod('clearStorageSync')
      console.log('storage cleared')
      await miniProgram.reLaunch('/pages/index/index')
      await sleep(2000)
    } catch (e) { console.log('clearStorage warn:', String(e.message || e).slice(0, 80)) }
  }

  if (mode === 'tabs' || mode === 'crawl') {
    await sleep(2500)
    for (const tab of TABS) {
      await miniProgram.switchTab(tab.path)
      await sleep(3000)
      const cur = await currentPath(miniProgram)
      const shot = path.join(OUT, `tab-${tab.name}.png`)
      await miniProgram.screenshot({ path: shot })
      console.log(`TAB ${tab.name} current=${cur} shot=${shot}`)
    }
  }

  if (mode === 'product') {
    await miniProgram.switchTab('/pages/shop/shop')
    await sleep(3000)
    const before = await currentPath(miniProgram)
    console.log('shop current =', before)
    // 直接跳商品详情，观察是否自动跳回；arg 支持完整 query（如 demo=ebook）
    const q = String(arg).includes('=') ? arg : `id=${arg}`
    await miniProgram.navigateTo(`/pkg-content/product-detail/product-detail?${q}`)
    await sleep(1000)
    console.log('after navigateTo:', await currentPath(miniProgram))
    await sleep(4000)
    const after = await currentPath(miniProgram)
    console.log('after 4s:', after, after.includes('product-detail') ? 'OK_STAYED' : 'BOUNCED_BACK')
    await miniProgram.screenshot({ path: path.join(OUT, 'product-detail.png') })
  }

  if (mode === 'tap') {
    await miniProgram.switchTab('/pages/shop/shop')
    await sleep(3500)
    const page = await miniProgram.currentPage()
    const sels = ['.dsl-product-list__row', '.dsl-product-list__item', '.dsl-product-list__card']
    let el = null
    for (const s of sels) {
      try {
        el = await page.$(s)
        if (el) { console.log('found product card selector:', s); break }
      } catch (e) { /* next */ }
    }
    if (!el) { console.log('NO_PRODUCT_CARD_FOUND'); await miniProgram.screenshot({ path: path.join(OUT, 'tap-shop.png') }) }
    else {
      await el.tap()
      for (let i = 0; i < 6; i += 1) {
        await sleep(1000)
        try {
          console.log(`t+${i + 1}s current=`, await currentPath(miniProgram))
        } catch (e) {
          console.log(`t+${i + 1}s currentPath ERROR`, String(e.message || e).slice(0, 120))
        }
      }
      try { await miniProgram.screenshot({ path: path.join(OUT, 'tap-after.png') }) } catch (e) { console.log('shot err', e.message) }
    }
  }

  if (mode === 'page') {
    // 任意页面直达测试：node mp-auto-audit.js page "/pkg-content/content-detail/content-detail?id=37"
    await miniProgram.reLaunch('/pages/shop/shop')
    await sleep(2500)
    await miniProgram.navigateTo(arg)
    await sleep(1500)
    try { console.log('t+1.5s current =', await currentPath(miniProgram)) } catch (e) { console.log('t+1.5s ERR', String(e.message||e).slice(0,100)) }
    await sleep(3500)
    try {
      const after = await currentPath(miniProgram)
      console.log('t+5s current =', after, 'PAGE_ALIVE')
      await miniProgram.screenshot({ path: path.join(OUT, 'page-test.png') })
    } catch (e) {
      console.log('t+5s ERR', String(e.message || e).slice(0, 100), 'PAGE_HUNG')
    }
  }

  if (mode === 'inspect') {
    // 检查指定 Tab 页的渲染状态：node mp-auto-audit.js inspect /pages/shop/shop
    await miniProgram.switchTab(arg)
    await sleep(4000)
    const page = await miniProgram.currentPage()
    const data = await page.data()
    console.log('page path:', page.path)
    console.log('dslPending:', data.dslPending, '| dslMode:', data.dslMode, '| error:', data.error)
    const fc = data.flowComponents || []
    console.log('flowComponents:', fc.length)
    fc.slice(0, 10).forEach((c, i) => {
      console.log(`  [${i}] type=${c.type} title=${(c.props && (c.props.title || c.props.section_title)) || ''} id=${c.id}`)
    })
    console.log('floatComponents:', (data.floatComponents || []).length)
    console.log('FULL:', JSON.stringify(fc).slice(0, 1500))
    // 关键证据：渲染后写入了哪个 DSL 缓存键 = 小程序实际请求的 pagePath
    const probe = await miniProgram.evaluate(() => {
      const info = wx.getStorageInfoSync()
      const keys = (info.keys || []).filter((k) => String(k).includes('dsl_'))
      let view = 'unknown'
      try {
        const cv = require('/utils/content-view')
        view = cv.contentViewParam()
      } catch (e) { view = 'err:' + e.message }
      return { dslKeys: keys, contentView: view, hasPreviewToken: !!wx.getStorageSync('preview_token') }
    }).catch((e) => ({ probeError: String(e && e.message || e) }))
    console.log('PROBE:', JSON.stringify(probe, null, 2))
  }

  if (mode === 'dsl') {
    // 直接验证小程序进程内拿到的 DSL：node mp-auto-audit.js dsl pages/custom/motai-shop
    await sleep(2000)
    const result = await miniProgram.evaluate((p) => {
      const { PageService } = require('/services/page')
      return PageService.getPageDSL(p, true).then((dsl) => ({
        page: dsl && dsl.page,
        types: ((dsl && dsl.components) || []).map((c) => c.type),
        raw: JSON.stringify(dsl).slice(0, 300),
      })).catch((e) => ({ error: String(e && (e.message || e.errMsg) || e) }))
    }, arg)
    console.log('DSL_RESULT:', JSON.stringify(result, null, 2))
  }

  if (mode === 'crawl') {
    const appJson = require(path.join(PROJECT, 'app.json'))
    const pages = [
      ...appJson.pages,
      ...(appJson.subPackages || []).flatMap((sp) => sp.pages.map((p) => `${sp.root}/${p}`)),
    ]
    const results = []
    for (const p of pages) {
      try {
        await miniProgram.reLaunch(`/${p}`)
        await sleep(1800)
        const cur = await currentPath(miniProgram)
        const bounced = !cur.includes(p.split('/').pop())
        const shot = path.join(OUT, `crawl-${p.replace(/\//g, '_')}.png`)
        await miniProgram.screenshot({ path: shot })
        results.push({ page: p, current: cur, bounced })
        console.log(`CRAWL ${p} -> ${cur} ${bounced ? 'BOUNCED' : 'ok'}`)
      } catch (e) {
        results.push({ page: p, error: String(e.message || e).slice(0, 200) })
        console.log(`CRAWL ${p} ERROR ${String(e.message || e).slice(0, 200)}`)
      }
    }
    require('fs').writeFileSync(path.join(OUT, 'crawl-results.json'), JSON.stringify(results, null, 2))
  }

  await miniProgram.close()
  process.exit(0)
}

main().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
