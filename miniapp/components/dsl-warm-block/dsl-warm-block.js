const { executeAction } = require('../../utils/render')

function pickBrandName() {
  try {
    const app = getApp()
    const brand = (app && app.globalData && app.globalData.miniappBrandConfig) || {}
    return String(brand.appName || brand.name || '').trim()
  } catch (e) {
    return ''
  }
}

function resolveBrandInitial(config, warm) {
  const fromProp = String((config && config.brand_initial) || '').trim()
  if (fromProp) return fromProp.slice(0, 1)
  const fromWarm = String((warm && warm.brandName) || '').trim()
  if (fromWarm) return fromWarm.slice(0, 1)
  const appName = pickBrandName()
  if (appName) return appName.slice(0, 1)
  return '暖'
}

function resolveMemberBadgeLabel(config, warm) {
  const cfg = config || {}
  const w = warm || {}
  if (w.memberBadgeLabel) return String(w.memberBadgeLabel)
  if (w.isPlatformMember) {
    return String(w.memberLevelName || cfg.member_active_label || '年度会员').trim() || '年度会员'
  }
  return String(cfg.member_cta_label || '开通会员 ›').trim() || '开通会员 ›'
}

function resolveTopBg(shellStyle, config) {
  const s = shellStyle || {}
  const fromStyle = String(s.background_color || s.background || '').trim()
  if (fromStyle) return fromStyle
  const fromProp = String((config && config.top_background) || '').trim()
  return fromProp
}

function isMotaiPlainSkin(config, bg) {
  const cfg = config || {}
  if (String(cfg.greet_skin || '').trim() === 'plain') return true
  if (cfg.show_member_badge === true) return true
  if (String(cfg.brand_initial || '').trim()) return true
  if (bg) return true
  const titleSize = Number(cfg.greet_title_font_size)
  const subSize = Number(cfg.greet_sub_font_size)
  if (Number.isFinite(titleSize) && titleSize > 0 && titleSize !== 20) return true
  if (Number.isFinite(subSize) && subSize > 0 && subSize !== 11) return true
  return false
}

function hasRealAvatar(url) {
  const u = String(url || '').trim()
  if (!u) return false
  if (u.indexOf('default-avatar') >= 0) return false
  return true
}

Component({
  properties: {
    type: { type: String, value: '' },
    config: { type: Object, value: {} },
    warm: { type: Object, value: {} },
    shellStyle: { type: Object, value: {} },
  },
  data: {
    avatarBroken: false,
    showAvatarImage: false,
    brandInitial: '暖',
    memberBadgeLabel: '开通会员 ›',
    useDefaultTopBg: true,
    topBgInline: '',
    greetTitleStyle: '',
    greetSubStyle: '',
    usePlainSearch: false,
  },
  observers: {
    'config, warm, shellStyle': function () {
      this._syncGreetUi()
    },
    'warm.userAvatar': function () {
      this.setData({ avatarBroken: false })
      this._syncGreetUi()
    },
  },
  lifetimes: {
    attached() {
      this._syncGreetUi()
    },
  },
  methods: {
    _syncGreetUi() {
      const config = this.data.config || {}
      const warm = this.data.warm || {}
      const bg = resolveTopBg(this.data.shellStyle, config)
      const titleSize = Number(config.greet_title_font_size)
      const subSize = Number(config.greet_sub_font_size)
      const titlePx = Number.isFinite(titleSize) && titleSize > 0 ? titleSize : 20
      const subPx = Number.isFinite(subSize) && subSize > 0 ? subSize : 11
      const showAvatarImage = hasRealAvatar(warm.userAvatar) && !this.data.avatarBroken
      const usePlainSearch = isMotaiPlainSkin(config, bg)
      this.setData({
        usePlainSearch,
        useDefaultTopBg: !bg,
        topBgInline: bg ? ('background:' + bg + ';') : '',
        brandInitial: resolveBrandInitial(config, warm),
        memberBadgeLabel: resolveMemberBadgeLabel(config, warm),
        showAvatarImage,
        greetTitleStyle: 'font-size:' + (titlePx * 2) + 'rpx;font-weight:700;',
        greetSubStyle: 'font-size:' + (subPx * 2) + 'rpx;',
      })
    },
    onAvatarError() {
      if (this.data.avatarBroken) return
      this.setData({ avatarBroken: true, showAvatarImage: false })
    },
    onGreetTap() { this.triggerEvent('greettap') },
    onNotice() { this.triggerEvent('notice') },
    onMemberBadge() {
      const cfg = this.data.config || {}
      const link = String(cfg.member_link || '/pages/member-center/member-center').trim()
        || '/pages/member-center/member-center'
      executeAction({ type: 'page', path: link })
      this.triggerEvent('memberbadge', { url: link })
    },
    goSearch() { this.triggerEvent('search') },
    onNav(e) { this.triggerEvent('nav', e.currentTarget.dataset || {}) },
    onAuthor(e) { this.triggerEvent('author', e.currentTarget.dataset || {}) },
    onFeature() { this.triggerEvent('feature') },
    onColumn(e) { this.triggerEvent('column', e.currentTarget.dataset || {}) },
    goPlanet() {
      const cfg = this.data.config || {}
      let url = cfg.feed_url || cfg.feedUrl || ''
      if (!url || /\/pages\/planet\/planet\/?$/.test(String(url))) {
        url = '/pkg-content/planet-feed/planet-feed?planetId=warm-main'
      }
      this.triggerEvent('planet', { url })
    },
    onSeg(e) { this.triggerEvent('seg', e.currentTarget.dataset || {}) },
    onRetry() { this.triggerEvent('retry') },
    onMore(e) {
      const cfg = this.data.config || {}
      let url = cfg.more_url || cfg.moreUrl
        || (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url)
        || ''
      let tab = cfg.more_tab ? '1' : ''
      if (this.data.type === 'warm_planet_rec') {
        if (!url || /\/pages\/planet\/planet\/?$/.test(String(url))) {
          url = '/pkg-content/planet-list/planet-list'
        }
        tab = ''
      }
      if (this.data.type === 'warm_authors') {
        if (!url || /\/pages\/content-list\/content-list\/?$/.test(String(url))) {
          url = '/pkg-content/author-list/author-list'
        }
        tab = ''
      }
      this.triggerEvent('nav', { url, tab })
    },
  },
})
