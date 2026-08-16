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
  Object.keys(data || {}).slice(0, 24).forEach((k) => {
    const v = data[k]
    slim[k] = Array.isArray(v) ? `Array(${v.length})` : v && typeof v === 'object' ? 'object' : v
  })
  return { path: page.path, query: page.query || {}, slim }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), steps: [], errors: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    await mp.switchTab('/pages/index/index')
    await sleep(500)
    report.before = await dump(mp)

    await mp.navigateTo('/pkg-extra/form/form?id=1')
    report.t400 = await dump(mp)
    try {
      await mp.screenshot({ path: path.join(EVID, '12-form-t400.png') })
      report.shot400 = '12-form-t400.png'
    } catch (e) {
      report.shot400 = e.message
    }

    await sleep(800)
    report.t1200 = await dump(mp)
    try {
      await mp.screenshot({ path: path.join(EVID, '13-form-t1200.png') })
      report.shot1200 = '13-form-t1200.png'
    } catch (e) {
      report.shot1200 = e.message
    }

    await sleep(2000)
    report.t3200 = await dump(mp)
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
    fs.writeFileSync(path.join(EVID, 'automator-report-4.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ errors: report.errors, before: report.before, t400: report.t400, t1200: report.t1200, t3200: report.t3200 }, null, 2))
  }
}

main()
