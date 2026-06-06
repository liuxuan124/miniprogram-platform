// pages/webview/webview.js — WebView 页面
Page({
  data: {
    url: '',
  },

  onLoad(options) {
    if (options.url) {
      this.setData({
        url: decodeURIComponent(options.url),
      })
    }

    // 设置导航栏标题
    if (options.title) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(options.title) })
    }
  },

  /** WebView 加载完成 */
  onMessage(e) {
    // 接收 WebView 发送的消息
    console.log('[WebView] 收到消息:', e.detail.data)
  },
})
