const SystemService = require('../services/system')

const DEFAULT_LIST = [
  {
    pagePath: '/pages/index/index',
    text: '首页',
    icon: '/images/tab/home.png',
    selectedIcon: '/images/tab/home-active.png',
  },
  {
    pagePath: '/pages/content-list/content-list',
    text: '内容',
    icon: '/images/tab/content.png',
    selectedIcon: '/images/tab/content-active.png',
  },
  {
    pagePath: '/pages/product-list/product-list',
    text: '商城',
    icon: '/images/tab/category.png',
    selectedIcon: '/images/tab/category-active.png',
  },
  {
    pagePath: '/pages/mine/mine',
    text: '我的',
    icon: '/images/tab/mine.png',
    selectedIcon: '/images/tab/mine-active.png',
  },
]

const PATH_META_MAP = {
  '/pages/index/index': {
    text: '首页',
    icon: '/images/tab/home.png',
    selectedIcon: '/images/tab/home-active.png',
  },
  '/pages/content-list/content-list': {
    text: '内容',
    icon: '/images/tab/content.png',
    selectedIcon: '/images/tab/content-active.png',
  },
  '/pages/product-list/product-list': {
    text: '商城',
    icon: '/images/tab/category.png',
    selectedIcon: '/images/tab/category-active.png',
  },
  '/pages/mine/mine': {
    text: '我的',
    icon: '/images/tab/mine.png',
    selectedIcon: '/images/tab/mine-active.png',
  },
}

Component({
  data: {
    selected: 0,
    list: DEFAULT_LIST,
    activeColor: '#111111',
    inactiveColor: '#999999',
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
          const icon = item.iconPath || item.icon || pathMeta.icon || '/images/tab/home.png'
          const selectedIcon = item.selectedIconPath || item.selectedIcon || pathMeta.selectedIcon || icon
          // 后台若仍下发 emoji，回退到本地 PNG
          const useEmoji = typeof icon === 'string' && !icon.includes('/') && !icon.startsWith('http')
          return {
            pagePath,
            text: item.text || item.name || pathMeta.text || '页面',
            icon: useEmoji ? (pathMeta.icon || '/images/tab/home.png') : icon,
            selectedIcon: useEmoji ? (pathMeta.selectedIcon || pathMeta.icon || '/images/tab/home.png') : selectedIcon,
          }
        })
        this.setData({
          list: mappedList.length > 0 ? mappedList : DEFAULT_LIST,
          selected: this._getCurrentIndex(mappedList.length > 0 ? mappedList : DEFAULT_LIST),
          activeColor: theme.tabBarActiveColor || '#111111',
          inactiveColor: theme.tabBarInactiveColor || '#999999',
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
