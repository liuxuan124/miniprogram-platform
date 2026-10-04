const automator = require('miniprogram-automator')
const PROJECT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp'
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/.workbuddy/tmp/qa'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  let miniProgram
  for (let i = 0; i < 4; i++) {
    try { miniProgram = await automator.launch({ projectPath: PROJECT }); break }
    catch (e) { console.log('attempt', i + 1, 'failed'); await sleep(15000) }
  }
  if (!miniProgram) throw new Error('launch failed')
  await miniProgram.reLaunch('/pkg-content/product-detail/product-detail?id=41')
  await sleep(6000)
  console.log('商品详情 id=41 →', await miniProgram.evaluate(() => getCurrentPages().pop().route))
  await miniProgram.screenshot({ path: OUT + '/check-product-detail.png' })
  await miniProgram.reLaunch('/pages/custom/custom?path=pages/custom/motai-planet-join')
  await sleep(6000)
  console.log('P7 →', await miniProgram.evaluate(() => getCurrentPages().pop().route))
  await miniProgram.screenshot({ path: OUT + '/check-p7.png' })
  await miniProgram.switchTab('/pages/shop/shop')
  await sleep(9000)
  await miniProgram.screenshot({ path: OUT + '/tab-shop-final.png' })
  console.log('shop shot ok')
  await miniProgram.close()
  process.exit(0)
})().catch((e) => { console.error('FATAL', e.message || e); process.exit(1) })
