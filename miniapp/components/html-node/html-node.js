// components/html-node/html-node.js — 富文本块级节点的原生渲染（支持链接点击）
//
// 由 dsl-rich-text 使用：把 html-blocks 拆出来的节点树渲染成原生 view。
// 内联内容仍交给 rich-text 渲染，因此视觉与原先一致，只有 <a> 变成可点视图。
const { navigatePage } = require('../../utils/render')

// 装修页里遗留的错链修正表。
// 早期用富文本搭页面时，href 写的是并不存在的页面路径（点击后只会报「页面不存在」），
// 这里统一兜到真实页面上。已核实：这 5 个目标在生产页面表里都不存在。
const LEGACY_LINK_FIX = {
  '/pages/custom/motai-article-detail': '/pages/custom/motai-note-p3',   // 文章详情
  '/pages/custom/motai-product-detail': '/pages/custom/motai-note-p11',  // 商品详情
  '/pages/custom/motai-resource-detail': '/pages/custom/motai-note-p5',  // 资料详情
  '/pages/custom/motai-planet-join': '/pages/custom/motai-planet',       // 星球
  '/pages/ask/ask': '/pages/custom/motai-qa',                            // 问答
}

Component({
  properties: {
    /** 渲染节点数组：{ i, s, k, r, c } */
    nodes: {
      type: Array,
      value: [],
    },
  },

  methods: {
    onNodeTap(e) {
      const link = e && e.currentTarget && e.currentTarget.dataset
        ? e.currentTarget.dataset.link
        : ''
      const raw = String(link || '').trim()
      if (!raw) return

      // 外链：走内置 webview
      if (/^https?:\/\//i.test(raw)) {
        wx.navigateTo({
          url: '/pkg-user/webview/webview?url=' + encodeURIComponent(raw),
          fail() {
            wx.showToast({ title: '链接打开失败', icon: 'none' })
          },
        })
        return
      }

      // 小程序内部路径：先纠历史错链，再交给统一导航
      // （统一导航自带 tab 切换、主包→分包别名、/pages/custom/* 解析）
      const target = LEGACY_LINK_FIX[raw] || raw
      navigatePage(target)
    },
  },
})
