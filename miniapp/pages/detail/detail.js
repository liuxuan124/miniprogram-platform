// pages/detail/detail.js — 通用详情页
// 根据传入的 id 和 type 加载不同类型的详情内容
const { get } = require('../../utils/request')

Page({
  data: {
    id: '',
    type: '',
    detail: null,
    loading: true,
    error: null,
  },

  onLoad(options) {
    const { id, type } = options
    this.setData({ id, type: type || 'product' })
    this._loadDetail(id, type)
  },

  /** 分享 */
  onShareAppMessage() {
    const detail = this.data.detail
    return {
      title: detail ? (detail.name || detail.title || '详情') : '详情',
      path: '/pages/detail/detail?id=' + this.data.id + '&type=' + this.data.type,
    }
  },

  /** 加载详情 */
  async _loadDetail(id, type) {
    if (!id) {
      this.setData({ error: '参数错误', loading: false })
      return
    }

    const apiMap = {
      product: '/api/v1/mp/products/' + id,
      article: '/api/v1/mp/contents/' + id,
      activity: '/api/v1/mp/activities/' + id,
    }

    const apiPath = apiMap[type] || apiMap.product

    try {
      const data = await get(apiPath, {}, { auth: false })
      this.setData({
        detail: data,
        loading: false,
      })

      // 设置页面标题
      if (data && (data.name || data.title)) {
        wx.setNavigationBarTitle({ title: data.name || data.title })
      }
    } catch (err) {
      console.error('[DetailPage] 加载详情失败:', err)
      this.setData({
        error: '加载失败',
        loading: false,
      })
    }
  },

  /** 重试 */
  onRetry() {
    this.setData({ loading: true, error: null })
    this._loadDetail(this.data.id, this.data.type)
  },
})
