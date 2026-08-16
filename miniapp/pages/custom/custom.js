const { PageService } = require('../../services/page')
const { parseDSL, loadAllComponentData } = require('../../utils/render')

Page({
  data: {
    loading: true,
    error: '',
    components: [],
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

  async _load(path) {
    if (!path) {
      this.setData({ loading: false, error: '缺少页面路径' })
      return
    }
    try {
      const dsl = await PageService.getPageDSL(path, true)
      const parsed = parseDSL(dsl)
      const components = await loadAllComponentData(parsed.components || [])
      const title = (parsed.page && parsed.page.name) || '页面'
      wx.setNavigationBarTitle({ title })
      this.setData({
        loading: false,
        error: '',
        components,
      })
    } catch (e) {
      this.setData({
        loading: false,
        error: '页面不存在或未发布',
        components: [],
      })
    }
  },
})
