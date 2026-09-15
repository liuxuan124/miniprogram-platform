/**
 * 深链兼容壳（非 Tab）：旧 /pages/service-chat → /pkg-user/service-chat/service-chat。
 * 正式入口请直达分包路径；本页仅 remap。
 */
Page({
  onLoad(options) {
    const q = []
    if (options && options.orderId) q.push('orderId=' + encodeURIComponent(options.orderId))
    const qs = q.length ? '?' + q.join('&') : ''
    wx.redirectTo({
      url: '/pkg-user/service-chat/service-chat' + qs,
      fail: () => {
        wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' + qs })
      },
    })
  },
})
