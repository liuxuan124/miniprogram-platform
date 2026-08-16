const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const EVID = path.resolve(__dirname, '../evidence/BATCH-QA-007')
const WS = 'ws://127.0.0.1:9420'
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }
async function dump(mp) {
  const page = await mp.currentPage()
  let data = {}
  try { data = await page.data() } catch (e) { data = { _error: e.message } }
  const slim = {}
  Object.keys(data || {}).slice(0, 12).forEach((k) => {
    const v = data[k]
    slim[k] = Array.isArray(v) ? `Array(${v.length})` : v && typeof v === 'object' ? 'object' : v
  })
  return { path: page.path, query: page.query || {}, slim }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), errors: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    try {
      await mp.reLaunch('/pkg-extra/form/form?id=1')
      await sleep(1500)
      report.reLaunchForm = await dump(mp)
    } catch (e) {
      report.reLaunchFormErr = e.message
      try { report.afterFail = await dump(mp) } catch (_) {}
    }
    try {
      await mp.reLaunch('/pkg-extra/activity-list/activity-list')
      await sleep(1500)
      report.reLaunchAct = await dump(mp)
    } catch (e) {
      report.reLaunchActErr = e.message
    }
    try {
      await mp.screenshot({ path: path.join(EVID, '14-after-relaunch.png') })
    } catch (e) {
      report.shot = e.message
    }
  } catch (e) {
    report.errors.push(e.message)
  } finally {
    if (mp) { try { await mp.disconnect() } catch (e) { report.errors.push(e.message) } }
    fs.writeFileSync(path.join(EVID, 'automator-report-5.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  }
}
main()
