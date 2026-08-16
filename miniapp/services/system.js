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
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
]

const DEFAULT_MINE_PAGE_CONFIG = {
  loginTitle: '登录出海笔记',
  loginSubtitle: '查看订单、预约与会员权益',
  loginButtonText: '微信一键登录',
  memberCardTitle: '出海会员中心',
  servicePhone: '',
  loginRules: LOGIN_RULES.mineMenuRequireLogin,
  menuItems: [
    { id: 'orders', icon: '🧾', title: '全部订单', url: '/pkg-trade/order-list/order-list', enabled: true },
    { id: 'reservation', icon: '🗓️', title: '我的预约', url: '/pkg-user/my-appointments/my-appointments', enabled: true },
    { id: 'member-center', icon: '👑', title: '会员中心 · 权益', url: '/pkg-user/member-center/member-center', enabled: true },
    { id: 'coupons', icon: '🎫', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', enabled: true },
    { id: 'favorites', icon: '🔖', title: '我的收藏', url: '/pkg-user/favorites/favorites', enabled: true },
    { id: 'address', icon: '📍', title: '收货地址', url: '/pkg-user/address-list/address-list', enabled: true },
    { id: 'contact', icon: '💬', title: '客服 · 售后', url: '/pkg-user/service-chat/service-chat', enabled: true },
    { id: 'settings', icon: '⚙️', title: '设置', url: '/pkg-user/settings/settings', enabled: true },
    { id: 'feedback', icon: '✉️', title: '意见反馈', url: '/pkg-user/feedback/feedback', enabled: true },
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
  const mineConfig = config.minePageConfig || DEFAULT_MINE_PAGE_CONFIG
  // 兼容后台历史配置：独立“已购资料/数字领取”入口已取消，统一从订单查看发货通知。
  const menuItems = (mineConfig.menuItems || DEFAULT_MINE_PAGE_CONFIG.menuItems)
    .filter((item) => item.id !== 'library' && item.id !== 'ai' && item.url !== '/pages/ai-chat/ai-chat')
  const rawLoginSubtitle = String(mineConfig.loginSubtitle || '')
  const loginSubtitle = rawLoginSubtitle
    .replace(/、?(已购资料|领取通知)/g, '')
    .replace(/订单、订单/g, '订单')
    || DEFAULT_MINE_PAGE_CONFIG.loginSubtitle
  return {
    ...mineConfig,
    loginSubtitle,
    menuItems,
  }
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
