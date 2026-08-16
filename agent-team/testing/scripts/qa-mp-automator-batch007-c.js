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

    await mp.switchTab('/pages/index/index')
    await sleep(800)
    report.home = await dump(mp)
    report.steps.push('home:' + report.home.path)

    await mp.navigateTo('/pkg-extra/form/form?id=1')
    await sleep(4000)
    report.form = await dump(mp)
    report.formShot = await shot(mp, '11-form-from-home.png')
    report.steps.push('form:' + report.form.path + JSON.stringify(report.form.query))
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
    fs.writeFileSync(path.join(EVID, 'automator-report-3.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ steps: report.steps, errors: report.errors, form: report.form }, null, 2))
  }
}

main()
