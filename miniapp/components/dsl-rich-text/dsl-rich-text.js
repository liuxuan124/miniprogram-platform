// components/dsl-rich-text/dsl-rich-text.js — 富文本组件
const { extractImageUrls, previewRichHtmlImages } = require('../../utils/rich-html')

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

  data: {
    imageUrls: [],
    hasImages: false,
  },

  observers: {
    'config.content': function (content) {
      const imageUrls = extractImageUrls(content || '')
      this.setData({
        imageUrls,
        hasImages: imageUrls.length > 0,
      })
    },
  },

  methods: {
    /** 对外暴露：预览富文本内全部图片 */
    previewImages(currentUrl) {
      const html = (this.data.config && this.data.config.content) || ''
      return previewRichHtmlImages(html, currentUrl)
    },

    /** 点击富文本区域：有图则预览 */
    onContentTap() {
      if (this.data.hasImages) {
        this.previewImages()
      }
    },

    /** 富文本链接点击 */
    onLinkTap(e) {
      const url = e.detail.detail && e.detail.detail.href
        ? e.detail.detail.href
        : (e.detail.href || '')
      if (url) {
        wx.navigateTo({
          url: '/pkg-user/webview/webview?url=' + encodeURIComponent(url),
        })
      }
    },
  },
})
