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
  return {
    path: page.path,
    query: page.query || {},
    templateId: data.templateId,
    templateTitle: data.templateTitle,
    templateDesc: data.templateDesc,
    fieldCount: Array.isArray(data.fields) ? data.fields.length : null,
    fields: data.fields,
    submitted: data.submitted,
    submitting: data.submitting,
  }
}

async function main() {
  const report = { startedAt: new Date().toISOString(), errors: [] }
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: WS })
    await mp.reLaunch('/pkg-extra/form/form?id=1')
    await sleep(3000)
    report.form = await dump(mp)
    try {
      await mp.screenshot({ path: path.join(EVID, '15-form-id1.png') })
      report.shot = '15-form-id1.png'
    } catch (e) {
      report.shot = e.message
    }
  } catch (e) {
    report.errors.push(e.stack || e.message)
  } finally {
    if (mp) { try { await mp.disconnect() } catch (e) { report.errors.push(e.message) } }
    fs.writeFileSync(path.join(EVID, 'automator-report-6.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify(report, null, 2))
  }
}
main()
