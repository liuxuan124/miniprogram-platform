const SystemService = require('../services/system')

const DEFAULT_LIST = [
  {
    pagePath: '/pages/index/index',
    text: '首页',
    icon: '/images/tab-v2/home.svg',
    selectedIcon: '/images/tab-v2/home-active.svg',
  },
  {
    pagePath: '/pages/content-list/content-list',
    text: '内容',
    icon: '/images/tab-v2/content.svg',
    selectedIcon: '/images/tab-v2/content-active.svg',
  },
  {
    pagePath: '/pages/product-list/product-list',
    text: '商城',
    icon: '/images/tab-v2/shop.svg',
    selectedIcon: '/images/tab-v2/shop-active.svg',
  },
  {
    pagePath: '/pages/mine/mine',
    text: '我的',
    icon: '/images/tab-v2/mine.svg',
    selectedIcon: '/images/tab-v2/mine-active.svg',
  },
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
  '/pages/product-list/product-list': {
    text: '商城',
    icon: '/images/tab-v2/shop.svg',
    selectedIcon: '/images/tab-v2/shop-active.svg',
  },
  '/pages/mine/mine': {
    text: '我的',
    icon: '/images/tab-v2/mine.svg',
    selectedIcon: '/images/tab-v2/mine-active.svg',
  },
}

Component({
  data: {
    selected: 0,
    hidden: false,
    list: DEFAULT_LIST,
    activeColor: '#315efb',
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
        const list = (config.tabbarItems || DEFAULT_LIST).filter((item) => item.enabled !== false)
        const theme = config.miniappThemeConfig || {}
        const mappedList = list.map((item) => {
          const pagePath = this._normalizePath(item.path || item.pagePath)
          const pathMeta = PATH_META_MAP[pagePath] || {}
          const icon = pathMeta.icon || item.iconPath || item.icon || '/images/tab-v2/home.svg'
          const selectedIcon = pathMeta.selectedIcon || item.selectedIconPath || item.selectedIcon || icon
          // 后台若仍下发 emoji，回退到本地 PNG
          const useEmoji = typeof icon === 'string' && !icon.includes('/') && !icon.startsWith('http')
          return {
            pagePath,
            text: item.text || item.name || pathMeta.text || '页面',
            icon: useEmoji ? (pathMeta.icon || '/images/tab-v2/home.svg') : icon,
            selectedIcon: useEmoji ? (pathMeta.selectedIcon || pathMeta.icon || '/images/tab-v2/home-active.svg') : selectedIcon,
          }
        })
        this.setData({
          list: mappedList.length > 0 ? mappedList : DEFAULT_LIST,
          selected: this._getCurrentIndex(mappedList.length > 0 ? mappedList : DEFAULT_LIST),
          activeColor: theme.tabBarActiveColor || '#315efb',
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
