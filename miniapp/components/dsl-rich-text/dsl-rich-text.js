// components/dsl-rich-text/dsl-rich-text.js — 富文本组件
//
// 渲染策略：
//   · 内容里没有链接 → 整段交给 rich-text（与历史行为完全一致，零回归）
//   · 内容里有 <a href> → 用 html-blocks 拆出块级结构，交给 html-node 用原生 view 渲染，
//     链接变成真正可点的视图。原因：rich-text 只做静态渲染，tap 事件只有坐标、没有 href，
//     富文本里的链接原本完全点不动（现象：点了毫无反应）。
const { extractImageUrls, previewRichHtmlImages } = require('../../utils/rich-html')
const { parseHtmlBlocks } = require('../../utils/html-blocks')

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
    /** 块级渲染节点（仅当内容含链接时使用） */
    blocks: [],
    /** 是否含可点链接 */
    hasLink: false,
    /** 纯文本模式：整段交给 rich-text */
    plain: true,
  },

  observers: {
    'config.content': function (content) {
      const html = content || ''
      const imageUrls = extractImageUrls(html)
      let parsed = { nodes: [], hasLink: false }
      try {
        parsed = parseHtmlBlocks(html)
      } catch (e) {
        // 解析异常时退回整段 rich-text，保证不白屏
        parsed = { nodes: [], hasLink: false }
      }
      this.setData({
        imageUrls,
        hasImages: imageUrls.length > 0,
        blocks: parsed.nodes,
        hasLink: parsed.hasLink,
        plain: !parsed.hasLink,
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
  },
})
