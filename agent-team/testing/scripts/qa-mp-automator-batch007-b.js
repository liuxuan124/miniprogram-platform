const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const EVID = path.resolve(__dirname, '../evidence/BATCH-QA-007')
const WS = process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:9420'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function dump(mp) {
  const page = await mp.currentPage()
  let data = {}
  try {
    data = await page.data()
  } catch (e) {
    data = { _error: e.message }
  }
  const slim = {}
  Object.keys(data || {}).slice(0, 20).forEach((k) => {
    const v = data[k]
    slim[k] = Array.isArray(v) ? `Array(${v.length})` : v && typeof v === 'object' ? 'object' : v
  })
  return { path: page.path, query: page.query || {}, slim }
}

async function shot(mp, name) {
  const dest = path.join(EVID, name)
  try {
    await mp.screenshot({ path: dest })
    return dest
  } catch (e) {
    return 'shot-fail:' + e.message
  }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), steps: [], errors: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    report.steps.push('connected')

    await mp.switchTab('/pages/content-list/content-list')
    await sleep(2000)
    report.content = await dump(mp)
    report.contentShot = await shot(mp, '06-content-list.png')
    report.steps.push('content:' + report.content.path)

    await mp.switchTab('/pages/mine/mine')
    await sleep(2000)
    report.mine = await dump(mp)
    report.mineShot = await shot(mp, '07-mine.png')
    report.steps.push('mine:' + report.mine.path)

    await mp.navigateTo('/pkg-trade/order-list/order-list')
    await sleep(2000)
    report.orders = await dump(mp)
    report.ordersShot = await shot(mp, '08-order-list.png')
    report.steps.push('orders:' + report.orders.path)

    try {
      await mp.navigateBack()
      await sleep(400)
    } catch (e) {
      report.errors.push('navBack:' + e.message)
    }

    await mp.navigateTo('/pkg-extra/form/form?id=1')
    await sleep(2500)
    report.form = await dump(mp)
    report.formShot = await shot(mp, '09-form.png')
    report.steps.push('form:' + report.form.path)

    await mp.navigateTo('/pages/product-detail/product-detail?id=9')
    await sleep(1200)
    report.product9 = await dump(mp)
    report.product9Shot = await shot(mp, '10-product-9-gate.png')
    report.steps.push('product9:' + report.product9.path)
  } catch (e) {
    report.errors.push(e.stack || e.message)
  } finally {
    if (mp) {
      try {
        await mp.disconnect()
      } catch (e) {
        report.errors.push('disconnect:' + e.message)
      }
    }
    report.finishedAt = new Date().toISOString()
    fs.writeFileSync(path.join(EVID, 'automator-report-2.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ steps: report.steps, errors: report.errors, content: report.content, mine: report.mine, orders: report.orders, form: report.form, product9: report.product9 }, null, 2))
  }
}

main()
