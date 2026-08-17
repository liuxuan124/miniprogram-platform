const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')

Page({
  data: {
    loading: true,
    error: '',
    flowComponents: [],
    floatComponents: [],
  },

  onLoad(options) {
    const path = decodeURIComponent(options.path || options.p || '')
    this._load(path)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ hidden: true })
    }
  },

  onReachBottom() {
    const renderers = this.selectAllComponents('dsl-renderer') || []
    renderers.forEach((renderer) => {
      const lists = (renderer.selectAllComponents && renderer.selectAllComponents('dsl-article-list')) || []
      lists.forEach((list) => {
        if (list && typeof list.loadMore === 'function') list.loadMore()
      })
    })
  },

  async _load(path) {
    if (!path) {
      this.setData({ loading: false, error: '缺少页面路径' })
      return
    }
    try {
      const dsl = await PageService.getPageDSL(path, true)
      const parsed = parseDSL(dsl)
      const components = await loadAllComponentData(parsed.components || [])
      const flowComponents = []
      const floatComponents = []
      components.forEach((item) => {
        if (item && item.type === 'float_button') floatComponents.push(item)
        else flowComponents.push(item)
      })
      const title = (parsed.page && parsed.page.name) || '页面'
      wx.setNavigationBarTitle({ title })
      this.setData({
        loading: false,
        error: '',
        flowComponents,
        floatComponents,
      })
    } catch (e) {
      this.setData({
        loading: false,
        error: '页面不存在或未发布',
        flowComponents: [],
        floatComponents: [],
      })
    }
  },
})
