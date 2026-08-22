const { getMenuLineIconSvg, isMenuLineIcon, svgToDataUri } = require('../../utils/menu-line-icons')

Component({
  properties: {
    icon: { type: String, value: '' },
    size: { type: Number, value: 24 },
  },

  observers: {
    icon(sizeIgnored) {
      this._render(this.properties.icon, this.properties.size)
    },
    size(sz) {
      this._render(this.properties.icon, sz)
    },
  },

  data: {
    isLine: false,
    src: '',
    emoji: '•',
    sizePx: 24,
  },

  lifetimes: {
    attached() {
      this._render(this.properties.icon, this.properties.size)
    },
  },

  methods: {
    _render(icon, size) {
      const sizePx = Number(size) || 24
      if (isMenuLineIcon(icon)) {
        const svg = getMenuLineIconSvg(icon)
        this.setData({
          isLine: Boolean(svg),
          src: svg ? svgToDataUri(svg) : '',
          emoji: '',
          sizePx,
        })
        return
      }
      this.setData({
        isLine: false,
        src: '',
        emoji: icon || '•',
        sizePx,
      })
    },
  },
})
