/**
 * 配置读取与发布号同步 — 本地 Node 冒烟（不替代微信开发者工具/真机）
 */
const assert = require('assert')

global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
  getStorageSync: () => '',
  setStorageSync: () => {},
  removeStorageSync: () => {},
  getStorageInfoSync: () => ({ keys: [] }),
}

const contentView = require('./content-view')
const { buildDslCacheKey } = require('../services/page')
const { shouldRenderHomeAsFullDsl } = require('./warm-home-template')
const { resolvePageBackgroundColor, getNavigationFrontColor } = require('./theme')
const { isCustomNavigationRoute } = require('./nav-layout')
const { normalizeFixedListLimit } = require('../services/datasource')

assert.strictEqual(contentView.contentViewParam(), 'online', '正式环境默认 online')
assert.strictEqual(contentView.isDraftPreviewActive(), false)

global.wx.getAccountInfoSync = () => ({ miniProgram: { envVersion: 'trial' } })
global.wx.getStorageSync = () => 'preview-token-must-be-long-enough-1234567890'
assert.strictEqual(contentView.contentViewParam(), 'draft', '体验版带 pt 时为 draft')
assert.ok(contentView.previewRequestHeaders()['X-Mp-Preview-Token'])

const k1 = buildDslCacheKey('home', 'online', '1_r3')
const k2 = buildDslCacheKey('home', 'draft', '1_r3')
assert.notStrictEqual(k1, k2, 'draft/online DSL 缓存键必须隔离')

assert.strictEqual(shouldRenderHomeAsFullDsl([{ type: 'warm_home' }]), false)
assert.strictEqual(
  shouldRenderHomeAsFullDsl([{ type: 'brand_intro' }, { type: 'article_list' }]),
  true,
)
assert.strictEqual(
  resolvePageBackgroundColor({ background_color: '#f5f6f9' }, { pageBgColor: '#FDF6EC' }),
  '#f5f6f9',
  '装修页背景应优先于站点主题背景',
)
assert.strictEqual(
  resolvePageBackgroundColor({}, { pageBgColor: '#FDF6EC' }),
  '#FDF6EC',
  '装修页未配置背景时应回退站点主题背景',
)
assert.strictEqual(getNavigationFrontColor('#f5f6f9'), '#000000')
assert.strictEqual(getNavigationFrontColor('#1f2937'), '#ffffff')
assert.strictEqual(isCustomNavigationRoute('/pages/index/index'), true)
assert.strictEqual(isCustomNavigationRoute('pages/custom/custom'), false)
assert.strictEqual(normalizeFixedListLimit(12), 12, '商城固定商品列表应尊重 DSL limit=12')
assert.strictEqual(normalizeFixedListLimit(undefined), 6, '未声明数量的旧组件保持 6 条安全上限')

const { resolveActiveTabItems } = require('./tabbar-config')
const fiveTabs = [
  { text: '首页', tabRoute: '/pages/index/index', pagePath: '/pages/index/index', enabled: true },
  { text: '发现', tabRoute: '/pages/discover/discover', pagePath: '/pages/discover/discover', enabled: true },
  {
    text: '星球',
    tabRoute: '/pages/planet/planet',
    pagePath: '/pages/custom/warm-planet',
    enabled: true,
  },
  { text: '商城', tabRoute: '/pages/shop/shop', pagePath: '/pages/shop/shop', enabled: true },
  { text: '我的', tabRoute: '/pages/mine/mine', pagePath: '/pages/mine/mine', enabled: true },
]
const pluginMap = { planet: true, product: true, member: true, content: true }
assert.strictEqual(
  resolveActiveTabItems(pluginMap, fiveTabs).length,
  5,
  'plugins 为对象 map 时不应误删星球 Tab',
)

console.log('[content-config.test] ok')
