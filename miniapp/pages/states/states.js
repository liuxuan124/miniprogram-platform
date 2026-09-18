const { picsum } = require('../../data/warm-demo')

const TABS = [
  { key: 'login', label: '① 未登录', cap: '① 未登录 · 合规登录弹层' },
  { key: 'skeleton', label: '② 骨架屏', cap: '② 加载中 · 骨架屏（长文）' },
  { key: 'offline', label: '③ 无网络', cap: '③ 无网络 / 加载失败' },
  { key: 'empty', label: '④ 空列表', cap: '④ 空列表 · 我的收藏' },
  { key: 'payfail', label: '⑤ 支付失败', cap: '⑤ 支付失败 / 未完成' },
  { key: 'offline_content', label: '⑥ 已下架', cap: '⑥ 内容已下架 / 无权限' },
]

function isDevPreviewAllowed() {
  try {
    const info = (wx.getAccountInfoSync && wx.getAccountInfoSync()) || {}
    const env = (info.miniProgram && info.miniProgram.envVersion) || ''
    // develop / trial 可预览；正式版 production 禁止当业务页
    return env === 'develop' || env === 'trial'
  } catch (e) {
    return false
  }
}

Page({
  data: {
    tabs: TABS,
    active: 'login',
    activeLabel: TABS[0].cap,
    orderNo: '',
    failCode: 'PAY_CANCELED',
    failReason: '用户取消支付',
    blocked: false,
    recs: [
      { title: '做内容的第三年，我承认日更是伪命题', meta: '示例作者 · 1.8 万阅读', cover: picsum('warmp1', 300, 240) },
      { title: '付费社群运营 SOP：冷启动到第一个 100 人', meta: '示例作者 · 9.4k 阅读', cover: picsum('warmp4', 300, 240) },
    ],
  },

  onLoad(options) {
    const forceDev = !!(options && (options.dev === '1' || options.preview === '1'))
    if (!isDevPreviewAllowed() && !forceDev) {
      this.setData({ blocked: true })
      wx.showToast({ title: '仅开发预览页', icon: 'none' })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/index/index',
          fail: () => wx.reLaunch({ url: '/pages/index/index' }),
        })
      }, 400)
      return
    }
    this._orderId = (options && options.orderId) || ''
    const orderNo = (options && options.orderNo) ? decodeURIComponent(options.orderNo) : ''
    if (orderNo) this.setData({ orderNo })
    if (options && options.state) {
      const hit = TABS.find((t) => t.key === options.state)
      if (hit) this.setData({ active: hit.key, activeLabel: hit.cap })
    }
  },

  onTab(e) {
    if (this.data.blocked) return
    const key = e.currentTarget.dataset.key
    const hit = TABS.find((t) => t.key === key)
    this.setData({ active: hit.key, activeLabel: hit ? hit.cap : '' })
  },

  onLogin() {
    this.onOpenLoginSheet()
  },

  onOpenLoginSheet() {
    const sheet = this.selectComponent('#global-login-sheet')
    if (sheet && typeof sheet.show === 'function') {
      sheet.show({ reason: 'states-demo' })
      return
    }
    wx.navigateTo({ url: '/pages/login/login' })
  },

  onLater() {
    wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
  },

  onRetry() {
    wx.showToast({ title: '已重试', icon: 'none' })
  },

  onService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  onGoList() {
    wx.navigateTo({
      url: '/pages/content-list/content-list',
      fail: () => wx.switchTab({ url: '/pages/discover/discover' }),
    })
  },

  onDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' })
  },

  onPayAgain() {
    const id = this._orderId
    if (id) {
      wx.navigateTo({ url: `/pkg-trade/order-detail/order-detail?id=${id}` })
      return
    }
    wx.navigateTo({
      url: '/pkg-trade/order-paid/order-paid?status=fail&orderNo=NG202609140941&code=PAY_CANCELED&reason=' + encodeURIComponent('用户取消支付'),
    })
  },
})
