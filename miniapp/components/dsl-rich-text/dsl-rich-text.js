// components/dsl-rich-text/dsl-rich-text.js — 富文本组件
Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  methods: {
    /** 富文本链接点击 */
    onLinkTap(e) {
      const url = e.detail.detail && e.detail.detail.href
        ? e.detail.detail.href
        : (e.detail.href || '')
      if (url) {
        wx.navigateTo({
          url: '/pages/webview/webview?url=' + encodeURIComponent(url),
        })
      }
    },
  },
})
