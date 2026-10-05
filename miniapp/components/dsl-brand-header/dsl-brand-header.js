// components/dsl-brand-header/dsl-brand-header.js — 品牌顶栏
const { getNavLayout } = require('../../utils/nav-layout')
const { getPrimaryColor } = require('../../utils/theme')

/**
 * 🔴 与后台 admin/src/components/page-builder/brandHeader/brandHeaderSchema.ts 同规则。
 * ⚠️ 改一边必须改另一边：logo_mode / bg_mode 的解析规则、颜色深浅分支、
 *    fixed_top→sticky 别名、默认宽度，全都要同步。
 */

// Logo 展示形式：旧配置没有 logo_mode，按 logo/logo_text 并存关系反推
function resolveLogoMode(cfg) {
  const explicit = cfg.logo_mode
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    if (['image', 'text', 'both', 'none'].indexOf(explicit) >= 0) return explicit
    return 'text'
  }
  const hasLogo = !!String(cfg.logo || '').trim()
  const hasText = !!String(cfg.logo_text || '').trim()
  if (hasLogo && hasText) return 'both'
  if (hasLogo) return 'image'
  if (hasText) return 'text'
  return 'none'
}

// 背景模式：style_type 是 bg_mode 的历史别名
function resolveBgMode(cfg) {
  const explicit = cfg.bg_mode
  if (explicit !== undefined && explicit !== null && explicit !== '') {
    if (['plain', 'gradient', 'immersive'].indexOf(explicit) >= 0) return explicit
    return 'plain'
  }
  return cfg.style_type === 'gradient' ? 'gradient' : 'plain'
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
    logoMode: 'text',
    logoFitMode: 'aspectFit',
    showsLogoImage: false,
    showsLogoText: false,
    logoStyle: '',
    logoHeight: 56,
    logoMaxWidth: 176,
    titleText: '',
    subtitleText: '',
    showDivider: true,
    showAction: false,
    actionGlyph: '',
    fixedTop: true,
    isBlank: false,
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

      const bgMode = resolveBgMode(cfg)
      const isDark = bgMode === 'gradient' || bgMode === 'immersive'
      const titleColor = isDark
        ? (cfg.title_color_light || '#ffffff')
        : (cfg.title_color || '#172033')
      const subtitleColor = isDark
        ? (cfg.subtitle_color_light || 'rgba(255,255,255,0.82)')
        : (cfg.subtitle_color || '#7b8798')

      const titleSize = Number(cfg.title_font_size) > 0 ? Number(cfg.title_font_size) : 15
      const subtitleSize = Number(cfg.subtitle_font_size) > 0 ? Number(cfg.subtitle_font_size) : 11
      const logoH = Number(cfg.logo_height) > 0 ? Number(cfg.logo_height) : 28
      const logoMaxW = Number(cfg.logo_max_width) > 0 ? Number(cfg.logo_max_width) : 88
      const padL = Number(cfg.bar_padding_left) >= 0 ? Number(cfg.bar_padding_left) : 12
      const padR = Number(cfg.bar_padding_right) >= 0 ? Number(cfg.bar_padding_right) : 12
      const itemGap = Number(cfg.item_gap) >= 0 ? Number(cfg.item_gap) : 10
      const brandPrimary = getPrimaryColor()
      const logoTextColor = cfg.logo_text_color || (isDark ? '#ffffff' : brandPrimary)
      const dividerColor = cfg.divider_color || (isDark ? 'rgba(255,255,255,0.35)' : '#d0d8e8')
      // fixed_top 是 sticky 的历史别名
      const fixedTop = cfg.sticky === undefined ? (cfg.fixed_top !== false) : !!cfg.sticky

      const logoMode = resolveLogoMode(cfg)
      const showsLogoImage = logoMode === 'image' || logoMode === 'both'
      const showsLogoText = logoMode === 'text' || logoMode === 'both'
      const logoUrl = String(cfg.logo || '').trim()
      const logoText = String(cfg.logo_text || '').trim()
      const titleText = String(cfg.title || '品牌名称 · 一句话定位').trim()
      // Logo 与标题都空 → 空态占位，防止顶栏塌成 0 高
      const hasLogo = (showsLogoImage && !!logoUrl) || (showsLogoText && !!logoText)
      const isBlank = !hasLogo && !titleText

      // 🔴 保持宽高比：keep_ratio 时只给高度、宽度自适应（width:auto + aspectFit）
      const keepRatio = cfg.logo_keep_ratio === undefined ? true : !!cfg.logo_keep_ratio
      const fit = ['contain', 'cover', 'fill', 'none'].indexOf(cfg.logo_fit) >= 0 ? cfg.logo_fit : 'contain'
      // aspectFit≈contain / aspectFill≈cover / scaleToFill≈fill
      const mode = keepRatio ? 'aspectFit' : (fit === 'cover' ? 'aspectFill' : (fit === 'fill' ? 'scaleToFill' : 'widthFix'))
      let logoStyle = 'height:' + Math.max(logoH, 16) * 2 + 'rpx;max-width:' + Math.max(logoMaxW, 48) * 2 + 'rpx;'
      if (keepRatio) logoStyle += 'width:auto;'
      else if (fit === 'fill') logoStyle += 'width:' + Math.max(logoMaxW, 48) * 2 + 'rpx;'

      const ACTION_GLYPH = { search: '🔍', service: '💬', qrcode: '▦', share: '↗' }
      const showAction = cfg.show_action === true
      const actionIcon = ['search', 'service', 'qrcode', 'share'].indexOf(cfg.action_icon) >= 0 ? cfg.action_icon : 'search'

      this.setData({
        statusBarHeight,
        navBarHeight,
        capsuleRight,
        totalHeight,
        fixedTop,
        bgMode,
        logoMode,
        showsLogoImage,
        showsLogoText,
        logoUrl,
        logoText,
        logoStyle,
        logoFitMode: mode,
        logoHeight: Math.max(logoH, 16) * 2,
        logoMaxWidth: Math.max(logoMaxW, 48) * 2,
        titleText,
        subtitleText: String(cfg.subtitle || '').trim(),
        showDivider: cfg.show_divider !== false && logoMode !== 'none' && hasLogo,
        showAction,
        actionGlyph: ACTION_GLYPH[actionIcon],
        isBlank,
        // 右内边距必须给胶囊留位，否则真机标题会被微信胶囊压住
        barStyle: 'height:' + navBarHeight + 'px;padding-left:' + padL * 2 + 'rpx;padding-right:' + Math.max(capsuleRight, padR * 2) + 'rpx;gap:' + itemGap * 2 + 'rpx;',
        titleStyle: 'font-size:' + titleSize * 2 + 'rpx;color:' + titleColor + ';font-weight:700;',
        subtitleStyle: 'font-size:' + subtitleSize * 2 + 'rpx;color:' + subtitleColor + ';',
        logoTextStyle: 'color:' + logoTextColor + ';font-size:30rpx;font-weight:' + (cfg.logo_text_bold === false ? '500' : '800') + ';',
        dividerStyle: 'background:' + dividerColor + ';',
      })
    },

    /** 点击品牌区：按 tap_action 分发 */
    onTapBrand() {
      const cfg = this.data.config || {}
      const action = cfg.tap_action || 'none'
      if (action === 'none') return
      if (action === 'home') {
        wx.reLaunch({ url: '/pages/index/index' })
        return
      }
      if (action === 'intro') {
        // 🔴 小程序端**没有** brand-intro 页（app.json 未登记），不能写死路径必 404。
        // 改为跳后台「品牌介绍」组件所在页面：由运营在内容 Tab 选自定义跳转时指定。
        const url = String(cfg.tap_link_url || '').trim()
        if (url) {
          require('../../utils/render').navigatePage(url)
        } else {
          wx.showToast({ title: '未配置品牌介绍页', icon: 'none' })
        }
        return
      }
      const url = String(cfg.tap_link_url || '').trim()
      if (url) require('../../utils/render').navigatePage(url)
    },

    /** 右侧快捷入口 */
    onTapAction() {
      const cfg = this.data.config || {}
      const act = cfg.action_tap_action || 'none'
      if (act === 'intro') {
        const url = String(cfg.action_link_url || '').trim()
        if (url) {
          require('../../utils/render').navigatePage(url)
        } else {
          wx.showToast({ title: '未配置品牌介绍页', icon: 'none' })
        }
        return
      }
      if (act === 'custom') {
        const url = String(cfg.action_link_url || '').trim()
        if (!url) return
        require('../../utils/render').navigatePage(url)
        return
      }
      if (cfg.action_icon === 'share') {
        wx.showShareMenu({ menus: ['shareAppMessage'] })
      }
    },

    _syncStyles(cfg, shellStyle) {
      const brandPrimary = getPrimaryColor()
      const bgMode = resolveBgMode(cfg || {})
      let barBgStyle = ''
      if (bgMode === 'gradient') {
        const from = (cfg && cfg.gradient_from) || brandPrimary
        const to = (cfg && cfg.gradient_to) || brandPrimary
        barBgStyle = 'background:linear-gradient(90deg,' + from + ' 0%,' + to + ' 100%);'
      } else if (bgMode === 'immersive') {
        barBgStyle = 'background:rgba(255,255,255,0.72);'
      } else {
        barBgStyle = 'background:' + ((cfg && cfg.background_color) || '#ffffff') + ';'
      }
      // 底部细分隔线
      const borderOn = !cfg || cfg.bottom_border === undefined ? true : !!cfg.bottom_border
      if (borderOn) {
        const bc = (cfg && cfg.bottom_border_color) || '#eef1f6'
        barBgStyle += 'border-bottom:1rpx solid ' + bc + ';box-sizing:border-box;'
      }
      // 吸顶毛玻璃 + 滚动投影
      const sticky = cfg && cfg.sticky === undefined ? (cfg.fixed_top !== false) : !!(cfg && cfg.sticky)
      if (sticky && cfg && cfg.backdrop_blur) {
        barBgStyle += 'backdrop-filter:blur(16rpx);'
      }
      if (cfg && cfg.scroll_shadow) {
        barBgStyle += 'box-shadow:0 4rpx 20rpx rgba(15,23,42,0.08);'
      }
      // 过滤会顶掉 fixed 的 position，避免顶栏占位空白翻倍
      const shell = String(shellStyle || '')
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s && !/^position\s*:/i.test(s))
        .join(';')
      this.setData({
        headerStyle: (shell ? shell + ';' : '') + barBgStyle,
      })
    },
  },
})
