const SystemService = require('../services/system')

// 默认 TabBar：与后台「搭建小程序」standard 模板一致
const DEFAULT_LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/content-list/content-list', text: '内容', icon: '📚' },
  { pagePath: '/pages/product-list/product-list', text: '商城', icon: '🛍️' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '👤' }
]

const PATH_META_MAP = {
  '/pages/index/index': { text: '首页', icon: '🏠' },
  '/pages/content-list/content-list': { text: '内容', icon: '📚' },
  '/pages/product-list/product-list': { text: '商城', icon: '🛍️' },
  '/pages/member-center/member-center': { text: '会员', icon: '👑' },
  '/pages/category/category': { text: '分类', icon: '📋' },
  '/pages/cart/cart': { text: '购物车', icon: '🛒' },
  '/pages/ai-chat/ai-chat': { text: 'AI', icon: '✦' },
  '/pages/mine/mine': { text: '我的', icon: '👤' }
}

Component({
  data: {
    selected: 0,
    list: DEFAULT_LIST,
    activeColor: '#2f5bff',
    inactiveColor: '#a5abb9',
    backgroundColor: '#ffffff'
  },

  lifetimes: {
    attached() {
      this._loadTabbarConfig()
    }
  },

  pageLifetimes: {
    show() {
      // 每次宿主页面显示时同步选中态
      this.setData({ selected: this._getCurrentIndex() })
    }
  },

  methods: {
    _normalizePath(path) {
      return '/' + String(path || '').replace(/^\/+/, '')
    },

    async _loadTabbarConfig() {
      try {
        const config = await SystemService.fetchSystemConfig(true)
        const list = (config.tabbarItems || DEFAULT_LIST).filter(item => item.enabled !== false)
        const theme = config.miniappThemeConfig || {}
        const mappedList = list.map(item => {
          const pagePath = this._normalizePath(item.path || item.pagePath)
          const pathMeta = PATH_META_MAP[pagePath] || {}
          return {
            pagePath,
            text: item.text || item.name || pathMeta.text || '页面',
            icon: item.icon || pathMeta.icon || '•'
          }
        })
        this.setData({
          list: mappedList.length > 0 ? mappedList : DEFAULT_LIST,
          selected: this._getCurrentIndex(mappedList.length > 0 ? mappedList : DEFAULT_LIST),
          activeColor: theme.tabBarActiveColor || theme.primaryColor || '#2f5bff',
          inactiveColor: theme.tabBarInactiveColor || '#a5abb9',
          backgroundColor: theme.tabBarBackgroundColor || '#ffffff'
        })
      } catch (e) {
        console.warn('[TabBar] 加载配置失败，使用默认列表:', e)
        this.setData({
          list: DEFAULT_LIST,
          selected: this._getCurrentIndex(DEFAULT_LIST)
        })
      }
    },

    _getCurrentIndex(list) {
      const tabs = list || this.data.list || []
      const pages = getCurrentPages()
      if (!pages.length) return 0
      const currentPath = '/' + pages[pages.length - 1].route
      const idx = tabs.findIndex(item => this._normalizePath(item.pagePath) === currentPath)
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
        }
      })
    },

    refresh() {
      this._loadTabbarConfig()
    }
  }
})
