const SystemService = require('../services/system')
const { TAB_SLOT_ROUTES, resolveActiveTabItems } = require('../utils/tabbar-config')
const { USE_LOCAL_SOURCE, WARM_THEME_CONFIG } = require('../data/warm-source')

/**
 * Tab 壳默认图标/文案；联调时文案与主题以后台为准，图标仍用壳映射兜底
 */
const PATH_META_MAP = {
  '/pages/index/index': {
    text: '首页',
    icon: '/images/tab/home.png',
    selectedIcon: '/images/tab/home-active.png',
  },
  '/pages/discover/discover': {
    text: '发现',
    icon: '/images/tab/content.png',
    selectedIcon: '/images/tab/content-active.png',
  },
  '/pages/planet/planet': {
    text: '星球',
    icon: '/images/tab/member.png',
    selectedIcon: '/images/tab/member-active.png',
  },
  '/pages/shop/shop': {
    text: '商城',
    icon: '/images/tab/shop.png',
    selectedIcon: '/images/tab/shop-active.png',
  },
  '/pages/mine/mine': {
    text: '我的',
    icon: '/images/tab/mine.png',
    selectedIcon: '/images/tab/mine-active.png',
  },
}

const WARM_THEME = {
  activeColor: '#C2410C',
  inactiveColor: '#B3A091',
  backgroundColor: 'rgba(255,250,243,0.96)',
}

function buildDefaultList() {
  return TAB_SLOT_ROUTES.map((pagePath) => {
    const meta = PATH_META_MAP[pagePath] || {}
    return {
      pagePath,
      text: meta.text || '页面',
      icon: meta.icon || '/images/tab/home.png',
      selectedIcon: meta.selectedIcon || meta.icon || '/images/tab/home-active.png',
    }
  })
}

const DEFAULT_LIST = buildDefaultList()

function buildListFromConfig(config) {
  if (USE_LOCAL_SOURCE) return DEFAULT_LIST
  const plugins = config && config.plugins
  const tabbarItems = (config && config.tabbarItems) || []
  const rows = resolveActiveTabItems(plugins, tabbarItems)
  if (!rows.length) return DEFAULT_LIST

  return rows.map((row, index) => {
    const pagePath = row.slotRoute || TAB_SLOT_ROUTES[index] || TAB_SLOT_ROUTES[0]
    const meta = PATH_META_MAP[pagePath] || {}
    const item = row.item || {}
    // 配置了图标则用配置；否则回落暖阁默认套件
    const icon = item.iconPath || item.icon || meta.icon || '/images/tab/home.png'
    const selectedIcon = item.selectedIconPath || item.selectedIcon || item.selectedIconPath
      || meta.selectedIcon || meta.icon || '/images/tab/home-active.png'
    return {
      pagePath,
      text: (item.text || item.name) || meta.text || '页面',
      icon: usableIconUrl(icon) || meta.icon || '/images/tab/home.png',
      selectedIcon: usableIconUrl(selectedIcon) || meta.selectedIcon || meta.icon || '/images/tab/home-active.png',
    }
  })
}

/**
 * 图标地址是否可用。
 * 旧判断只看 `indexOf('/') === 0`，后台「本地上传」返回的是 https://… 完整地址，
 * 会被判为不可用并静默回落到默认图标——用户传了图却看不到，且没有任何提示。
 * 这里放行两种形态：小程序包内绝对路径、以及 http(s) 远程地址。
 */
function usableIconUrl(value) {
  if (typeof value !== 'string') return ''
  const s = value.trim()
  if (!s) return ''
  if (s.indexOf('/') === 0) return s
  if (/^https?:\/\//i.test(s)) return s
  return ''
}

function resolveThemeColors(config) {
  if (USE_LOCAL_SOURCE) return WARM_THEME
  const theme = (config && config.miniappThemeConfig) || WARM_THEME_CONFIG || {}
  return {
    activeColor: theme.tabBarActiveColor || theme.primaryColor || WARM_THEME.activeColor,
    inactiveColor: theme.tabBarColor || WARM_THEME.inactiveColor,
    backgroundColor: theme.tabBarBgColor || WARM_THEME.backgroundColor,
  }
}

Component({
  data: {
    selected: 0,
    hidden: false,
    list: DEFAULT_LIST,
    activeColor: WARM_THEME.activeColor,
    inactiveColor: WARM_THEME.inactiveColor,
    backgroundColor: WARM_THEME.backgroundColor,
    noticeUnread: 0,
  },

  lifetimes: {
    attached() {
      this._loadTabBar()
    },
  },

  pageLifetimes: {
    show() {
      const list = this.data.list && this.data.list.length ? this.data.list : DEFAULT_LIST
      this.setData({
        selected: this._getCurrentIndex(list),
      })
      this._loadNoticeUnread()
    },
  },

  methods: {
    _normalizePath(path) {
      return '/' + String(path || '').replace(/^\/+/, '')
    },

    async _loadTabBar() {
      try {
        const config = await SystemService.fetchSystemConfig(true)
        try {
          const { applyThemeCssVars } = require('../utils/theme')
          applyThemeCssVars(
            USE_LOCAL_SOURCE
              ? WARM_THEME_CONFIG
              : ((config && config.miniappThemeConfig) || WARM_THEME_CONFIG),
          )
        } catch (e) { /* ignore */ }

        const list = buildListFromConfig(config)
        const colors = resolveThemeColors(config)
        this.setData({
          list,
          selected: this._getCurrentIndex(list),
          ...colors,
        })
        this._ensureCurrentRouteVisible(list)
      } catch (e) {
        console.warn('[TabBar] 配置加载失败，使用默认五 Tab:', e)
        this.setData({
          list: DEFAULT_LIST,
          selected: this._getCurrentIndex(DEFAULT_LIST),
          ...WARM_THEME,
        })
      }
    },

    _getCurrentIndex(list) {
      const tabs = list || this.data.list || DEFAULT_LIST
      const pages = getCurrentPages()
      if (!pages.length) return 0
      const currentPath = '/' + pages[pages.length - 1].route
      const idx = tabs.findIndex((item) => this._normalizePath(item.pagePath) === currentPath)
      return idx >= 0 ? idx : 0
    },

    /** 导航项被删后，当前页不在列表里则回到第一个 Tab */
    _ensureCurrentRouteVisible(list) {
      const tabs = list || this.data.list || DEFAULT_LIST
      if (!tabs.length) return
      const pages = getCurrentPages()
      if (!pages.length) return
      const currentPath = this._normalizePath('/' + pages[pages.length - 1].route)
      // 只在「当前就在 Tab 容器壳」上做兜底。
      // 若用户已经 navigateTo 进二级页（商品详情/内容详情/下单等），此处 switchTab
      // 会把用户强行弹回首页（体验版实测：商城点开商品 → 自动回首页）。
      // 本方法是异步配置回调触发的，栈顶可能已不是 Tab 壳，必须按栈顶路由判定。
      const tabShells = TAB_SLOT_ROUTES.map((p) => this._normalizePath(p))
      if (tabShells.indexOf(currentPath) < 0) return
      const visible = tabs.some((item) => this._normalizePath(item.pagePath) === currentPath)
      if (visible) return
      const first = this._normalizePath(tabs[0].pagePath)
      if (first && first !== currentPath) {
        wx.switchTab({ url: first, fail() {} })
      }
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      let url = this._normalizePath(path)
      // 旧壳一次性落到现行 Tab，避免 knowledge-mall「正在前往商城」再二次跳
      if (url === '/pkg-content/knowledge-mall/knowledge-mall' || url === '/pkg-content/product-list/product-list') {
        url = '/pages/shop/shop'
      } else if (url === '/pkg-content/content-list/content-list') {
        url = '/pages/discover/discover'
      } else if (url === '/pkg-content/tab-hub/tab-hub') {
        url = '/pages/mine/mine'
      }
      this.setData({ selected: Number(index) || 0 })
      wx.switchTab({
        url,
        fail: (err) => {
          console.warn('[TabBar] switchTab 失败:', url, err)
        },
      })
    },

    refresh() {
      this._loadTabBar()
      this._loadNoticeUnread()
    },

    setNoticeUnread(count) {
      this.setData({ noticeUnread: Number(count) || 0 })
    },

    _loadNoticeUnread() {
      try {
        const { AuthUtil } = require('../utils/auth')
        if (!AuthUtil.isLoggedIn()) {
          this.setData({ noticeUnread: 0 })
          return
        }
        const noticeService = require('../services/notice')
        noticeService.unreadCount()
          .then((data) => {
            const count = Number((data && (data.count || data.unread)) || 0)
            this.setData({ noticeUnread: Number.isFinite(count) ? count : 0 })
          })
          .catch(() => this.setData({ noticeUnread: 0 }))
      } catch (_) {
        this.setData({ noticeUnread: 0 })
      }
    },
  },
})
