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
    /** 容器排版样式（字号/行高/内外边距/背景），与内部样式解耦、靠继承生效 */
    bodyStyle: '',
    /** 内容为空 → 展示占位，避免塌成 0 高 */
    isEmpty: false,
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
        isEmpty: !String(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, ' ').trim() && !/<img\b/i.test(html),
      })
      this._syncBodyStyle()
    },
    // 容器排版字段任一变化都要重算（字号/行高靠继承，不要下放到每个节点）
    'config.base_font_size, config.text_color, config.line_height, config.paragraph_gap, config.padding_x, config.padding_y, config.margin_y, config.container_bg, config.container_radius': function () {
      this._syncBodyStyle()
    },
  },

  lifetimes: {
    attached() {
      this._syncBodyStyle()
    },
  },

  methods: {
    /**
     * 计算容器样式。与后台 richTextSchema.ts 同规则。
     * ⚠️ rich-text 内部节点不认外部 class，容器样式只能挂在最外层靠继承生效；
     *    这也是后台把字号/行高放容器而不是逐个改内联 style 的原因。
     */
    _syncBodyStyle() {
      const c = (this.data.config || {})
      const num = (v, d) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : d)
      const fontSize = num(c.base_font_size, 14)
      const lineHeight = Number(c.line_height) > 0 ? Number(c.line_height) : 1.75
      const gap = num(c.paragraph_gap, 8)
      const padX = Number.isFinite(Number(c.padding_x)) ? Number(c.padding_x) : 16
      const padY = Number.isFinite(Number(c.padding_y)) ? Number(c.padding_y) : 12
      const marY = Number.isFinite(Number(c.margin_y)) ? Number(c.margin_y) : 8

      let bg = 'transparent'
      if (c.container_bg === 'card') bg = '#ffffff'
      else if (c.container_bg === 'paper') bg = '#faf7f0'
      else if (c.background_color) bg = String(c.background_color)

      let radius = ''
      if (c.container_bg && c.container_bg !== 'none' && c.container_radius !== false) {
        radius = 'border-radius:20rpx;'
      }

      this.setData({
        bodyStyle:
          'font-size:' + fontSize * 2 + 'rpx;' +
          'line-height:' + lineHeight + ';' +
          'color:' + (c.text_color || '#333333') + ';' +
          'padding:' + padY * 2 + 'rpx ' + padX * 2 + 'rpx;' +
          'margin-top:' + marY * 2 + 'rpx;margin-bottom:' + marY * 2 + 'rpx;' +
          'background:' + bg + ';' +
          radius +
          'word-break:break-word;',
      })
    },

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
