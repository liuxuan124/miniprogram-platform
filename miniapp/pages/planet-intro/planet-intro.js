const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')
const { resolveMediaUrl } = require('../../utils/media-url')

function splitIntro(text) {
  return String(text || '')
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

Page({
  data: {
    loading: true,
    loadError: false,
    planetId: '',
    community: {
      title: '',
      subtitle: '',
      emoji: '🪐',
      highlights: [],
      ctaText: '加入星球',
    },
    introParagraphs: [],
    isMain: false,
    mainPlanetId: '',
  },

  onLoad(query) {
    const planetId = (query && (query.planetId || query.id)) || 'warm-main'
    this.setData({ planetId })
    this._load(planetId)
  },

  onRetry() {
    this._load(this.data.planetId)
  },

  _load(planetId) {
    this.setData({ loading: true, loadError: false })
    return Promise.all([
      PlanetService.getPlanetCommunity(planetId).catch(() => null),
      PlanetService.getMainPlanet().catch(() => null),
    ]).then(([community, main]) => {
      if (!community || !community.id) {
        this.setData({ loading: false, loadError: true })
        return
      }
      const mainPlanetId = (main && main.planetId)
        || PlanetService.getCachedMainPlanetId()
        || ''
      const cover = resolveMediaUrl(community.cover || '')
      const next = Object.assign({}, community, {
        cover,
        highlights: Array.isArray(community.highlights) ? community.highlights : [],
        ctaText: community.ctaText || '加入星球',
      })
      wx.setNavigationBarTitle({ title: next.title || '星球介绍' })
      this.setData({
        community: next,
        introParagraphs: splitIntro(next.intro),
        mainPlanetId,
        isMain: String(next.id) === String(mainPlanetId),
        loading: false,
        loadError: false,
      })
    }).catch(() => {
      this.setData({ loading: false, loadError: true })
    })
  },

  onBrowse() {
    const c = this.data.community || {}
    const id = c.id || this.data.planetId || 'warm-main'
    const url = c.feedUrl || `/pages/planet-feed/planet-feed?planetId=${encodeURIComponent(id)}`
    wx.navigateTo({ url })
  },

  onJoin() {
    const id = (this.data.community && this.data.community.id) || this.data.planetId || ''
    const url = id
      ? `/pages/join/join?planetId=${encodeURIComponent(id)}`
      : '/pages/join/join'
    wx.navigateTo({ url })
  },

  onSetMain() {
    const id = (this.data.community && this.data.community.id) || this.data.planetId
    if (!id) return
    if (!AuthUtil.requireLoginForAction('设为常驻星球', { silent: true })) {
      return
    }
    if (String(id) === String(this.data.mainPlanetId)) {
      wx.showToast({ title: '已是常驻星球', icon: 'none' })
      return
    }
    wx.showLoading({ title: '设置中', mask: true })
    PlanetService.setMainPlanet(id).then((res) => {
      const mainPlanetId = (res && res.planetId) || id
      this.setData({ mainPlanetId, isMain: true })
      wx.showToast({ title: '已设为常驻', icon: 'success' })
    }).catch(() => {
      // toasted
    }).finally(() => {
      wx.hideLoading()
    })
  },
})
