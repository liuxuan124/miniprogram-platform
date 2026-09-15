Page({
  data: {
    url: '',
    name: '',
    ready: false,
  },
  onLoad(q) {
    let url = ''
    try {
      url = decodeURIComponent(q.url || '')
    } catch (e) {
      url = q.url || ''
    }
    this.setData({
      url,
      name: q.name ? decodeURIComponent(q.name) : '企业微信群',
      ready: !!url,
    })
  },
  onCopy() {
    if (!this.data.url) return
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    })
  },
})
