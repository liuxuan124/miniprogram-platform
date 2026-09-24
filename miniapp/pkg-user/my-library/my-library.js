const { request } = require('../../utils/request')

Page({
  data: {
    loading: true,
    items: [],
  },

  onShow() {
    this.load()
  },

  load() {
    this.setData({ loading: true })
    request({ url: '/api/v1/mp/my/library', method: 'GET' })
      .then((res) => {
        const items = (res && res.data) || []
        this.setData({ items, loading: false })
      })
      .catch(() => {
        this.setData({ items: [], loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  openProduct(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
  },
})
