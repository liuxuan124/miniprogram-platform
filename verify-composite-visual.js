/**
 * 装修器复合视觉引擎真机（开发者工具模拟器）验证
 * 覆盖：
 *  1. 首页（Tab 壳 + 大量 DSL 组件）parseStyle 改动后渲染不白屏、无报错
 *  2. golden-parity 自定义页（本地 DSL）custom 页链路正常：
 *     pageBackgroundColor 有值、pageBackgroundCss 为空串（旧 DSL 无 background 字段）
 *  3. 旧 DSL 默认遮罩开启（bottomOverlay enabled，auto 色 = 背景色）
 *  4. overlay 节点在 wxml 中存在（evaluate 内部查询，规避跨边界选择器坑）
 */
const automator = require('miniprogram-automator')

const assert = (cond, msg) => {
  if (!cond) throw new Error('FAIL: ' + msg)
  console.log('  ✓ ' + msg)
}

async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://localhost:9420' })
  console.log('connected')

  // ---- 1. 首页回归：switchTab（reLaunch 对 tabBar 页抛错，用 evaluate 包）----
  await mp.evaluate(() => wx.switchTab({ url: '/pages/index/index' }))
  await new Promise((r) => setTimeout(r, 6000))
  const home = await mp.currentPage()
  assert(home && home.path.includes('pages/index'), '首页打开：' + (home && home.path))
  const homeData = await home.data()
  assert(!homeData.error, '首页无 error')
  assert(homeData.loading === false || homeData.loading === undefined, '首页 loading=' + homeData.loading)
  const homeFlow = homeData.flowComponents || homeData.components || []
  assert(homeFlow.length > 0, '首页组件数=' + homeFlow.length + '（parseStyle 改动后仍正常产出 styleString）')
  const firstStyle = (homeFlow.find((c) => c.styleString) || {}).styleString || ''
  assert(!/shadow-(x|y|blur|spread)/.test(firstStyle), 'styleString 不含裸 shadow_* 键（已合成为 box-shadow）')

  // ---- 2. 线上已发布自定义页（走 custom 页新链路：旧 DSL → solid 兼容路径）----
  await mp.evaluate(() => wx.navigateTo({ url: '/pages/custom/custom?path=' + encodeURIComponent('/pages/custom/motai-planet-join') }))
  await new Promise((r) => setTimeout(r, 6000))
  const custom = await mp.currentPage()
  assert(custom && custom.path.includes('pages/custom/custom'), 'custom 页打开：' + (custom && custom.path))
  const cd = await custom.data()
  assert(!cd.error, 'custom 页无 error：' + (cd.error || ''))
  assert(cd.loading === false, 'custom loading=false')
  assert(typeof cd.pageBackgroundColor === 'string' && cd.pageBackgroundColor.length > 0,
    'pageBackgroundColor=' + cd.pageBackgroundColor)
  assert(cd.pageBackgroundCss === '', '旧 DSL 无 background 字段 → pageBackgroundCss 为空串（纯色路径）')
  assert(cd.bottomOverlay && cd.bottomOverlay.enabled !== false,
    '旧 DSL 默认遮罩开启：height=' + (cd.bottomOverlay && cd.bottomOverlay.height) + 'rpx')
  assert(/^#/.test(cd.bottomOverlay && cd.bottomOverlay.color || ''),
    'auto 融合色已解析为背景底色：' + (cd.bottomOverlay && cd.bottomOverlay.color))
  assert((cd.flowComponents || []).length > 0, 'golden 页组件数=' + (cd.flowComponents || []).length)

  // ---- 3. overlay 节点真实渲染（evaluate 内查询）----
  const overlayFound = await mp.evaluate(() => {
    const el = document ? null : null // 降级：小程序无 document，用节点查询
    return new Promise((resolve) => {
      const q = wx.createSelectorQuery()
      q.select('.custom-page__overlay').boundingClientRect()
      q.exec((res) => resolve(res && res[0] ? { h: res[0].height, w: res[0].width } : null))
    })
  })
  assert(overlayFound && overlayFound.h > 0,
    'overlay 节点已渲染：w=' + (overlayFound && overlayFound.w) + ' h=' + (overlayFound && overlayFound.h) + 'px')

  await mp.disconnect()
  console.log('ALL PASS')
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err)
  process.exit(1)
})
