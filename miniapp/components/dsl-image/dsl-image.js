// components/dsl-image/dsl-image.js — 单图组件
const { executeAction } = require('../../utils/render')
const { aspectRatioBoxStyle, aspectRatioFillStyle, parseAspectRatio } = require('../../utils/image-aspect-ratio')

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
    _applyAspect(config) {
      const ratio = parseAspectRatio(config.aspect_ratio)
      const fixed = ratio != null
      this.setData({
        isFixedRatio: fixed,
        mediaBoxStyle: fixed ? aspectRatioBoxStyle(config.aspect_ratio) : '',
        mediaFillStyle: fixed ? aspectRatioFillStyle() : '',
      })
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
