Component({
  properties: {
    type: { type: String, value: '' },
    config: { type: Object, value: {} },
    warm: { type: Object, value: {} },
  },
  data: {
    avatarBroken: false,
  },
  observers: {
    'warm.userAvatar': function () {
      this.setData({ avatarBroken: false })
    },
  },
  methods: {
    onAvatarError() {
      if (this.data.avatarBroken) return
      this.setData({ avatarBroken: true })
    },
    onGreetTap() { this.triggerEvent('greettap') },
    onNotice() { this.triggerEvent('notice') },
    goSearch() { this.triggerEvent('search') },
    onNav(e) { this.triggerEvent('nav', e.currentTarget.dataset || {}) },
    onAuthor(e) { this.triggerEvent('author', e.currentTarget.dataset || {}) },
    onFeature() { this.triggerEvent('feature') },
    onColumn(e) { this.triggerEvent('column', e.currentTarget.dataset || {}) },
    goPlanet() {
      const cfg = this.data.config || {}
      let url = cfg.feed_url || cfg.feedUrl || ''
      if (!url || /\/pages\/planet\/planet\/?$/.test(String(url))) {
        url = '/pages/planet-feed/planet-feed?planetId=warm-main'
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
      // 暖阁「我的星球 · 进入」固定进社区列表，避免旧装修仍 switchTab 到星球页
      if (this.data.type === 'warm_planet_rec') {
        if (!url || /\/pages\/planet\/planet\/?$/.test(String(url))) {
          url = '/pages/planet-list/planet-list'
        }
        tab = ''
      }
      // 「全部作者」默认进作者列表，避免旧装修仍跳内容列表
      if (this.data.type === 'warm_authors') {
        if (!url || /\/pages\/content-list\/content-list\/?$/.test(String(url))) {
          url = '/pages/author-list/author-list'
        }
        tab = ''
      }
      this.triggerEvent('nav', { url, tab })
    },
  },
})
