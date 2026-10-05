const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    loading: true,
    loadError: false,
    list: [],
    mainPlanetId: '',
    /** 用户是否主动设过主星球（false = 只是配置 primary 兜底，用户仍可改选） */
    userSetMain: false,
    /** pick = 首次引导态（先挑一个主星球）；缺省 = 现有的「我加入的星球」管理态 */
    mode: 'first',
    isPick: false,
  },

  onLoad(query) {
    const mode = (query && query.mode) === 'pick' ? 'pick' : 'first'
    this.setData({ mode, isPick: mode === 'pick' })
    if (mode === 'pick') {
      wx.setNavigationBarTitle({ title: '选一个星球' })
    }
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
      const list = PlanetService.normalizeCommunities(rows)
      const cachedId = PlanetService.getCachedMainPlanetId()
      // ⚠️ 接口失败时 main 为 null，此时用本地缓存兜底；
      //    有缓存 ≈ 之前设过（setMainPlanet 成功也会写缓存）
      const userSetMain = main ? (main.userSet === true) : !!cachedId
      // 四级兜底：接口 → 本地缓存 → 配置 primary → 列表第一条
      const mainPlanetId = (main && main.planetId)
        || cachedId
        || (list.find((c) => c.primary) || list[0] || {}).id
        || ''
      const marked = list.map((item) => Object.assign({}, item, {
        isMain: String(item.id) === String(mainPlanetId),
        // 只有用户主动设过的那颗才是真「主星球」；配置兜底的不算，
        // 否则 pick 态下用户点配置 primary 会被误判成「已是常驻」而选不了
        isMyMain: userSetMain && String(item.id) === String(mainPlanetId),
      }))
      this.setData({
        list: marked,
        mainPlanetId,
        userSetMain,
        loading: false,
        loadError: !rows,
      })
    }).catch(() => {
      this.setData({ loading: false, loadError: true, list: [] })
    })
  },

  onOpenIntro(e) {
    const { id } = e.currentTarget.dataset || {}
    const url = `/pkg-content/planet-intro/planet-intro?planetId=${encodeURIComponent(id || 'warm-main')}`
    wx.navigateTo({ url })
  },

  onOpenFeed(e) {
    const { id, feed } = e.currentTarget.dataset || {}
    const url = feed || `/pkg-content/planet-feed/planet-feed?planetId=${encodeURIComponent(id || 'warm-main')}`
    wx.navigateTo({ url })
  },

  onSetMain(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    // 已由用户主动设过同一颗才提示「已是常驻」；配置兜底的 primary 不算
    if (this.data.userSetMain && String(id) === String(this.data.mainPlanetId)) {
      wx.showToast({ title: '已是常驻星球', icon: 'none' })
      return
    }
    // 登录后自动续跑，用户不用再点一次「设为常驻」
    if (!AuthUtil.requireLoginThen('设为常驻星球', () => this._applySetMain(id), { silent: true })) {
      return
    }
    this._applySetMain(id)
  },

  _applySetMain(id) {
    wx.showLoading({ title: '设置中', mask: true })
    PlanetService.setMainPlanet(id).then((res) => {
      const mainPlanetId = (res && res.planetId) || id
      const list = (this.data.list || []).map((item) => Object.assign({}, item, {
        isMain: String(item.id) === String(mainPlanetId),
        isMyMain: String(item.id) === String(mainPlanetId),
      }))
      this.setData({ list, mainPlanetId, userSetMain: true })
      wx.showToast({ title: '已设为常驻', icon: 'success' })
      // 首次引导态选完主星球后不再回到本页，直接落到星球 Tab
      if (this.data.isPick) {
        setTimeout(() => {
          wx.switchTab({
            url: '/pages/planet/planet',
            fail: () => wx.navigateBack({ delta: 1, fail: () => {} }),
          })
        }, 800)
      }
    }).catch(() => {
      // request 已 toast
    }).finally(() => {
      wx.hideLoading()
    })
  },

  /** pick 态：未加入的星球主按钮是「先加入」，进介绍页走购买流程 */
  onJoinFirst(e) {
    const id = e.currentTarget.dataset.id
    if (!id) return
    const url = `/pkg-content/planet-intro/planet-intro?planetId=${encodeURIComponent(id)}`
    wx.navigateTo({ url })
  },

  /** pick 态：先逛逛 = 不写 main_planet_id，只记一次跳过标记 */
  onSkip() {
    PlanetService.setPickSkipped()
    wx.showToast({ title: '之后可在「切换」里改', icon: 'none' })
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/planet/planet',
        fail: () => wx.navigateBack({ delta: 1, fail: () => {} }),
      })
    }, 900)
  },
})
