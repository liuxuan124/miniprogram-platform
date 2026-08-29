// services/system.js — 系统配置服务
// 获取后端系统配置（tabbar、插件开关等）

const { get } = require('../utils/request')
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
const CONFIG_CACHE_EXPIRE = 10 * 60 * 1000

const DEFAULT_TABBAR_LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/content-list/content-list', text: '内容', icon: '📚' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
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
  loginTitle: '点击登录，解锁会员权益',
  loginSubtitle: '查看订单、已购资料、预约与会员权益',
  loginButtonText: '登录',
  memberCardTitle: '会员中心',
  showMenuIcons: true,
  showDecorBackground: true,
  showMemberCard: false,
  templateStyle: 'basic',
  style: 'gradient',
  themeColor: '#5B7FEA',
  themeColorSecondary: '#7BA3F7',
  servicePhone: '',
  loginRules: LOGIN_RULES.mineMenuRequireLogin,
  menuItems: [
    { id: 'orders', icon: 'line:document', title: '全部订单', url: '/pkg-trade/order-list/order-list', enabled: true },
    { id: 'library', icon: 'line:books', title: '已购资料', url: '/pkg-trade/order-list/order-list', enabled: true },
    { id: 'reservation', icon: 'line:calendar', title: '我的预约', url: '/pkg-user/my-appointments/my-appointments', enabled: true },
    { id: 'member-center', icon: 'line:crown', title: '会员中心', url: '/pkg-user/member-center/member-center', enabled: false },
    { id: 'coupons', icon: 'line:coupon', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', enabled: true },
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

function resolveMineStyleKey(mine) {
  if (!mine) return 'basic'
  const raw = String(mine.templateStyle || '')
  if (raw === 'member' || raw === 'premium') return 'member'
  if (raw === 'minimal' || raw === 'dark' || raw === 'simple') return 'basic'
  if (raw === 'basic' || raw === 'standard') return 'basic'
  const tc = String(mine.themeColor || '').toLowerCase()
  if (
    tc === '#b8860b' || tc === '#9a7b1c' || tc === '#d4af37' || tc === '#f0d060'
    || tc === '#6b9fd9' || tc === '#9bbfe8' || tc === '#e8eef8'
  ) return 'member'
  return 'basic'
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
        if (cached.tabbarItems) {
          cached.tabbarItems = applyProductModuleGate(
            normalizeTabbarItems(parseConfigField(cached.tabbarItems, null)),
            cached.plugins,
          )
        }
        return cached
      }
    }
  }

  try {
    const res = await get('/api/v1/mp/system/config', {}, { auth: false })
    const config = res && res.data ? res.data : res
    if (config && typeof config === 'object') {
      config.tabbarItems = parseConfigField(config.tabbarItems, null)
      config.minePageConfig = normalizeMinePageConfig(
        parseConfigField(config.minePageConfig, DEFAULT_MINE_PAGE_CONFIG),
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
      StorageUtil.set(CONFIG_CACHE_KEY, config, CONFIG_CACHE_EXPIRE)
      return config
    }
  } catch (e) {
    console.warn('[SystemService] 获取系统配置失败，使用默认配置:', e)
  }

  return {
    tabbarItems: DEFAULT_TABBAR_LIST,
    minePageConfig: DEFAULT_MINE_PAGE_CONFIG,
    miniappThemeConfig: null,
    miniappBrandConfig: DEFAULT_MINIAPP_BRAND_CONFIG,
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
  const list = Array.isArray(plugins) ? plugins : parseConfigField(plugins, [])
  if (!Array.isArray(list) || !list.length) return true
  const hit = list.find((p) => p && p.key === 'member')
  if (!hit) return true
  return hit.enabled !== false
}

const PRODUCT_TAB_SLOT_INDEX = 2

function isProductModuleEnabled(plugins) {
  const list = Array.isArray(plugins) ? plugins : parseConfigField(plugins, [])
  if (!Array.isArray(list) || !list.length) return true
  const hit = list.find((p) => p && p.key === 'product')
  if (!hit) return true
  return hit.enabled !== false
}

function isProductTabItem(item, index) {
  const shell = String((item && (item.tabRoute || item.slotRoute)) || '')
  if (shell.includes('knowledge-mall')) return true
  if (!shell && index === 2) return true
  const path = String((item && (item.pagePath || item.path)) || '')
  const text = String((item && (item.text || item.name)) || '')
  const pageName = String((item && item.pageName) || '')
  if (/knowledge-mall|product-list|product-detail|\/cart/.test(path)) return true
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
  return (tabbarItems || []).map((item, index) => {
    if (!isProductTabItem(item, index)) return item
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
  return {
    ...mineConfig,
    showMemberCard: false,
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

async function fetchBrandConfig(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  return config.miniappBrandConfig || DEFAULT_MINIAPP_BRAND_CONFIG
}

module.exports = {
  DEFAULT_TABBAR_LIST,
  DEFAULT_MINE_PAGE_CONFIG,
  DEFAULT_ORDER_QUICK_ACCESS,
  DEFAULT_USER_PROFILE,
  DEFAULT_MINIAPP_BRAND_CONFIG,
  getCachedConfig,
  getTabbarList,
  getTabbarListSync,
  fetchSystemConfig,
  fetchTabbarList,
  fetchMinePageConfig,
  fetchBrandConfig,
  resolveMineStyleKey,
  normalizeMinePageConfig,
  isMemberModuleEnabled,
  isProductModuleEnabled,
  applyMemberModuleGate,
  applyProductModuleGate,
  applyProductMineGate,
}
