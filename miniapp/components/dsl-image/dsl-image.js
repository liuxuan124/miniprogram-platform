// components/dsl-image/dsl-image.js — 单图组件
const { executeAction } = require('../../utils/render')
const { aspectRatioBoxStyle, aspectRatioFillStyle, parseAspectRatio } = require('../../utils/image-aspect-ratio')
const { normalizeImageUrl, DEFAULT_HERO_RATIO } = require('../../utils/image-preload')

// 默认按商城/工具顶图 3:2，避免旧 750:420 骨架高度跳变
const DEFAULT_AUTO_RATIO = 3 / 2

Component({
  properties: {
    config: {
      type: Object,
      value: {},
    },
    actions: {
      type: Array,
      value: [],
    },
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    mediaBoxStyle: '',
    mediaFillStyle: '',
    isFixedRatio: false,
    imageSrc: '',
    imgReady: false,
  },

  observers: {
    config: function (config) {
      this._applyAspect(config || {})
    },
  },

  lifetimes: {
    attached() {
      this._applyAspect(this.data.config || {})
    },
  },

  methods: {
    _boxStyle(ratio) {
      const r = ratio > 0 ? ratio : DEFAULT_AUTO_RATIO
      const pct = (100 / r).toFixed(4)
      return 'position:relative;width:100%;height:0;padding-bottom:' + pct + '%;overflow:hidden;background:#f1f5fb;'
    },

    _applyAspect(config) {
      const src = normalizeImageUrl(config.image || config.src || '')
      const prevSrc = this.data.imageSrc
      // src 未变时不要重置 imgReady，避免 config 注解二次 setData 闪一下
      const srcChanged = src !== prevSrc

      const ratio = parseAspectRatio(config.aspect_ratio)
      if (ratio != null) {
        this.setData({
          isFixedRatio: true,
          imageSrc: src,
          imgReady: srcChanged ? false : this.data.imgReady,
          mediaBoxStyle: aspectRatioBoxStyle(config.aspect_ratio) || this._boxStyle(ratio),
          mediaFillStyle: aspectRatioFillStyle(),
        })
        return
      }

      // auto / widthFix：始终用固定比例盒，首绘与加载后高度一致（不再切到 widthFix）
      let skeletonRatio = DEFAULT_AUTO_RATIO
      const pw = Number(config._preloadWidth)
      const ph = Number(config._preloadHeight)
      if (Number.isFinite(pw) && Number.isFinite(ph) && pw > 0 && ph > 0) {
        skeletonRatio = pw / ph
      } else {
        const fallback = parseAspectRatio(DEFAULT_HERO_RATIO)
        if (fallback) skeletonRatio = fallback
      }
      this.setData({
        isFixedRatio: true,
        imageSrc: src,
        imgReady: srcChanged ? false : this.data.imgReady,
        mediaBoxStyle: this._boxStyle(skeletonRatio),
        mediaFillStyle: aspectRatioFillStyle(),
      })
    },

    onImageLoad() {
      // 只做透明度显现，不改容器高度、不换 mode，避免闪跳
      if (!this.data.imgReady) {
        this.setData({ imgReady: true })
      }
    },

    onTap() {
      const { config, actions } = this.data
      if (config && config.link_url) {
        executeAction({
          type: config.link_type || 'page',
          path: config.link_url,
          url: config.link_url,
        })
        return
      }
      if (actions && actions.length > 0) {
        executeAction(actions[0])
      }
    },
  },
})
