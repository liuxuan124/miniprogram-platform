/** 深链兼容壳（非 Tab）：旧主包 order-paid → pkg-trade/order-paid */
Page({
  onLoad(q) {
    const keys = Object.keys(q || {})
    const qs = keys.map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&')
    wx.redirectTo({
      url: '/pkg-trade/order-paid/order-paid' + (qs ? '?' + qs : ''),
      fail() {
        wx.navigateBack({ fail() { wx.switchTab({ url: '/pages/mine/mine' }) } })
      },
    })
  },
})
