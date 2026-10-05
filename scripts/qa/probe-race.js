const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function stack(mp) {
  return mp.evaluate(() => getCurrentPages().map((p) => p.route)).catch(() => ['ERR'])
}

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  console.log('connected')
  const hits = []
  const delays = [0, 80, 200, 400, 800]
  for (let i = 0; i < delays.length; i += 1) {
    const delay = delays[i]
    // eslint-disable-next-line no-await-in-loop
    await mp.evaluate(() => new Promise((r) => wx.switchTab({ url: '/pages/index/index', complete: () => r(1) })))
    // eslint-disable-next-line no-await-in-loop
    await sleep(900)
    // 切到商城后立刻跳商品（模拟用户「秒点商品」，此时 tabBar 配置仍在异步加载）
    // eslint-disable-next-line no-await-in-loop
    await mp.evaluate((d) => new Promise((resolve) => {
      wx.switchTab({
        url: '/pages/shop/shop',
        complete: () => {
          setTimeout(() => {
            wx.navigateTo({ url: '/pkg-content/product-detail/product-detail?id=43' })
            resolve(1)
          }, d)
        },
      })
    }), delay).catch(() => {})
    // eslint-disable-next-line no-await-in-loop
    await sleep(2600)
    // eslint-disable-next-line no-await-in-loop
    const s = await stack(mp)
    const bounced = s.length === 1 && String(s[0]).includes('index')
    hits.push(bounced)
    console.log(`delay=${delay}ms 栈=${JSON.stringify(s)} ${bounced ? 'BOUNCED ❌' : 'OK ✅'}`)
    // 清理，回到商城起点
    // eslint-disable-next-line no-await-in-loop
    await mp.evaluate(() => new Promise((r) => wx.switchTab({ url: '/pages/index/index', complete: () => r(1) })))
  }
  console.log(`\n回跳次数 = ${hits.filter(Boolean).length}/${hits.length}`)
  try { await mp.disconnect() } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e && (e.message || e)); process.exit(1) })
