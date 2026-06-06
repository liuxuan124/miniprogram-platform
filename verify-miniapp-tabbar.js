const automator = require('miniprogram-automator')
async function main() {
  const mp = await automator.connect({ wsEndpoint: process.env.MINIAPP_WS_ENDPOINT || 'ws://127.0.0.1:56647' })
  const page = await mp.currentPage()
  const tabbar = await page.$('custom-tab-bar')
  let tabData = null
  if (tabbar) tabData = await tabbar.data()
  console.log(JSON.stringify({ hasTabbar: !!tabbar, tabData }, null, 2))
  await mp.disconnect()
}
main().catch(err => { console.error(err && err.stack ? err.stack : err); process.exit(1) })
