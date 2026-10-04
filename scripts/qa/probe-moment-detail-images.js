#!/usr/bin/env node
/**
 * 验证：星球动态详情页 locked 分支能否渲染出图片
 *
 * 背景：locked=true（星球会员门禁）时，pkg-content/moment-detail/moment-detail.js
 *      的 locked 分支曾写死 `images: []`，把后端返回的图片全扔了 →
 *      「信息流卡片有 3 张图、点进详情页一张都没有」。
 *
 * ⚠️ 为什么直接 navigateTo 而不模拟点击：
 *   星球页是 DSL 宿主壳，planet_feed 渲染在 `dsl-renderer` 自定义组件内，
 *   automator 的 `page.$$` / `page.createSelectorQuery` 匹配不到组件内部节点
 *   （page.$$('dsl-planet-feed') → 0）。本探针只验证详情页本身，
 *   跳转链路（卡片 bindtap → moment-detail?id=X&from=planet）由页面上手点验。
 *
 * 用法：node scripts/qa/probe-moment-detail-images.js [contentId]
 */
const path = require('path')
const automator = require('miniprogram-automator')

const ID = process.argv[2] || '68' // 68 = 小满「9 张图」那条，库里有 3 张图
const DETAIL_PAGE = 'pkg-content/moment-detail/moment-detail'

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const exceptions = []
  mp.on('exception', (e) => exceptions.push(String((e && e.message) || e)))

  console.log('=== 1. 进详情页 id=%s ===', ID)
  // ⚠️ mp.reLaunch 对分包/tabBar 页报 "Uncaught [object Object]"，用 wx.navigateTo
  const jumped = await mp.evaluate((id) => new Promise((res) => {
    wx.navigateTo({
      url: `/pkg-content/moment-detail/moment-detail?id=${id}&from=planet`,
      success: () => res('ok'),
      fail: (e) => res('fail ' + JSON.stringify(e)),
    })
  }), ID)
  console.log('navigateTo:', JSON.stringify(jumped))
  await new Promise((r) => setTimeout(r, 6000))

  const p = await mp.currentPage()
  console.log('当前页:', p.path, p.path === DETAIL_PAGE ? '✅' : '❌ 不是详情页')
  if (p.path !== DETAIL_PAGE) { await mp.disconnect(); process.exit(4) }

  const d = await p.data()
  const state = {
    loading: d.loading,
    usingDemo: d.usingDemo,
    loadFailed: d.loadFailed,
    loadErrorText: d.loadErrorText,
    author: d.moment && d.moment.author,
    bodyLen: (d.bodyText || '').length,
    statsLine: d.statsLine || '',
    images: (d.images || []).length,
  }
  console.log('=== 2. data ===')
  console.log(JSON.stringify(state, null, 2))
  ;(d.images || []).forEach((u, i) => console.log('   img[%d] %s', i, u))

  console.log('=== 3. getImageInfo 真实下载解码 ===')
  const info = await mp.evaluate(() => new Promise((res) => {
    const pages = getCurrentPages()
    const imgs = (pages[pages.length - 1].data.images || []).slice(0, 3)
    if (!imgs.length) return res([])
    Promise.all(imgs.map((u) => new Promise((r) => {
      wx.getImageInfo({
        src: u,
        success: (i) => r({ ok: true, w: i.width, h: i.height }),
        fail: (e) => r({ ok: false, err: e.errMsg }),
      })
    }))).then(res)
  }))
  info.forEach((i, n) => console.log('   [%d] %s', n, JSON.stringify(i)))

  console.log('\n=== 结论 ===')
  const noEx = d.loadFailed !== true && d.loading === false
  const hasImg = state.images > 0
  const decoded = info.length > 0 && info.every((i) => i.ok)
  console.log('页面可用:', noEx, '| data.images:', state.images, '| 全部解码成功:', decoded)
  const pass = noEx && hasImg && decoded
  console.log(pass
    ? `✅ 通过：locked 态详情页渲染 ${state.images} 张图（原来 0 张）`
    : '❌ 失败')
  if (exceptions.length) console.log('页面异常:', exceptions.join(' | '))
  console.log('提示：mp.screenshot 在本机 IDE 会 timeout，看图请手动截图或用 getImageInfo 判定')

  await mp.disconnect()
  process.exit(pass ? 0 : 1)
})().catch((e) => {
  console.error('探针异常:', (e && e.message) || e)
  process.exit(9)
})
