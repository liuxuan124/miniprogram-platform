const automator = require('miniprogram-automator')
async function main() {
  const mp = await automator.connect({ wsEndpoint: process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:56647' })
  const page = await mp.currentPage()
  const selectors = ['.tab-bar', '.tab-item', 'custom-tab-bar', 'view', 'text']
  const result = {}
  for (const sel of selectors) {
    try {
      const els = await page.$$(sel)
      result[sel] = Array.isArray(els) ? els.length : null
    } catch (e) {
      result[sel] = String(e.message || e)
    }
  }
  console.log(JSON.stringify(result, null, 2))
  await mp.disconnect()
}
main().catch(err => { console.error(err && err.stack ? err.stack : err); process.exit(1) })
