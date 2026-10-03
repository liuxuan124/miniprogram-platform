// services/system.js — 系统配置服务
// 获取后端系统配置（tabbar、插件开关等）

const { get } = require('../utils/request')
const contentView = require('../utils/content-view')
const { StorageUtil } = require('../utils/storage')
const { LOGIN_RULES } = require('../config/login-rules')
const {
  DEFAULT_MINIAPP_BRAND_CONFIG,
  normalizeBrandConfig,
  setMediaUrlResolver,
} = require('../utils/brand-config')
const { resolveMediaUrl } = require('../utils/media-url')

setMediaUrlResolver(resolveMediaUrl)

const CONFIG_CACHE_KEY = 'system_config'
const CONTENT_RELEASE_NO_KEY = 'content_release_no'
const CONFIG_CACHE_EXPIRE = 10 * 60 * 1000
const STORAGE_KEY_PREFIX = 'mp_'

const DEFAULT_TABBAR_LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/discover/discover', text: '发现', icon: '🔍' },
  { pagePath: '/pages/planet/planet', text: '星球', icon: '🪐' },
  { pagePath: '/pages/shop/shop', text: '商城', icon: '🛍️' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' },
]

const DEFAULT_ORDER_QUICK_ACCESS = {
  showOrderTabs: true,
  showAllOrdersBtn: true,
  tabLabels: {
    pending: '待付款',
    paid: '待发货',
    shipped: '待收货',
    completed: '已完成',
  },
}

const DEFAULT_USER_PROFILE = {
  showAvatar: true,
  showNickname: true,
  showMemberLevel: true,
  allowEditProfile: true,
  memberLevelLabel: '会员等级',
}

const DEFAULT_MINE_PAGE_CONFIG = {
  loginTitle: '点击登录，同步阅读偏好',
  loginSubtitle: '收藏文章、接收内容更新提醒',
  loginButtonText: '登录',
  memberCardTitle: '会员中心',
  showMenuIcons: true,
  showDecorBackground: true,
  showMemberCard: false,
  templateStyle: 'warm',
  style: 'gradient',
  themeColor: '#C2410C',
  themeColorSecondary: '#EA580C',
  servicePhone: '',
  loginRules: LOGIN_RULES.mineMenuRequireLogin,
  /**
   * 默认菜单口径与以下两处保持一致，改任意一处请三处同步：
   * - 小程序兜底：pages/mine/mine.js 的 DEFAULT_MENU_GROUPS
   * - 管理端默认：admin/src/types/miniapp.ts 的 DEFAULT_MINE_MENU
   * group 为空会导致菜单全部落进「更多」分组。
   */
  menuItems: [
    { id: 'ask', icon: 'line:check', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'contribute', icon: 'line:pencil', title: '成为创作者', url: '/pkg-content/contribute/contribute', enabled: true, needLogin: false, group: '内容与订单' },
    { id: 'orders', icon: 'line:document', title: '我的订单', url: '/pkg-trade/order-list/order-list', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'resources', icon: 'line:books', title: '我的资料库', url: '/pkg-content/resources/resources', enabled: true, needLogin: false, group: '内容与订单' },
    { id: 'invoice', icon: 'line:clipboard', title: '发票管理', url: '/pkg-trade/order-list/order-list', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'coupons', icon: 'line:coupon', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', enabled: true, needLogin: true, group: '内容与订单' },
    { id: 'share', icon: 'line:share', title: '邀请好友', url: '/pkg-content/share/share', enabled: true, needLogin: false, group: '内容与订单' },
    { id: 'templates', icon: 'line:grid', title: '整店模版', url: '/pkg-templates/list/list', enabled: true, needLogin: false, group: '会员与服务' },
    { id: 'join', icon: 'line:user', title: '加入读者群', url: '/pkg-content/join/join', enabled: true, needLogin: false, group: '会员与服务' },
    { id: 'service', icon: 'line:chat', title: '联系客服', url: '/pkg-user/service-chat/service-chat', enabled: true, needLogin: false, group: '会员与服务' },
    { id: 'feedback', icon: 'line:mail', title: '意见反馈', url: '/pkg-user/feedback/feedback', enabled: true, needLogin: false, group: '会员与服务' },
    { id: 'settings', icon: 'line:gear', title: '设置', url: '/pkg-user/settings/settings', enabled: true, needLogin: false, group: '会员与服务' },
  ],
  orderQuickAccess: { ...DEFAULT_ORDER_QUICK_ACCESS, tabLabels: { ...DEFAULT_ORDER_QUICK_ACCESS.tabLabels } },
  userProfile: { ...DEFAULT_USER_PROFILE },
}

function parseConfigField(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value
  if (typeof value !== 'string' || !value.trim()) return fallback
  try {
    return JSON.parse(value)
  } catch (e) {
    return fallback
  }
}

const DEFAULT_LOGIN_PAGE_CONFIG = {
  heroTitle: '欢迎回来',
  heroSubtitle: '登录后同步收藏、预约与阅读记录',
  loginButtonText: '手机号快捷登录',
  skipButtonText: '暂不登录',
  securityBadgeText: '安全登录',
  sheetTitle: '手机号快捷登录',
  sheetSubtitle: '使用授权信息快速登录',
  privacyNoteText: '未登录也可浏览资讯；手机号仅用于登录，不会公开展示',
  showDecorOrbs: true,
  showSecurityBadge: true,
  showBackButton: true,
  templateStyle: 'warm',
  themeColor: '#C2410C',
  themeColorSecondary: '#EA580C',
}

/** 登录页 4 套皮肤归一化（warm/brand/minimal/wechat） */
function resolveLoginPageStyleKey(login) {
  if (!login) return 'warm'
  const raw = String(login.templateStyle || '').trim().toLowerCase()
  if (raw === 'brand' || raw === 'focus') return 'brand'
  if (raw === 'minimal' || raw === 'plain' || raw === 'simple') return 'minimal'
  if (raw === 'wechat' || raw === 'native') return 'wechat'
  return 'warm'
}

function normalizeLoginPageConfig(raw) {
  const base = { ...DEFAULT_LOGIN_PAGE_CONFIG }
  const src = raw && typeof raw === 'object' ? raw : {}
  const merged = { ...base, ...src }
  merged.styleKey = resolveLoginPageStyleKey(merged)
  return merged
}

const DEFAULT_CONTENT_LIST_CONFIG = {
  showRank: true,
  showFeatured: true,
  featuredContentId: '',
}

const DEFAULT_PRODUCT_LIST_CONFIG = {
  title: '精选好物',
  intro: '精选在售商品',
  guarantees: ['商家正常发货', '订单进度可查', '售后保障'],
  showTitle: true,
  showIntro: true,
  showGuarantees: true,
}

function normalizeContentListConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const featured = src.featuredContentId != null && src.featuredContentId !== ''
    ? src.featuredContentId
    : (src.featured_content_id || '')
  return {
    showRank: src.showRank !== false && src.show_rank !== false,
    showFeatured: src.showFeatured !== false && src.show_featured !== false,
    featuredContentId: featured,
  }
}

function normalizeProductListConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const guarantees = Array.isArray(src.guarantees)
    ? src.guarantees.map((g) => String(g || '').trim()).filter(Boolean)
    : DEFAULT_PRODUCT_LIST_CONFIG.guarantees
  return {
    title: String(src.title || DEFAULT_PRODUCT_LIST_CONFIG.title),
    intro: String(src.intro || DEFAULT_PRODUCT_LIST_CONFIG.intro),
    guarantees: guarantees.length ? guarantees : DEFAULT_PRODUCT_LIST_CONFIG.guarantees,
    showTitle: src.showTitle !== false && src.show_title !== false,
    showIntro: src.showIntro !== false && src.show_intro !== false,
    showGuarantees: src.showGuarantees !== false && src.show_guarantees !== false,
  }
}

function attachListConfigs(config) {
  if (!config || typeof config !== 'object') return config
  config.contentListConfig = normalizeContentListConfig(
    parseConfigField(config.content_list_config || config.contentListConfig, DEFAULT_CONTENT_LIST_CONFIG),
  )
  config.productListConfig = normalizeProductListConfig(
    parseConfigField(config.product_list_config || config.productListConfig, DEFAULT_PRODUCT_LIST_CONFIG),
  )
  config.contentMemberWall = normalizeContentMemberWall(
    parseConfigField(config.content_member_wall || config.contentMemberWall, null),
  )
  return config
}

/** 门禁卡：只透传库里的字段，不在代码里写死原型文案 */
function normalizeContentMemberWall(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const remainRaw = src.remainPercent != null ? src.remainPercent : src.remain_percent
  const remainPercent = Number(remainRaw)
  return {
    remainPercent: Number.isFinite(remainPercent) && remainPercent > 0 ? Math.min(95, Math.floor(remainPercent)) : '',
    desc: String(src.desc || '').trim(),
    memberYearPrice: String(src.memberYearPrice || src.member_year_price || '').trim(),
    unlockProductId: src.unlockProductId != null && src.unlockProductId !== ''
      ? src.unlockProductId
      : (src.unlock_product_id || ''),
    unlockProductName: String(src.unlockProductName || src.unlock_product_name || '').trim(),
  }
}

function normalizeTabbarItems(items) {
  if (!Array.isArray(items) || items.length === 0) return DEFAULT_TABBAR_LIST
  return items.map((item) => {
    const rawPath = item.path || item.pagePath || ''
    const pagePath = rawPath ? '/' + String(rawPath).replace(/^\/+/, '') : '/pages/index/index'
    return {
      ...item,
      pagePath,
      text: item.name || item.text || '页面',
      icon: item.icon || '📌',
    }
  })
}

function normalizeOrderTabLabels(raw) {
  const src = raw || {}
  return {
    pending: src.pending || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.pending,
    paid: src.paid || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.paid,
    shipped: src.shipped || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.shipped,
    completed:
      src.completed
      || (src.refund === '退换/售后' ? DEFAULT_ORDER_QUICK_ACCESS.tabLabels.completed : src.refund)
      || DEFAULT_ORDER_QUICK_ACCESS.tabLabels.completed,
  }
}

/** 我的页布局皮肤：仅认后台显式 templateStyle，不再根据 themeColor 十六进制自动切蓝/金 */
function resolveMineStyleKey(mine) {
  if (!mine) return 'warm'
  const raw = String(mine.templateStyle || '').trim().toLowerCase()
  if (raw === 'member' || raw === 'premium') return 'member'
  if (raw === 'basic' || raw === 'standard' || raw === 'minimal' || raw === 'dark' || raw === 'simple') {
    return 'basic'
  }
  return 'warm'
}

function normalizeMinePageConfig(raw) {
  const base = { ...DEFAULT_MINE_PAGE_CONFIG }
  const src = raw && typeof raw === 'object' ? raw : {}
  const orderQuickAccess = {
    ...DEFAULT_ORDER_QUICK_ACCESS,
    ...(src.orderQuickAccess || {}),
    tabLabels: normalizeOrderTabLabels(
      (src.orderQuickAccess && src.orderQuickAccess.tabLabels) || src.tabLabels,
    ),
  }
  const userProfile = {
    ...DEFAULT_USER_PROFILE,
    ...(src.userProfile || {}),
  }
  const menuItems = Array.isArray(src.menuItems) && src.menuItems.length
    ? src.menuItems
    : DEFAULT_MINE_PAGE_CONFIG.menuItems

  return {
    ...base,
    ...src,
    showMenuIcons: src.showMenuIcons !== false,
    showDecorBackground: src.showDecorBackground !== false,
    showMemberCard: src.showMemberCard !== false,
    orderQuickAccess,
    userProfile,
    menuItems,
  }
}

function getCachedConfig() {
  return StorageUtil.get(CONFIG_CACHE_KEY) || null
}

function getTabbarList() {
  const cached = StorageUtil.get(CONFIG_CACHE_KEY)
  if (cached && cached.tabbarItems && Array.isArray(cached.tabbarItems)) {
    return cached.tabbarItems
  }
  return null
}

function getTabbarListSync() {
  return getTabbarList() || DEFAULT_TABBAR_LIST.filter(item => item.enabled !== false)
}

async function fetchSystemConfig(forceRefresh) {
  if (!forceRefresh) {
    const cached = getCachedConfig()
    if (Array.isArray(cached)) {
      forceRefresh = true
    } else if (cached && typeof cached === 'object') {
      if (!cached.miniappBrandConfig) {
        forceRefresh = true
      } else {
        cached.miniappBrandConfig = normalizeBrandConfig(
          parseConfigField(cached.miniappBrandConfig, null),
          {
            site_name: cached.site_name,
            site_logo: cached.site_logo,
            appName: cached.appName,
          },
        )
        if (cached.minePageConfig) {
          cached.minePageConfig = normalizeMinePageConfig(
            parseConfigField(cached.minePageConfig, DEFAULT_MINE_PAGE_CONFIG),
          )
        }
        cached.loginPageConfig = normalizeLoginPageConfig(
          parseConfigField(cached.loginPageConfig, DEFAULT_LOGIN_PAGE_CONFIG),
        )
        if (cached.tabbarItems) {
          cached.tabbarItems = applyProductModuleGate(
            normalizeTabbarItems(parseConfigField(cached.tabbarItems, null)),
            cached.plugins,
          )
        }
        attachListConfigs(cached)
        return cached
      }
    }
  }

  try {
    const view = contentView.contentViewParam()
    const res = await get('/api/v1/mp/system/config', { view }, { auth: false })
    const config = res && res.data ? res.data : res
    if (config && typeof config === 'object') {
      config.tabbarItems = parseConfigField(config.tabbarItems, null)
      config.minePageConfig = normalizeMinePageConfig(
        parseConfigField(config.minePageConfig, DEFAULT_MINE_PAGE_CONFIG),
      )
      config.loginPageConfig = normalizeLoginPageConfig(
        parseConfigField(config.loginPageConfig, DEFAULT_LOGIN_PAGE_CONFIG),
      )
      config.plugins = parseConfigField(config.plugins, [])
      config.miniappThemeConfig = parseConfigField(config.miniappThemeConfig, null)
      config.miniappBrandConfig = normalizeBrandConfig(
        parseConfigField(config.miniappBrandConfig, null),
        {
          site_name: config.site_name,
          site_logo: config.site_logo,
          appName: config.appName,
        },
      )
      config.tabbarItems = normalizeTabbarItems(config.tabbarItems)
      config.tabbarItems = applyProductModuleGate(config.tabbarItems, config.plugins)
      attachListConfigs(config)
      const releaseNo = String(config.live_release_no != null ? config.live_release_no : '0')
      const prevRelease = StorageUtil.get(CONTENT_RELEASE_NO_KEY)
      if (prevRelease && prevRelease !== releaseNo) {
        clearSystemConfigCache()
        clearPageDslStorageCaches()
        try {
          const app = getApp()
          if (app && app.globalData) app.globalData.pageDSLCache = {}
        } catch (e) { /* ignore */ }
      }
      StorageUtil.set(CONTENT_RELEASE_NO_KEY, releaseNo)
      StorageUtil.set(CONFIG_CACHE_KEY, config, CONFIG_CACHE_EXPIRE)
      return config
    }
  } catch (e) {
    console.warn('[SystemService] 获取系统配置失败:', e)
    const stale = getCachedConfig()
    if (stale && typeof stale === 'object' && !Array.isArray(stale)) {
      if (stale.tabbarItems) {
        stale.tabbarItems = applyProductModuleGate(
          normalizeTabbarItems(parseConfigField(stale.tabbarItems, null)),
          stale.plugins,
        )
      }
      attachListConfigs(stale)
      return stale
    }
  }

  return {
    tabbarItems: DEFAULT_TABBAR_LIST,
    minePageConfig: DEFAULT_MINE_PAGE_CONFIG,
    loginPageConfig: normalizeLoginPageConfig(DEFAULT_LOGIN_PAGE_CONFIG),
    miniappThemeConfig: null,
    miniappBrandConfig: DEFAULT_MINIAPP_BRAND_CONFIG,
    contentListConfig: DEFAULT_CONTENT_LIST_CONFIG,
    productListConfig: DEFAULT_PRODUCT_LIST_CONFIG,
    contentMemberWall: normalizeContentMemberWall(null),
  }
}

async function fetchTabbarList(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  const list = config.tabbarItems || DEFAULT_TABBAR_LIST
  return applyProductModuleGate(list, config.plugins).filter(item => item.enabled !== false)
}

function isMemberMenuItem(item) {
  const id = String((item && item.id) || '')
  const url = String((item && (item.url || item.pagePath)) || '')
  return id === 'member-center' || url.indexOf('member-center') >= 0
}

function isMemberModuleEnabled(plugins) {
  const parsed = Array.isArray(plugins) ? plugins : parseConfigField(plugins, null)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return pluginFlagFromMap(parsed, 'member', true)
  }
  const list = Array.isArray(parsed) ? parsed : []
  if (!list.length) return true
  const hit = list.find((p) => p && p.key === 'member')
  if (!hit) return true
  return hit.enabled !== false
}

function pluginFlagFromMap(map, key, defaultEnabled) {
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    return defaultEnabled !== false
  }
  if (!(key in map)) return defaultEnabled !== false
  const v = map[key]
  if (typeof v === 'boolean') return v
  if (v && typeof v === 'object' && 'enabled' in v) return v.enabled !== false
  return !!v
}

function isProductModuleEnabled(plugins) {
  const parsed = Array.isArray(plugins) ? plugins : parseConfigField(plugins, null)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return pluginFlagFromMap(parsed, 'product', true)
  }
  const list = Array.isArray(parsed) ? parsed : []
  // 无插件列表 / 无 product 项时默认开启，避免刷新后误关商城并二次 switchTab 回首页
  if (!list.length) return true
  const hit = list.find((p) => p && p.key === 'product')
  if (!hit) return true
  return hit.enabled !== false
}

function isPluginEnabled(plugins, key, defaultEnabled) {
  const parsed = Array.isArray(plugins) ? plugins : parseConfigField(plugins, null)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return pluginFlagFromMap(parsed, key, defaultEnabled)
  }
  const list = Array.isArray(parsed) ? parsed : []
  if (!list.length) return defaultEnabled !== false
  const hit = list.find((p) => p && p.key === key)
  if (!hit) return defaultEnabled !== false
  return hit.enabled !== false
}

function isQaModuleEnabled(plugins) {
  return isPluginEnabled(plugins, 'qa', false)
}

function isFormModuleEnabled(plugins) {
  return isPluginEnabled(plugins, 'form', false)
}

function isCommentModuleEnabled(plugins) {
  return isPluginEnabled(plugins, 'comment', true)
}

function isProductTabItem(item) {
  const shell = String((item && (item.tabRoute || item.slotRoute)) || '')
  if (/shop|knowledge-mall|product-list/.test(shell)) return true
  const path = String((item && (item.pagePath || item.path)) || '')
  const text = String((item && (item.text || item.name)) || '')
  const pageName = String((item && item.pageName) || '')
  if (/knowledge-mall|product-list|\/pages\/shop|product-detail|\/cart/.test(path)) return true
  return /商品|商城/.test(text) || /商城|商品/.test(pageName)
}

function isTradeMenuItem(item) {
  const id = String((item && item.id) || '')
  const url = String((item && (item.url || item.pagePath)) || '')
  if (id === 'orders' || id === 'library' || id === 'coupons') return true
  return /order-list|coupon-list|product-detail|\/cart|order-create|knowledge-mall/.test(url)
}

function isOrderMenuItem(item) {
  return isTradeMenuItem(item)
}

function applyProductModuleGate(tabbarItems, plugins) {
  if (isProductModuleEnabled(plugins)) return tabbarItems || []
  return (tabbarItems || []).map((item) => {
    if (!isProductTabItem(item)) return item
    return { ...item, enabled: false }
  })
}

function applyProductMineGate(mineConfig, plugins) {
  if (isProductModuleEnabled(plugins)) return mineConfig
  const menuItems = (mineConfig.menuItems || []).filter((item) => !isTradeMenuItem(item))
  const orderQuickAccess = {
    ...(mineConfig.orderQuickAccess || DEFAULT_ORDER_QUICK_ACCESS),
    showOrderTabs: false,
    showAllOrdersBtn: false,
  }
  return {
    ...mineConfig,
    orderQuickAccess,
    menuItems,
  }
}

function applyMemberModuleGate(mineConfig, plugins) {
  const enabled = isMemberModuleEnabled(plugins)
  if (enabled) return mineConfig
  const menuItems = (mineConfig.menuItems || [])
    .filter((item) => item.enabled !== false && !isMemberMenuItem(item))
  const userProfile = {
    ...(mineConfig.userProfile || DEFAULT_USER_PROFILE),
    showMemberLevel: false,
    memberLevelLabel: '',
  }
  return {
    ...mineConfig,
    showMemberCard: false,
    userProfile,
    menuItems,
  }
}

async function fetchMinePageConfig(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  const mineConfig = applyProductMineGate(
    applyMemberModuleGate(
      normalizeMinePageConfig(config.minePageConfig || DEFAULT_MINE_PAGE_CONFIG),
      config.plugins,
    ),
    config.plugins,
  )
  const menuItems = (mineConfig.menuItems || [])
    .filter((item) => item.enabled !== false)
  const rawLoginSubtitle = String(mineConfig.loginSubtitle || '')
  const loginSubtitle = rawLoginSubtitle
    .replace(/订单、订单/g, '订单')
    || DEFAULT_MINE_PAGE_CONFIG.loginSubtitle
  return {
    ...mineConfig,
    loginSubtitle,
    menuItems,
    styleKey: resolveMineStyleKey(mineConfig),
  }
}

/** 取登录页配置（已归一化 + styleKey 解析） */
async function fetchLoginPageConfig(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  const loginConfig = normalizeLoginPageConfig(
    config.loginPageConfig || DEFAULT_LOGIN_PAGE_CONFIG,
  )
  loginConfig.styleKey = resolveLoginPageStyleKey(loginConfig)
  return loginConfig
}

async function fetchBrandConfig(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  return config.miniappBrandConfig || DEFAULT_MINIAPP_BRAND_CONFIG
}

function clearSystemConfigCache() {
  try {
    StorageUtil.remove(CONFIG_CACHE_KEY)
  } catch (e) {
    try { wx.removeStorageSync(CONFIG_CACHE_KEY) } catch (e2) { /* ignore */ }
  }
}

function clearPageDslStorageCaches() {
  try {
    const info = wx.getStorageInfoSync()
    ;(info.keys || []).forEach((fullKey) => {
      const k = String(fullKey || '')
      if (k.startsWith(`${STORAGE_KEY_PREFIX}dsl_`)) {
        wx.removeStorageSync(k)
      }
    })
  } catch (e) { /* ignore */ }
}

module.exports = {
  DEFAULT_TABBAR_LIST,
  DEFAULT_MINE_PAGE_CONFIG,
  DEFAULT_LOGIN_PAGE_CONFIG,
  DEFAULT_ORDER_QUICK_ACCESS,
  DEFAULT_USER_PROFILE,
  DEFAULT_MINIAPP_BRAND_CONFIG,
  DEFAULT_CONTENT_LIST_CONFIG,
  DEFAULT_PRODUCT_LIST_CONFIG,
  getCachedConfig,
  getTabbarList,
  getTabbarListSync,
  fetchSystemConfig,
  clearSystemConfigCache,
  clearPageDslStorageCaches,
  fetchTabbarList,
  /** 解析渠道码（渠道分享归因） */
  getChannel(chKey) {
    if (!chKey) return Promise.resolve(null)
    return get('/api/v1/mp/channel', { ch: chKey }, { auth: false, showError: false })
      .then((res) => res || null)
      .catch(() => null)
  },
  fetchMinePageConfig,
  fetchLoginPageConfig,
  fetchBrandConfig,
  resolveMineStyleKey,
  normalizeMinePageConfig,
  resolveLoginPageStyleKey,
  normalizeLoginPageConfig,
  isMemberModuleEnabled,
  isProductModuleEnabled,
  isPluginEnabled,
  isQaModuleEnabled,
  isFormModuleEnabled,
  isCommentModuleEnabled,
  applyMemberModuleGate,
  applyProductModuleGate,
  applyProductMineGate,
}
