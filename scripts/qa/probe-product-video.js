// 探针：验证商品 48 详情页视频渲染
// 1) 读接口确认 videoUrl 回来
// 2) 读页面 data 确认 hasVideo=true / videoUrl 非空 / images 仍为 5
// 3) 触发 onVideoTap 确认 videoPlaying=true
// 4) 触发 onSwiperChange(1) 确认 videoPlaying 自动归零（滑离视频页暂停）
const automator = require('miniprogram-automator')

const APP = '/Users/lx/项目文件/liuxuan/小程序搭建运营系统/miniapp'
const PORT = 9423

;(async () => {
  let mp
  try {
    mp = await automator.connect({ wsEndpoint: `ws://127.0.0.1:${PORT}` })
  } catch (e) {
    console.log('CONNECT_FAIL:', e.message)
    process.exit(2)
  }
  console.log('已连接 IDE')

  // 走 navigateTo 进详情页（不用 reLaunch，reLaunch 对分包页会抛）
  await mp.evaluate(() => {
    wx.navigateTo({ url: '/pkg-content/product-detail/product-detail?id=48' })
  })
  await new Promise((r) => setTimeout(r, 3500))

  const probe = await mp.evaluate(() => {
    const pages = getCurrentPages()
    const p = pages[pages.length - 1]
    const d = p.data
    return {
      route: p.route,
      loading: d.loading,
      isWarmPhysical: d.isWarmPhysical,
      isWarmDigital: d.isWarmDigital,
      isColumn: d.isColumn,
      hasVideo: d.hasVideo,
      videoUrl: d.videoUrl,
      videoPlaying: d.videoPlaying,
      imagesLen: (d.product && d.product.images && d.product.images.length) || 0,
      name: d.product && d.product.name,
      price: d.product && d.product.price,
    }
  })
  console.log('页面 data:', JSON.stringify(probe, null, 1))

  if (!probe.hasVideo) {
    console.log('结论: hasVideo=false —— 该商品未落到 isWarmPhysical 分支或未取到 videoUrl')
    await mp.disconnect()
    process.exit(0)
  }

  // 点封面 → 播放
  const afterTap = await mp.evaluate(() => {
    const p = getCurrentPages().slice(-1)[0]
    p.onVideoTap()
    return p.data.videoPlaying
  })
  console.log('onVideoTap 后 videoPlaying =', afterTap)

  // 滑到第 1 张图 → 应自动暂停
  const afterSwipe = await mp.evaluate(() => {
    const p = getCurrentPages().slice(-1)[0]
    p.onSwiperChange({ detail: { current: 1 } })
    return { videoPlaying: p.data.videoPlaying, swiperCurrent: p.data.swiperCurrent }
  })
  console.log('滑到第1张图后:', JSON.stringify(afterSwipe))

  // 非法 URL 应被 _pickVideoUrl 过滤
  const badUrl = await mp.evaluate(() => {
    const p = getCurrentPages().slice(-1)[0]
    return p._pickVideoUrl({ videoUrl: 'https://x.com/a.png' })
  })
  console.log('图片URL应被过滤，结果:', JSON.stringify(badUrl))

  const ok = badUrl === '' && afterTap === true && afterSwipe.videoPlaying === false
  console.log(ok ? '\n✓ 全部断言通过' : '\n✗ 断言未全通过')

  await mp.disconnect()
})().catch((e) => {
  console.log('ERROR:', e && e.message)
  process.exit(1)
})
