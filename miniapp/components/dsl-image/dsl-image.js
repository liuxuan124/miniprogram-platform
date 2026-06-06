// components/dsl-image/dsl-image.js — 单图组件
const { executeAction } = require('../../utils/render')

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

  methods: {
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
