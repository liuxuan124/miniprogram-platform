/**
 * 深链兼容壳（非 Tab 入口）：旧 path /pages/knowledge-mall/* → 现行商城 Tab。
 * Tab 点击已在 custom-tab-bar / tabbar-config 一次性改写到 /pages/shop/shop，不会进本页。
 * 保留本页仅为扫码/分享/历史链接 remap；首屏空白避免「正在前往…」中转观感。
 */
Page({
  onLoad(options) {
    const qs = []
    Object.keys(options || {}).forEach((k) => {
      if (options[k] == null || options[k] === '') return
      qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(options[k]))
    })
    const query = qs.length ? '?' + qs.join('&') : ''
    if (query) {
      try {
        wx.setStorageSync('__tab_query__/pages/shop/shop', options)
      } catch (e) { /* ignore */ }
    }
    wx.switchTab({
      url: '/pages/shop/shop',
      fail: () => {
        wx.reLaunch({ url: '/pages/shop/shop' + query })
      },
    })
  },
})
