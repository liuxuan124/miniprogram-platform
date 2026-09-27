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
      this.setData({
        title: String(cfg.title || '年度会员 · 全站资料免费下'),
        subtitle: String(cfg.subtitle || ''),
        buttonText: String(cfg.button_text || '立即开通 ›'),
        buttonLink: String(cfg.button_link || '/pages/member-center/member-center'),
        bannerStyle: `background:linear-gradient(135deg, ${from} 0%, ${mid} 60%, ${to} 100%);`,
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
