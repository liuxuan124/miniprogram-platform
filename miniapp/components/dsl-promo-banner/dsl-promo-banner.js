const { navigatePage } = require('../../utils/render')

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  data: {
    title: '',
    subtitle: '',
    buttonText: '',
    buttonLink: '',
    bannerStyle: '',
    titleColor: '#f3dcaa',
    subtitleColor: '#d9ccb8',
    buttonBg: '#f3dcaa',
    buttonColor: '#3a2708',
    showGlow: true,
  },
  observers: {
    config(cfg) {
      this._apply(cfg || {})
    },
  },
  lifetimes: {
    attached() {
      this._apply(this.data.config || {})
    },
  },
  methods: {
    _apply(cfg) {
      const from = cfg.gradient_from || '#1d1b18'
      const mid = cfg.gradient_mid || '#3b2f22'
      const to = cfg.gradient_to || '#7a4a1d'
      // 背景类型：显式 bg_type 优先；未设置时按「有渐变色」反推，
      // 保证历史页面（只有 gradient_from/to）外观不变。⚠️ 必须与后台
      // PromoBannerRenderer 的 bgType 同规则，否则后台预览与线上不一致。
      const bgType = cfg.bg_type === 'solid'
        ? 'solid'
        : (cfg.bg_type ? 'gradient' : (cfg.gradient_from || cfg.gradient_to ? 'gradient' : 'solid'))
      // 中间色可选：留空/ 关开关时退化为两色渐变
      const useMid = cfg.use_gradient_mid !== undefined ? !!cfg.use_gradient_mid : !!cfg.gradient_mid
      const rawAngle = Number(cfg.gradient_angle)
      const angle = isFinite(rawAngle) ? rawAngle : 135
      const stops = useMid
        ? `${from} 0%, ${mid} 60%, ${to} 100%`
        : `${from} 0%, ${to} 100%`
      this.setData({
        title: String(cfg.title || '年度会员 · 全站资料免费下'),
        subtitle: String(cfg.subtitle || ''),
        buttonText: String(cfg.button_text || '立即开通 ›'),
        buttonLink: String(cfg.button_link || '/pages/member-center/member-center'),
        bannerStyle: bgType === 'solid'
          ? `background:${cfg.background_color || from};`
          : `background:linear-gradient(${angle}deg, ${stops});`,
        titleColor: cfg.title_color || '#f3dcaa',
        subtitleColor: cfg.subtitle_color || '#d9ccb8',
        buttonBg: cfg.button_bg || '#f3dcaa',
        buttonColor: cfg.button_color || '#3a2708',
        showGlow: cfg.show_glow !== false,
      })
    },
    onTap() {
      const link = this.data.buttonLink
      if (link) navigatePage(link)
    },
  },
})
