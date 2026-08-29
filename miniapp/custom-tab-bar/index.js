const SystemService = require('../services/system')
const { migrateTabBarIcon, isImageIcon } = require('../utils/tabbar-icon')
const { TAB_SLOT_ROUTES, resolveActiveTabItems } = require('../utils/tabbar-config')

const PATH_META_MAP = {
  '/pages/index/index': {
    text: '首页',
    icon: '/images/tab-v2/home.svg',
    selectedIcon: '/images/tab-v2/home-active.svg',
  },
  '/pages/content-list/content-list': {
    text: '内容',
    icon: '/images/tab-v2/content.svg',
    selectedIcon: '/images/tab-v2/content-active.svg',
  },
  '/pages/knowledge-mall/knowledge-mall': {
    text: '商城',
    icon: '/images/tab-v2/shop.svg',
    selectedIcon: '/images/tab-v2/shop-active.svg',
  },
  '/pages/mine/mine': {
    text: '我的',
    icon: '/images/tab-v2/mine.svg',
    selectedIcon: '/images/tab-v2/mine-active.svg',
  },
  '/pages/tab-hub/tab-hub': {
    text: '更多',
    icon: '/images/tab-v2/hub.svg',
    selectedIcon: '/images/tab-v2/hub-active.svg',
  },
}

const DEFAULT_LIST = buildTabList(TAB_SLOT_ROUTES)

function buildTabList(slotRoutes) {
  return slotRoutes.map((pagePath) => {
    const meta = PATH_META_MAP[pagePath] || {}
    return {
      pagePath,
      text: meta.text || '页面',
      icon: meta.icon || '/images/tab-v2/home.svg',
      selectedIcon: meta.selectedIcon || meta.icon || '/images/tab-v2/home-active.svg',
    }
  })
}

/** 仅过滤明显无效/占位入口；已注册页面可展示 */
function isBlockedShopTab(path) {
  const p = '/' + String(path || '').replace(/^\/+/, '')
  if (TAB_SLOT_ROUTES.includes(p)) return false
  return /分类|购物车|商城/.test(String(path || '')) && !p.startsWith('/pages/')
}

Component({
  data: {
    selected: 0,
    hidden: false,
    list: DEFAULT_LIST,
    activeColor: '#002FA7',
    inactiveColor: '#98a2b5',
    backgroundColor: '#ffffff',
  },

  lifetimes: {
    attached() {
      this._loadTabbarConfig()
    },
  },

  pageLifetimes: {
    show() {
      this.setData({ selected: this._getCurrentIndex() })
    },
  },

  methods: {
    _normalizePath(path) {
      return '/' + String(path || '').replace(/^\/+/, '')
    },

    _resolveTabIcon(rawIcon, fallback) {
      const migrated = migrateTabBarIcon(rawIcon)
      if (migrated && isImageIcon(migrated)) return migrated
      return fallback
    },

    async _loadTabbarConfig() {
      try {
        const config = await SystemService.fetchSystemConfig(true)
        const tabbarItems = config.tabbarItems || []
        const visibleRows = resolveActiveTabItems(config.plugins, tabbarItems)
        const theme = config.miniappThemeConfig || {}
        try {
          const { applyThemeCssVars } = require('../utils/theme')
          applyThemeCssVars(theme)
        } catch (e) {}

        const mappedList = visibleRows.map((row) => {
          const { item, slotRoute: pagePath } = row
          const pathMeta = PATH_META_MAP[pagePath] || {}
          const fallbackIcon = pathMeta.icon || '/images/tab-v2/home.svg'
          const fallbackSelected = pathMeta.selectedIcon || fallbackIcon
          const icon = this._resolveTabIcon(item.icon || item.iconPath, fallbackIcon)
          const selectedIcon = this._resolveTabIcon(
            item.selectedIconPath || item.selectedIcon || item.icon || item.iconPath,
            fallbackSelected,
          )
          return {
            pagePath,
            text: item.text || item.name || pathMeta.text || '页面',
            icon,
            selectedIcon: selectedIcon || icon,
          }
        })

        this.setData({
          list: mappedList,
          selected: this._getCurrentIndex(mappedList),
          activeColor: theme.tabBarActiveColor || '#002FA7',
          inactiveColor: theme.tabBarInactiveColor || '#98a2b5',
          backgroundColor: theme.tabBarBackgroundColor || '#ffffff',
        })
      } catch (e) {
        console.warn('[TabBar] 加载配置失败，使用默认列表:', e)
        this.setData({
          list: DEFAULT_LIST,
          selected: this._getCurrentIndex(DEFAULT_LIST),
        })
      }
    },

    _getCurrentIndex(list) {
      const tabs = list || this.data.list || []
      const pages = getCurrentPages()
      if (!pages.length) return 0
      const currentPath = '/' + pages[pages.length - 1].route
      const idx = tabs.findIndex((item) => this._normalizePath(item.pagePath) === currentPath)
      return idx >= 0 ? idx : 0
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      const url = this._normalizePath(path)
      if (isBlockedShopTab(url)) {
        wx.showToast({ title: '入口未配置', icon: 'none' })
        return
      }
      this.setData({ selected: Number(index) || 0 })
      wx.switchTab({
        url,
        fail: (err) => {
          console.warn('[TabBar] switchTab 失败，尝试 navigateTo:', url, err)
          wx.navigateTo({ url })
        },
      })
    },

    refresh() {
      this._loadTabbarConfig()
    },
  },
})
