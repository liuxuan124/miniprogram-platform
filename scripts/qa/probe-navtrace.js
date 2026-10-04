const automator = require('miniprogram-automator')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const OUT = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/.workbuddy/tmp/qa/'

async function stack(mp) {
  return mp.evaluate(() => getCurrentPages().map((p) => p.route)).catch(() => ['ERR'])
}

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const lines = []
  mp.on('console', (msg) => {
    const text = msg.args.map((a) => String(a && a._value !== undefined ? a._value : a)).join(' ')
    lines.push(`[${msg.type}] ${text}`)
    if (text.includes('NAVPROBE')) console.log('>>>', text.slice(0, 600))
  })

  // 包装导航 API：只记录，不改变行为
  const installed = await mp.evaluate(() => {
    if (globalThis.__navProbe2) return 'already'
    globalThis.__navProbe2 = []
    const wrap = (name) => {
      const orig = wx[name]
      if (typeof orig !== 'function') return
      wx[name] = function (opts) {
        try {
          const st = String((new Error('x')).stack || '').split('\n').slice(1, 9)
            .map((l) => l.trim().replace(/^at\s+/, ''))
            .join(' | ')
          console.log('[NAVPROBE] ' + name + ' url=' + ((opts && opts.url) || ('delta=' + (opts && opts.delta))) + ' :: ' + st)
        } catch (e) { console.log('[NAVPROBE] ' + name + ' log-error ' + e.message) }
        return orig.apply(wx, arguments)
      }
    }
    ;['switchTab', 'reLaunch', 'redirectTo', 'navigateTo', 'navigateBack'].forEach(wrap)
    return 'ok'
  }).catch((e) => 'ERR:' + String(e.message || e))
  console.log('probe installed =', installed)

  await mp.evaluate(() => new Promise((r) => wx.switchTab({ url: '/pages/shop/shop', complete: () => r(1) })))
  await sleep(3000)
  console.log('栈 =', JSON.stringify(await stack(mp)))

  for (const id of (process.argv.slice(2).length ? process.argv.slice(2) : ['43'])) {
    console.log(`\n--- 触发跳转 id=${id} ---`)
    // eslint-disable-next-line no-await-in-loop
    await mp.evaluate((pid) => {
      wx.navigateTo({ url: '/pkg-content/product-detail/product-detail?id=' + pid })
      return 1
    }, id).catch((e) => console.log('evaluate err', String(e.message || e).slice(0, 80)))
    // eslint-disable-next-line no-await-in-loop
    for (let i = 1; i <= 5; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(800)
      // eslint-disable-next-line no-await-in-loop
      console.log(`  t+${(i * 0.8).toFixed(1)}s 栈 =`, JSON.stringify(await stack(mp)))
    }
    // eslint-disable-next-line no-await-in-loop
    await mp.screenshot({ path: OUT + `navprobe-${id}.png` }).catch(() => {})
  }
  console.log('\n=== 日志（含导航痕迹） ===')
  console.log(lines.filter((l) => /NAVPROBE|navigate|跳转|失败/.test(l)).slice(-30).join('\n'))
  try { await mp.disconnect() } catch (e) {}
}
main().catch((e) => { console.error('FATAL', e && (e.message || e)); process.exit(1) })
