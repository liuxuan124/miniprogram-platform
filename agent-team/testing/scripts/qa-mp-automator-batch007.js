/**
 * QA BATCH: drive WeChat DevTools via miniprogram-automator (no GUI clicks).
 * Does not steal WorkBuddy focus.
 */
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const CLI_PATH = process.env.WECHAT_DEVTOOLS_CLI || '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const PROJECT_PATH = process.env.MINIAPP_PROJECT_PATH || path.resolve(__dirname, '../../../miniapp')
const EVID = path.resolve(__dirname, '../evidence/BATCH-QA-007')
const TIMEOUT_MS = Number(process.env.MINIAPP_VERIFY_TIMEOUT_MS || 90000)

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function withTimeout(promise, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

async function shot(mp, name) {
  const dest = path.join(EVID, name)
  await mp.screenshot({ path: dest })
  return dest
}

async function dumpPage(mp) {
  const page = await mp.currentPage()
  let data = null
  try {
    data = await page.data()
  } catch (e) {
    data = { _error: String(e && e.message) }
  }
  let html = ''
  try {
    html = await page.outerWxml()
  } catch (e) {
    html = String(e && e.message)
  }
  return {
    path: page.path,
    query: page.query || {},
    dataKeys: data && typeof data === 'object' ? Object.keys(data).slice(0, 40) : [],
    dataSlim: slim(data),
    wxmlHead: String(html).slice(0, 2500),
  }
}

function slim(data) {
  if (!data || typeof data !== 'object') return data
  const out = {}
  for (const k of Object.keys(data).slice(0, 25)) {
    const v = data[k]
    if (v == null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
      out[k] = typeof v === 'string' ? v.slice(0, 200) : v
    } else if (Array.isArray(v)) {
      out[k] = `Array(${v.length})`
    } else {
      out[k] = typeof v
    }
  }
  return out
}

async function main() {
  fs.mkdirSync(EVID, { recursive: true })
  const report = { startedAt: new Date().toISOString(), steps: [], errors: [] }
  let mp
  try {
    report.steps.push('launching')
    mp = await withTimeout(
      automator.launch({
        cliPath: CLI_PATH,
        projectPath: PROJECT_PATH,
        trustProject: true,
      }),
      'launch'
    )
    report.steps.push('connected')

    await sleep(2500)
    report.home = await dumpPage(mp)
    report.homeShot = await shot(mp, '01-home.png')
    report.steps.push(`home:${report.home.path}`)

    await mp.reLaunch('/pages/product-list/product-list')
    await sleep(2500)
    report.productList = await dumpPage(mp)
    report.productListShot = await shot(mp, '02-product-list.png')
    report.steps.push(`productList:${report.productList.path}`)

    await mp.navigateTo('/pages/product-detail/product-detail?id=9')
    await sleep(2500)
    report.product9 = await dumpPage(mp)
    report.product9Shot = await shot(mp, '03-product-9.png')
    report.steps.push(`product9:${report.product9.path}`)

    try {
      const page = await mp.currentPage()
      const buy = await page.$('.buy, .btn-buy, .sku-buy, button')
      report.buyEl = buy ? await buy.tagName() : null
      if (buy) {
        await buy.tap()
        await sleep(1500)
        report.afterBuyTap = await dumpPage(mp)
        report.afterBuyShot = await shot(mp, '04-after-buy-tap.png')
      }
    } catch (e) {
      report.errors.push('buyTap:' + (e.message || String(e)))
    }

    await mp.navigateTo('/pkg-extra/form/form?id=1')
    await sleep(2500)
    report.form = await dumpPage(mp)
    report.formShot = await shot(mp, '05-form.png')
    report.steps.push(`form:${report.form.path}`)
  } catch (e) {
    report.ok = false
    report.errors.push(e.stack || e.message || String(e))
  } finally {
    if (mp) {
      try {
        await mp.disconnect()
      } catch (e) {
        report.errors.push('disconnect:' + (e.message || String(e)))
      }
    }
    report.finishedAt = new Date().toISOString()
    report.ok = report.ok !== false && report.errors.length === 0
    fs.writeFileSync(path.join(EVID, 'automator-report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ ok: report.ok, steps: report.steps, errors: report.errors }, null, 2))
  }
}

main()
