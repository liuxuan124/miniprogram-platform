#!/usr/bin/env node
/**
 * 体验版两个线上问题取证：
 *  1) 进入小程序先闪出一个页面再出现首页（首页壳中间态）
 *  2) 商城点开某个商品后自动回跳首页
 *
 * 用法：
 *   node scripts/qa/mp-splash-bounce.js            # 全流程
 *   node scripts/qa/mp-splash-bounce.js splash     # 只测首屏中间态
 *   node scripts/qa/mp-splash-bounce.js bounce     # 只测商品点击回跳
 */
const path = require('path')
const { spawn } = require('child_process')
const automator = require('miniprogram-automator')

const PROJECT = path.resolve(__dirname, '../../miniapp')
const OUT = path.resolve(__dirname, '../../.workbuddy/tmp/qa')
const CLI = '/Applications/wechatwebdevtools.app/Contents/MacOS/cli'
const WS = 'ws://127.0.0.1:9420'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 先起 IDE 自动化服务（cli auto），再连接，避免 launch 时序抖动 */
async function ensureIde() {
  for (let i = 0; i < 2; i += 1) {
    try {
      return await automator.connect({ wsEndpoint: WS })
    } catch (e) {
      console.log(`connect attempt ${i + 1} failed: ${String(e.message || e).slice(0, 60)}`)
    }
    if (i === 0) {
      const child = spawn(CLI, ['auto', '--project', PROJECT, '--auto-port', '9420'], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()
      console.log('cli auto started, waiting for IDE ...')
      await sleep(25000)
    }
  }
  throw new Error('IDE connect failed')
}

async function launch() {
  const miniProgram = await ensureIde()
  const logs = []
  try {
    miniProgram.on('console', (msg) => {
      const line = `[${msg.type}] ${msg.args.map((a) => String(a && a._value !== undefined ? a._value : a)).join(' ')}`
      if (msg.type === 'error' || msg.type === 'log') logs.push(line)
    })
  } catch (e) {
    console.log('console hook failed:', String(e.message || e).slice(0, 80))
  }
  return { miniProgram, logs }
}

async function currentPath(mp) {
  try {
    const page = await mp.currentPage()
    return page.path
  } catch (e) {
    return 'ERR:' + String(e.message || e).slice(0, 60)
  }
}

/** 安装导航调用记录器：捕获谁把页面踢到别处 */
async function installNavProbe(mp) {
  await mp.evaluate(() => {
    if (globalThis.__navProbeInstalled) return 'already'
    globalThis.__navLog = []
    const names = ['switchTab', 'reLaunch', 'redirectTo', 'navigateTo', 'navigateBack']
    globalThis.__navOrigin = {}
    names.forEach((n) => {
      globalThis.__navOrigin[n] = wx[n].bind(wx)
    })
    globalThis.__navProbeInstalled = true
    return 'ok'
  })
  for (const n of ['switchTab', 'reLaunch', 'redirectTo', 'navigateTo', 'navigateBack']) {
    // eslint-disable-next-line no-await-in-loop
    await mp.mockWxMethod(n, function (obj) {
      const payload = obj || {}
      const site = (new Error('trace')).stack || ''
      const frames = String(site)
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l.indexOf('trace') < 0)
        .slice(0, 6)
      globalThis.__navLog.push({
        method: n,
        url: payload.url || ('delta=' + payload.delta),
        stack: frames,
      })
      return new Promise((resolve) => {
        globalThis.__navOrigin[n](Object.assign({}, payload, {
          success: (r) => { if (payload.success) payload.success(r); resolve({ ok: 1 }) },
          fail: (e) => { if (payload.fail) payload.fail(e); resolve({ fail: String(e && e.errMsg || e) }) },
        }))
      })
    })
  }
}

async function readNavLog(mp) {
  try {
    return await mp.evaluate(() => (globalThis.__navLog || []).slice(-20))
  } catch (e) {
    return [{ error: String(e.message || e) }]
  }
}

async function clearNavLog(mp) {
  await mp.evaluate(() => { globalThis.__navLog = [] }).catch(() => {})
}

/** 页面渲染指纹：区分「原生暖阁兜底壳」与「装修 DSL」 */
async function pageFingerprint(mp) {
  try {
    return await mp.evaluate(() => {
      const pages = getCurrentPages()
      const cur = pages[pages.length - 1]
      const d = (cur && cur.data) || {}
      const renderers = (cur && cur.selectAllComponents && cur.selectAllComponents('dsl-renderer')) || []
      const warmBlocks = (cur && cur.selectAllComponents && cur.selectAllComponents('dsl-warm-block')) || []
      return {
        route: cur && cur.route,
        dslMode: !!d.dslMode,
        dslPending: !!d.dslPending,
        loading: !!d.loading,
        homeBlocks: (d.homeBlocks || []).length,
        flow: (d.flowComponents || []).length,
        renderer: renderers.length,
        warmBlock: warmBlocks.length,
        error: d.error || '',
      }
    })
  } catch (e) {
    return { err: String(e.message || e).slice(0, 80) }
  }
}

async function splashProbe(mp) {
  console.log('\n===== A. 首屏中间态取证（清缓存 → reLaunch 首页） =====')
  await mp.callWxMethod('clearStorageSync').catch(() => {})
  await mp.evaluate(() => { try { wx.removeStorageSync('mp_system_config') } catch (e) {} }).catch(() => {})
  await mp.reLaunch('/pages/index/index').catch(() => {})
  const marks = [120, 260, 420, 700, 1100, 1800, 3000]
  let last = 0
  for (const t of marks) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(t - last)
    last = t
    const fp = await pageFingerprint(mp)
    console.log(`t+${t}ms`, JSON.stringify(fp))
    if (t === 260 || t === 700) {
      // eslint-disable-next-line no-await-in-loop
      await mp.screenshot({ path: path.join(OUT, `splash-${t}.png`) }).catch(() => {})
    }
  }
}

async function bounceProbe(mp) {
  console.log('\n===== B. 商城商品点击取证 =====')
  await mp.switchTab('/pages/shop/shop').catch(() => {})
  await sleep(3500)
  console.log('shop path =', await currentPath(mp))

  const picked = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const out = { lists: [], flash: [] }
    const renderers = (cur.selectAllComponents && cur.selectAllComponents('dsl-renderer')) || []
    renderers.forEach((r) => {
      const lists = (r.selectAllComponents && r.selectAllComponents('dsl-product-list')) || []
      lists.forEach((l) => {
        const dd = l.data.displayData || []
        out.lists.push({
          count: dd.length,
          first: dd[0] ? { id: dd[0].id, name: dd[0].name, action: dd[0].action || null } : null,
        })
      })
      const flashes = (r.selectAllComponents && r.selectAllComponents('dsl-flash-sale')) || []
      flashes.forEach((f) => {
        const items = f.data.items || []
        out.flash.push({
          count: items.length,
          first: items[0] ? { name: items[0].name, link: items[0].link } : null,
        })
      })
    })
    return out
  }).catch((e) => ({ error: String(e.message || e) }))
  console.log('商城组件数据 =', JSON.stringify(picked))

  await clearNavLog(mp)
  // 直接调用商品列表组件的点击处理，模拟用户点第一个商品卡片
  const tapRes = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const cur = pages[pages.length - 1]
    const renderers = (cur.selectAllComponents && cur.selectAllComponents('dsl-renderer')) || []
    let target = null
    renderers.forEach((r) => {
      const lists = (r.selectAllComponents && r.selectAllComponents('dsl-product-list')) || []
      lists.forEach((l) => { if (!target && (l.data.displayData || []).length) target = l })
    })
    if (!target) return 'NO_LIST'
    const id = (target.data.displayData[0] || {}).id
    target.onTapProduct({ currentTarget: { dataset: { id } } })
    return 'TAPPED:' + id
  }).catch((e) => 'ERR:' + String(e.message || e))
  console.log('点击结果 =', tapRes)

  for (const t of [400, 900, 1600, 2600, 4200]) {
    // eslint-disable-next-line no-await-in-loop
    await sleep(t === 400 ? 400 : 500)
    // eslint-disable-next-line no-await-in-loop
    console.log(`t+${t}ms path =`, await currentPath(mp), JSON.stringify(await pageFingerprint(mp)))
  }
  await mp.screenshot({ path: path.join(OUT, 'bounce-after.png') }).catch(() => {})
  console.log('导航调用记录 =', JSON.stringify(await readNavLog(mp), null, 2))
}

async function main() {
  const mode = process.argv[2] || 'all'
  const { miniProgram: mp, logs } = await launch()
  console.log('launched')
  if (process.env.QA_MOCK === '1') {
    try {
      await installNavProbe(mp)
      console.log('nav probe installed')
    } catch (e) {
      console.log('nav probe FAILED:', String(e && (e.message || e)).slice(0, 200))
    }
  }
  if (mode === 'all' || mode === 'splash') await splashProbe(mp)
  if (mode === 'all' || mode === 'bounce') await bounceProbe(mp)
  if (logs.length) console.log('\n--- 小程序日志(error/log) ---\n' + logs.slice(-25).join('\n'))
  try { await mp.disconnect() } catch (e) { /* ignore */ }
}

main().catch((e) => {
  console.error('FATAL', e && (e.message || e))
  process.exit(1)
})
