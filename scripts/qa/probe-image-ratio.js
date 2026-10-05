#!/usr/bin/env node
/**
 * 实测：wx.getImageInfo 对 webp 是否支持 + 组件是否拿到比例
 * 用法：node scripts/qa/probe-image-ratio.js [页面路径]
 */
const path = require('path')
const automator = require('miniprogram-automator')

const PROJECT = path.resolve(__dirname, '../../miniapp')
const TARGET = process.argv[2] || 'pages/index/index'

;(async () => {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  const logs = []
  mp.on('console', (m) => logs.push(String(m)))

  console.log('导航到', TARGET)
  if ((await mp.currentPage()).path !== TARGET) {
    await mp.reLaunch(TARGET)
  }
  await new Promise((r) => setTimeout(r, 4000))

  const res = await mp.evaluate(() => {
    return new Promise((resolve) => {
      // 找到含 dsl-note-feed 的页面
      const pages = getCurrentPages()
      let urls = []
      for (let i = pages.length - 1; i >= 0; i -= 1) {
        const p = pages[i]
        const d = p.data || {}
        const list = d.displayData || (d.__feedData && d.__feedData.displayData) || []
        list.forEach((it) => it.cover_url && urls.push(it.cover_url))
        if (urls.length) break
      }
      if (!urls.length) {
        return resolve({ err: '未取到 cover_url', page: pages[pages.length - 1].route, keys: Object.keys(pages[pages.length - 1].data || {}) })
      }

      const test = (url) =>
        new Promise((r) => {
          let done = false
          setTimeout(() => { if (!done) { done = true; r({ url: url.slice(-26), timeout: true }) } }, 6000)
          wx.getImageInfo({
            src: url,
            success: (info) => { if (!done) { done = true; r({ url: url.slice(-26), w: info.width, h: info.height, type: info.type }) } },
            fail: (e) => { if (!done) { done = true; r({ url: url.slice(-26), fail: e.errMsg || 'fail' }) } },
          })
        })

      Promise.all(urls.slice(0, 5).map(test)).then((rs) => resolve({ total: urls.length, results: rs }))
    })
  })

  console.log('\n=== wx.getImageInfo 实测 ===')
  console.log(JSON.stringify(res, null, 2))

  // 读取本地缓存里已探测到的比例
  const cache = await mp.callWxMethod('getStorageSync', 'cover_ratio_cache')
  const keys = cache ? Object.keys(cache) : []
  console.log('\n=== 本地比例缓存 ===')
  console.log('  条数:', keys.length)
  keys.slice(0, 5).forEach((k) => {
    const v = cache[k]
    console.log('  %s -> %s%%', k.slice(-30), v && v.r != null ? v.r.toFixed(1) : JSON.stringify(v))
  })

  if (logs.length) {
    console.log('\n=== 页面控制台（前 25 条）===')
    logs.slice(0, 25).forEach((l) => console.log('  ', l))
  }

  await mp.disconnect()
  process.exit(0)
})().catch((e) => { console.error('失败:', e.message); process.exit(1) })
