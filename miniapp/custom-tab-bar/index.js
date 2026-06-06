const SystemService = require('../services/system')

// 默认 TabBar 列表：与管理后台"系统设置→底部导航配置"默认值完全一致
const DEFAULT_LIST = [
  { pagePath: '/pages/index/index', text: '首页', icon: '🏠' },
  { pagePath: '/pages/content-list/content-list', text: '内容', icon: '📝' },
  { pagePath: '/pages/member-center/member-center', text: '会员', icon: '♡' },
  { pagePath: '/pages/mine/mine', text: '我的', icon: '☻' }
]

const ICON_MAP = {
  '首页': '⌂',
  '内容': '✎',
  '会员': '♡',
  '商城': '□',
  '我的': '☻',
  'AI助手': '✦',
  'AI': '✦'
}

const PATH_META_MAP = {
  '/pages/index/index': { text: '首页', icon: '⌂' },
  '/pages/content-list/content-list': { text: '内容', icon: '✎' },
  '/pages/member-center/member-center': { text: '会员', icon: '♡' },
  '/pages/product-list/product-list': { text: '商城', icon: '□' },
  '/pages/category/category': { text: '分类', icon: '≡' },
  '/pages/cart/cart': { text: '购物车', icon: '◈' },
  '/pages/ai-chat/ai-chat': { text: 'AI', icon: '✦' },
  '/pages/mine/mine': { text: '我的', icon: '☻' }
}

Component({
  data: {
    selected: 0,
    list: DEFAULT_LIST
  },

  lifetimes: {
    attached() {
      this._loadTabbarConfig()
    }
  },

  pageLifetimes: {
    show() {
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        this.getTabBar().setData({
          selected: this._getCurrentIndex()
        })
      }
    }
  },

  methods: {
    _normalizePath(path) {
      return '/' + String(path || '').replace(/^\/+/, '')
    },

    async _loadTabbarConfig() {
      try {
        const list = await SystemService.fetchTabbarList(true)
        const mappedList = list.map(item => {
          const pagePath = this._normalizePath(item.path || item.pagePath)
          const pathMeta = PATH_META_MAP[pagePath] || {}
          const text = pathMeta.text || item.name || item.text || '页面'
          return {
            pagePath,
            text,
            icon: pathMeta.icon || ICON_MAP[text] || item.icon || '•'
          }
        })
        this.setData({ list: mappedList.length > 0 ? mappedList : DEFAULT_LIST })
      } catch (e) {
        console.warn('[TabBar] 加载配置失败，使用默认列表:', e)
        this.setData({ list: DEFAULT_LIST })
      }
    },

    _getCurrentIndex() {
      const pages = getCurrentPages()
      if (!pages.length) return 0
      const currentPath = '/' + pages[pages.length - 1].route
      const idx = this.data.list.findIndex(item => item.pagePath === currentPath)
      return idx >= 0 ? idx : 0
    },

    switchTab(e) {
      const { index, path } = e.currentTarget.dataset
      this.setData({ selected: index })
      wx.switchTab({ url: this._normalizePath(path) })
    },

    refresh() {
      this._loadTabbarConfig()
    }
  }
})
