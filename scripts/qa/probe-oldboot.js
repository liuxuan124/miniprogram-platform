const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/.workbuddy/tmp/qa/'

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  await mp.evaluate(() => new Promise((r) => wx.switchTab({ url: '/pages/index/index', complete: () => r(1) })))
  await sleep(3500)
  console.log('就绪:', JSON.stringify(await mp.evaluate(() => {
    const p = getCurrentPages().pop()
    return { dslMode: p.data.dslMode, dslPending: p.data.dslPending, blocks: (p.data.homeBlocks || []).map((b) => b.type) }
  })))

  // 摆出「修复前的首发态」：dslMode=false + dslPending=true（旧 wxml 会落到 wx:else 渲染 homeBlocks）
  await mp.evaluate(() => {
    const p = getCurrentPages().pop()
    p.setData({ dslMode: false, dslPending: true, loading: false })
  })
  for (const t of [0, 200, 500, 1200]) {
    if (t) await sleep(200)
    // eslint-disable-next-line no-await-in-loop
    await mp.screenshot({ path: `${OUT}oldboot-${t}.png` }).catch(() => {})
    // eslint-disable-next-line no-await-in-loop
    const s = await mp.evaluate(() => {
      const p = getCurrentPages().pop()
      return { dslMode: p.data.dslMode, dslPending: p.data.dslPending, flow: (p.data.flowComponents || []).length }
    }).catch(() => ({}))
    console.log(`t≈${t}ms`, JSON.stringify(s))
  }
  try { await mp.disconnect() } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e && (e.message || e)); process.exit(1) })
