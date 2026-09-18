/**
 * DevTools 对照：线上接口 + 暖阁五槽绑定是否生效（dslMode=false, adminWarmBound）
 */
const automator = require('miniprogram-automator')
const fs = require('fs')
const path = require('path')

const OUT = path.join(__dirname, '../agent-team/testing/evidence/WARM-HANDOFF-2026-09-17/devtools')
fs.mkdirSync(OUT, { recursive: true })
const PORT = Number(process.env.AUTO_PORT || 9420)

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function visibleText(page, limit = 50) {
  const chunks = []
  try {
    const nodes = await page.$$('text, view, button')
    for (let i = 0; i < Math.min(nodes.length, limit); i += 1) {
      const t = ((await nodes[i].text()) || '').replace(/\s+/g, ' ').trim()
      if (t && t.length < 80) chunks.push(t)
    }
  } catch (e) { /* ignore */ }
  return [...new Set(chunks)]
}

;(async () => {
  const report = { at: new Date().toISOString(), automator: null, tabs: [] }
  let mp
  const cliPath = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
  try {
    mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${PORT}` })
    report.automator = `connected:${PORT}`
  } catch (e) {
    try {
      mp = await automator.launch({
        projectPath: path.join(__dirname, '..', 'miniapp'),
        cliPath,
        port: PORT,
      })
      report.automator = `launched:${PORT}`
    } catch (e2) {
      report.automator = 'connect_fail:' + e.message + ' | launch_fail:' + e2.message
      fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
      console.log(JSON.stringify(report, null, 2))
      process.exit(1)
    }
  }
  try {
    if (typeof mp.clearStorage === 'function') await mp.clearStorage()
  } catch (_) {}
  try {
    await mp.reLaunch('/pages/index/index')
    await sleep(2500)
  } catch (_) {}

  const tabs = [
    ['/pages/index/index', '暖阁出品'],
    ['/pages/discover/discover', '发现'],
    ['/pages/planet/planet', '星球'],
    ['/pages/shop/shop', '商城'],
    ['/pages/mine/mine', '我的'],
  ]

  try {
    for (const [url, expectHint] of tabs) {
      const row = { url, status: 'FAIL' }
      try {
        await mp.switchTab(url)
        await sleep(1800)
        const page = await mp.currentPage()
        row.path = page && page.path
        let data = {}
        try { data = await page.data() } catch (_) {}
        row.dslMode = data.dslMode
        row.dslPending = data.dslPending
        row.adminWarmBound = data.adminWarmBound
        row.loading = data.loading
        const texts = await visibleText(page)
        row.text = texts.join(' | ').slice(0, 280)
        row.hasChuhai = /出海笔记|跨境通/.test(row.text)
        row.hasWarm = /暖阁|NUANGE|慢一点/.test(row.text)
        const shot = url.replace(/\W+/g, '-').replace(/^-|-$/g, '') + '.png'
        await mp.screenshot({ path: path.join(OUT, shot) })
        row.shot = shot
        const nativeOk = row.dslMode === false && row.adminWarmBound === true
        const notWrongDsl = !row.hasChuhai
        row.status = (row.path && nativeOk && notWrongDsl) ? 'PASS' : 'FAIL'
        if (row.status === 'FAIL') {
          row.expect = { dslMode: false, adminWarmBound: true, hint: expectHint }
        }
      } catch (e) {
        row.error = e.message
      }
      report.tabs.push(row)
      console.log(row.status, url, 'dslMode=' + row.dslMode, 'warmBound=' + row.adminWarmBound, row.error || '')
    }
  } finally {
    try { await mp.disconnect() } catch (_) {}
  }

  report.pass = report.tabs.every((t) => t.status === 'PASS')
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ pass: report.pass, automator: report.automator, tabs: report.tabs.map((t) => ({ url: t.url, status: t.status, dslMode: t.dslMode, adminWarmBound: t.adminWarmBound })) }, null, 2))
  process.exit(report.pass ? 0 : 2)
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
