const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    loading: true,
    loadError: false,
    list: [],
    mainPlanetId: '',
  },

  onLoad() {
    this._load()
  },

  onShow() {
    wx.setNavigationBarColor({
      frontColor: '#000000',
      backgroundColor: '#FDF6EC',
      animation: { duration: 0 },
    })
  },

  onPullDownRefresh() {
    this._load().finally(() => wx.stopPullDownRefresh())
  },

  onRetry() {
    this._load()
  },

  _load() {
    this.setData({ loading: true, loadError: false })
    return Promise.all([
      PlanetService.getPlanetCommunities().catch(() => null),
      PlanetService.getMainPlanet().catch(() => null),
    ]).then(([rows, main]) => {
      const list = Array.isArray(rows) ? rows : []
      const mainPlanetId = (main && main.planetId)
        || PlanetService.getCachedMainPlanetId()
        || (list.find((c) => c.primary) || list[0] || {}).id
        || ''
      const marked = list.map((item) => Object.assign({}, item, {
        isMain: String(item.id) === String(mainPlanetId),
        primary: String(item.id) === String(mainPlanetId),
      }))
      this.setData({
        list: marked,
        mainPlanetId,
        loading: false,
        loadError: !rows,
      })
    }).catch(() => {
      this.setData({ loading: false, loadError: true, list: [] })
    })
  },

  onOpenIntro(e) {
    const { id } = e.currentTarget.dataset || {}
    const url = `/pages/planet-intro/planet-intro?planetId=${encodeURIComponent(id || 'warm-main')}`
    wx.navigateTo({ url })
  },

  onOpenFeed(e) {
    const { id, feed } = e.currentTarget.dataset || {}
    const url = feed || `/pages/planet-feed/planet-feed?planetId=${encodeURIComponent(id || 'warm-main')}`
    wx.navigateTo({ url })
  },

  onSetMain(e) {
    const id = e.currentTarget.dataset.id
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
      const list = (this.data.list || []).map((item) => Object.assign({}, item, {
        isMain: String(item.id) === String(mainPlanetId),
        primary: String(item.id) === String(mainPlanetId),
      }))
      this.setData({ list, mainPlanetId })
      wx.showToast({ title: '已设为常驻', icon: 'success' })
    }).catch(() => {
      // request 已 toast
    }).finally(() => {
      wx.hideLoading()
    })
  },
})
