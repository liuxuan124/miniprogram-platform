const SystemService = require('../services/system')

const TAB_WHITELIST = {
  '/pages/index/index': true,
  '/pages/content-list/content-list': true,
  '/pages/knowledge-mall/knowledge-mall': true,
  '/pages/mine/mine': true,
  '/pages/product-list/product-list': true,
  '/pages/cart/cart': true,
  '/pages/category/category': true,
}

const REGISTERED_TAB_PATHS = [
  '/pages/index/index',
  '/pages/content-list/content-list',
  '/pages/knowledge-mall/knowledge-mall',
  '/pages/mine/mine',
]

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
  '/pages/product-list/product-list': {
    text: '商城',
    icon: '/images/tab-v2/shop.svg',
    selectedIcon: '/images/tab-v2/shop-active.svg',
  },
}

const DEFAULT_LIST = REGISTERED_TAB_PATHS.map((pagePath) => ({
  pagePath,
  text: (PATH_META_MAP[pagePath] || {}).text || '页面',
  icon: (PATH_META_MAP[pagePath] || {}).icon || '/images/tab-v2/home.svg',
  selectedIcon: (PATH_META_MAP[pagePath] || {}).selectedIcon || '/images/tab-v2/home-active.svg',
}))

/** 仅过滤明显无效/占位入口；已注册页面可展示 */
function isBlockedShopTab(path) {
  const p = '/' + String(path || '').replace(/^\/+/, '')
  if (TAB_WHITELIST[p]) return false
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

    async _loadTabbarConfig() {
      try {
        const config = await SystemService.fetchSystemConfig(true)
        const rawItems = (config.tabbarItems || [])
          .filter((item) => item.enabled !== false)
        const configByPath = new Map()
        for (const item of rawItems) {
          const pagePath = this._normalizePath(item.path || item.pagePath)
          // 旧配置「商城」指向 product-list 时，映射到新页
          const normalized = pagePath === '/pages/product-list/product-list'
            ? '/pages/knowledge-mall/knowledge-mall'
            : pagePath
          if (REGISTERED_TAB_PATHS.includes(normalized)) {
            configByPath.set(normalized, item)
          }
        }
        const theme = config.miniappThemeConfig || {}
        const mappedList = REGISTERED_TAB_PATHS.map((pagePath) => {
          const item = configByPath.get(pagePath) || {}
          const pathMeta = PATH_META_MAP[pagePath] || {}
          const icon = pathMeta.icon || item.iconPath || item.icon || '/images/tab-v2/home.svg'
          const selectedIcon = pathMeta.selectedIcon || item.selectedIconPath || item.selectedIcon || icon
          const useEmoji = typeof icon === 'string' && !icon.includes('/') && !icon.startsWith('http')
          return {
            pagePath,
            text: item.text || item.name || pathMeta.text || '页面',
            icon: useEmoji ? (pathMeta.icon || '/images/tab-v2/home.svg') : icon,
            selectedIcon: useEmoji ? (pathMeta.selectedIcon || pathMeta.icon || '/images/tab-v2/home-active.svg') : selectedIcon,
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
