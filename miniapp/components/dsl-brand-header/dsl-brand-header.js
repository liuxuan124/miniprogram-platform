// components/dsl-brand-header/dsl-brand-header.js — 品牌顶栏
const { getNavLayout } = require('../../utils/nav-layout')

function resolveLogoText(raw) {
  if (raw === undefined || raw === null) return ''
  return String(raw).trim()
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: null, value: null },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    statusBarHeight: 20,
    navBarHeight: 44,
    capsuleRight: 96,
    totalHeight: 64,
    headerStyle: '',
    barStyle: '',
    logoUrl: '',
    logoText: '',
    logoHeight: 56,
    logoMaxWidth: 176,
    titleText: '',
    subtitleText: '',
    showDivider: true,
    fixedTop: true,
    titleStyle: '',
    subtitleStyle: '',
    logoTextStyle: '',
    dividerStyle: '',
  },

  lifetimes: {
    attached() {
      this._layout = getNavLayout()
      this._apply(this.data.config || {})
    },
  },

  observers: {
    config(config) {
      this._apply(config || {})
    },
    styleString(styleString) {
      this._syncStyles(this.data.config || {}, String(styleString || ''))
    },
  },

  methods: {
    _apply(config) {
      const cfg = config || {}
      this._syncStyles(cfg, String(this.data.styleString || ''))
      const layout = this._layout || getNavLayout()
      const statusBarHeight = layout.statusBarHeight
      const navBarHeight = layout.navBarHeight
      const capsuleRight = layout.capsuleRight
      const totalHeight = statusBarHeight + navBarHeight
      const styleType = cfg.style_type === 'gradient' ? 'gradient' : 'plain'
      const isGradient = styleType === 'gradient'
      const titleColor = isGradient
        ? (cfg.title_color_light || '#ffffff')
        : (cfg.title_color || '#172033')
      const subtitleColor = isGradient
        ? (cfg.subtitle_color_light || 'rgba(255,255,255,0.82)')
        : (cfg.subtitle_color || '#7b8798')
      const titleSize = Number(cfg.title_font_size) > 0 ? Number(cfg.title_font_size) : 15
      const subtitleSize = Number(cfg.subtitle_font_size) > 0 ? Number(cfg.subtitle_font_size) : 11
      const logoH = Number(cfg.logo_height) > 0 ? Number(cfg.logo_height) : 28
      const logoMaxW = Number(cfg.logo_max_width) > 0 ? Number(cfg.logo_max_width) : 88
      const padL = Number(cfg.bar_padding_left) >= 0 ? Number(cfg.bar_padding_left) : 12
      const padR = Number(cfg.bar_padding_right) >= 0 ? Number(cfg.bar_padding_right) : 12
      const logoTextColor = cfg.logo_text_color || (isGradient ? '#ffffff' : '#002FA7')
      const dividerColor = cfg.divider_color || (isGradient ? 'rgba(255,255,255,0.35)' : '#d0d8e8')
      const fixedTop = cfg.fixed_top !== false

      this.setData({
        statusBarHeight,
        navBarHeight,
        capsuleRight,
        totalHeight,
        fixedTop,
        logoUrl: String(cfg.logo || '').trim(),
        logoText: resolveLogoText(cfg.logo_text),
        logoHeight: Math.max(logoH, 20) * 2,
        logoMaxWidth: Math.max(logoMaxW, 48) * 2,
        titleText: String(cfg.title || '墨太白 · 跨境工具与知识平台').trim() || '墨太白 · 跨境工具与知识平台',
        subtitleText: String(cfg.subtitle || '').trim(),
        showDivider: cfg.show_divider !== false,
        barStyle: 'height:' + navBarHeight + 'px;padding-left:' + (padL * 2) + 'rpx;padding-right:' + Math.max(capsuleRight, padR) + 'px;',
        titleStyle: 'font-size:' + (titleSize * 2) + 'rpx;color:' + titleColor + ';font-weight:700;',
        subtitleStyle: 'font-size:' + (subtitleSize * 2) + 'rpx;color:' + subtitleColor + ';',
        logoTextStyle: 'color:' + logoTextColor + ';font-size:30rpx;font-weight:800;',
        dividerStyle: 'background:' + dividerColor + ';',
      })
    },

    _syncStyles(cfg, shellStyle) {
      const styleType = (cfg && cfg.style_type) === 'gradient' ? 'gradient' : 'plain'
      let barBgStyle = ''
      if (styleType === 'gradient') {
        const from = (cfg && cfg.gradient_from) || '#002FA7'
        const to = (cfg && cfg.gradient_to) || '#1A4BBF'
        barBgStyle = 'background:linear-gradient(90deg,' + from + ' 0%,' + to + ' 100%);'
      } else {
        barBgStyle = 'background:' + ((cfg && cfg.background_color) || '#ffffff') + ';'
      }
      const shell = shellStyle ? shellStyle + ';' : ''
      this.setData({
        headerStyle: shell + barBgStyle,
      })
    },
  },
})
