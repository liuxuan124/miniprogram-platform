/**
 * 星球推荐组件（warm_planet_rec）真机验证
 * 2026-10-04：多星球横滑 / 单卡收敛 / 跳介绍页 / 设为主星球
 *
 * 踩坑（本机）：① mp.reLaunch() 对 tabBar 页抛错且返回值不是 Page，用 mp.currentPage()；
 *             ② 只有 mp.evaluate 能跑 getCurrentPages（page.evaluate 不可用）；
 *             ③ page.$$穿不透自定义组件，验渲染改读 data 快照。
 * 前置：cli open --project <miniapp> && cli auto --project <miniapp> --auto-port 9421
 * 用法：MINIAPP_AUTOMATOR_PORT=9421 node scripts/qa/verify-planet-rec-block.js
 */
const path = require('path')
const automator = require('miniprogram-automator')

const ROOT = path.join(__dirname, '..', '..')
const PORT = Number(process.env.MINIAPP_AUTOMATOR_PORT || 9421)

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function connect() {
  for (let i = 0; i < 20; i++) {
    try {
      return await automator.connect({ wsEndpoint: `ws://127.0.0.1:${PORT}`, timeout: 60000 })
    } catch (e) {
      await sleep(2000)
    }
  }
  throw new Error('automator 连接失败')
}

/** 轮询 mp.evaluate 直到返回真值 */
async function waitEval(mp, fn, label, tries = 30, gap = 1500) {
  for (let i = 0; i < tries; i++) {
    await sleep(gap)
    let v = null
    try { v = await mp.evaluate(fn) } catch (e) { v = null }
    if (v) return v
  }
  throw new Error(`等待超时：${label}`)
}

async function main() {
  const mp = await connect()
  try {
    // 走 evaluate 导航（reLaunch 对 tabBar 页抛错）
    await mp.evaluate(() => {
      wx.switchTab({ url: '/pages/index/index' })
    })
    await sleep(3000)

    const agg = await waitEval(mp, () => {
      const pages = getCurrentPages()
      const p = pages[pages.length - 1]
      if (!p || !p.data) return null
      const wv = p.data.warmView || {}
      if (!Array.isArray(wv.planets) || !wv.planets.length) return null
      return {
        route: p.route,
        planets: wv.planets.map((x) => ({
          id: x.planetId, title: x.title, joined: !!x.joined, primary: !!x.primary,
          items: (x.items || []).length, intro: !!x.introUrl, feed: !!x.feedUrl,
          itemTags: (x.items || []).map((it) => it.tag),
        })),
        primaryPlanetId: wv.primaryPlanetId,
        primaryOnly: !!wv.primaryOnly,
        legacyPlanetPlanetId: (wv.planet || {}).planetId || '',
      }
    }, '首页聚合 planets')
    console.log('\n=== /api/v1/mp/home/warm 归一化结果（端上 warmView） ===')
    console.log(JSON.stringify(agg, null, 2))

    const expect = await waitEval(mp, () => {
      const pages = getCurrentPages()
      const p = pages[pages.length - 1]
      const wv = (p.data && p.data.warmView) || {}
      const blocks = (p.data && p.data.homeBlocks) || []
      const blk = blocks.find((b) => b.type === 'warm_planet_rec')
      if (!blk) return null
      const cfg = blk.props || {}
      const all = (wv.planets || []).slice()
      const wantIds = Array.isArray(cfg.planet_ids) ? cfg.planet_ids : []
      let cards = wantIds.length
        ? wantIds.map((id) => all.find((x) => String(x.planetId) === String(id))).filter(Boolean)
        : all.slice()
      const limit = Number(cfg.planet_limit)
      if (Number.isFinite(limit) && limit > 0 && cards.length > limit) cards = cards.slice(0, limit)
      const single = String(cfg.planet_mode || 'multi') === 'single'
      const only = single || wv.primaryOnly === true || cards.length <= 1
      const main = only
        ? (cards.find((x) => String(x.planetId) === String(wv.primaryPlanetId)) || cards[0] || null)
        : null
      return {
        cfg: {
          planet_mode: cfg.planet_mode, planet_action: cfg.planet_action,
          planet_ids: cfg.planet_ids, planet_limit: cfg.planet_limit, title: cfg.title,
        },
        render: { multiCard: !only, cardCount: cards.length, mainId: main && main.planetId },
        handlers: {
          goPlanet: typeof p.goPlanet === 'function',
          onMainPlanetChange: typeof p.onMainPlanetChange === 'function',
        },
      }
    }, 'warm_planet_rec 块')
    console.log('\n=== 装修器属性 → 端上应渲染 ===')
    console.log(JSON.stringify(expect, null, 2))

    // 点第一张卡（复用组件内部判定逻辑，看会跳哪）
    const tap = await waitEval(mp, () => {
      const pages = getCurrentPages()
      const p = pages[pages.length - 1]
      const blocks = (p.data && p.data.homeBlocks) || []
      const blk = blocks.find((b) => b.type === 'warm_planet_rec')
      const w = (blk && blk.runtimeData) || {}
      const cards = w.planets || []
      const first = cards[0] || {}
      const cfg = (blk && blk.props) || {}
      const action = String(cfg.planet_action || '')
      const goFeed = action === 'feed' || action === 'always_feed'
        || (action !== 'intro' && !!first.joined)
      return {
        cardCount: cards.length,
        firstPlanetId: first.planetId || '',
        firstJoined: !!first.joined,
        targetKind: goFeed ? 'feed' : 'intro',
        targetUrl: goFeed ? (first.feedUrl || '') : (first.introUrl || ''),
      }
    }, '星球卡点击判定')
    console.log('\n=== 点第一张卡会跳到哪 ===')
    console.log(JSON.stringify(tap, null, 2))

    // 真跳一次，验证介绍页可达 + 有加入/设常驻按钮
    await mp.evaluate((url) => {
      wx.navigateTo({ url })
    }, tap.targetUrl)
    await sleep(5000)
    const after = await mp.evaluate(() => {
      const pages = getCurrentPages()
      const p = pages[pages.length - 1]
      return {
        route: p.route,
        planetId: p.data.planetId || '',
        title: (p.data.community || {}).title || '',
        ctaText: (p.data.community || {}).ctaText || '',
        isMain: p.data.isMain,
        loading: p.data.loading,
        loadError: p.data.loadError,
      }
    })
    console.log('\n=== 星球介绍页实达===')
    console.log(JSON.stringify(after, null, 2))
  } finally {
    try { await mp.disconnect() } catch (e) { /* ignore */ }
  }
}

main().catch((e) => { console.error('FAILED:', e && e.message); process.exit(1) })
