// services/system.js — 系统配置服务
// 获取后端系统配置（tabbar、插件开关等）

const { get } = require('../utils/request')
const { StorageUtil } = require('../utils/storage')
const { LOGIN_RULES } = require('../config/login-rules')

const CONFIG_CACHE_KEY = 'system_config'
const CONFIG_CACHE_EXPIRE = 10 * 60 * 1000

const DEFAULT_TABBAR_LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/content-list/content-list', text: '内容', icon: '📚' },
  { pagePath: '/pages/product-list/product-list', text: '商城', icon: '🛍️' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
]

const DEFAULT_MINE_PAGE_CONFIG = {
  loginTitle: '登录出海笔记',
  loginSubtitle: '查看订单、已购资料、预约与会员权益',
  loginButtonText: '微信一键登录',
  memberCardTitle: '出海会员中心',
  servicePhone: '',
  loginRules: LOGIN_RULES.mineMenuRequireLogin,
  menuItems: [
    { id: 'orders', icon: '🧾', title: '全部订单', url: '/pages/order-list/order-list', enabled: true },
    { id: 'library', icon: '📚', title: '我的已购资料', url: '/pages/library/library', enabled: true },
    { id: 'reservation', icon: '🗓️', title: '我的预约', url: '/pages/my-appointments/my-appointments', enabled: true },
    { id: 'member-center', icon: '👑', title: '会员中心 · 权益', url: '/pages/member-center/member-center', enabled: true },
    { id: 'coupons', icon: '🎫', title: '优惠券', url: '/pages/coupon-list/coupon-list', enabled: true },
    { id: 'ai', icon: '🤖', title: 'AI 出海助手', url: '/pages/ai-chat/ai-chat', enabled: true },
    { id: 'favorites', icon: '🔖', title: '我的收藏', url: '/pages/favorites/favorites', enabled: true },
    { id: 'address', icon: '📍', title: '收货地址', url: '/pages/address-list/address-list', enabled: true },
    { id: 'contact', icon: '💬', title: '客服 · 售后', url: '/pages/service-chat/service-chat', enabled: true },
    { id: 'settings', icon: '⚙️', title: '设置', url: '/pages/settings/settings', enabled: true },
    { id: 'feedback', icon: '✉️', title: '意见反馈', url: '/pages/feedback/feedback', enabled: true },
  ],
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
      return {
        tabbarItems: cached,
        minePageConfig: DEFAULT_MINE_PAGE_CONFIG,
      }
    }
    if (cached) return cached
  }

  try {
    const res = await get('/api/v1/mp/system/config', {}, { auth: false })
    const config = res && res.data ? res.data : res
    if (config && typeof config === 'object') {
      config.tabbarItems = parseConfigField(config.tabbarItems, null)
      config.minePageConfig = parseConfigField(config.minePageConfig, DEFAULT_MINE_PAGE_CONFIG)
      config.miniappThemeConfig = parseConfigField(config.miniappThemeConfig, null)
      config.tabbarItems = normalizeTabbarItems(config.tabbarItems)
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
  }
}

async function fetchTabbarList(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  const list = config.tabbarItems || DEFAULT_TABBAR_LIST
  return list.filter(item => item.enabled !== false)
}

async function fetchMinePageConfig(forceRefresh) {
  const config = await fetchSystemConfig(forceRefresh)
  return config.minePageConfig || DEFAULT_MINE_PAGE_CONFIG
}

module.exports = {
  DEFAULT_TABBAR_LIST,
  DEFAULT_MINE_PAGE_CONFIG,
  getCachedConfig,
  getTabbarList,
  getTabbarListSync,
  fetchSystemConfig,
  fetchTabbarList,
  fetchMinePageConfig
}
