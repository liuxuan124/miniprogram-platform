const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { blockTradeNavigation } = require('../../utils/product-module-gate')
const noticeService = require('../../services/notice')
const { loadTabBoundDslPage, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const {
  DEFAULT_AVATAR,
  pickDisplayAvatarUrl,
  isTempLocalAvatar,
} = require('../../utils/image-fallback')

const EMPTY_STATS = [
  { value: '—', label: '收藏' },
  { value: '—', label: '笔记' },
  { value: '—', label: '关注' },
  { value: '—', label: '暖豆' },
]

function fmtCount(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return '0'
  return x.toLocaleString('en-US')
}

function withDisplayAvatar(userInfo) {
  const info = userInfo && typeof userInfo === 'object' ? userInfo : null
  const displayAvatarUrl = pickDisplayAvatarUrl(
    info && info.avatarUrl,
    info && info.avatar,
  )
  return {
    userInfo: info,
    displayAvatarUrl,
    avatarBroken: false,
  }
}

function guestState() {
  return {
    isLoggedIn: false,
    userInfo: null,
    displayAvatarUrl: DEFAULT_AVATAR,
    avatarBroken: false,
    memberInfo: null,
    continuousDays: 0,
    joinDays: 0,
    noticeUnread: 0,
    vipDesc: '登录后查看会员与学习记录',
    vipCta: '去登录',
    memberActive: false,
    stats: EMPTY_STATS,
    learnItem: null,
    planetItem: null,
    questionCount: 0,
    inviteCount: 0,
    pendingOrderCount: 0,
    unusedCouponCount: 0,
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    statusBarHeight: 20,
    styleKey: 'warm',
    displayAvatarUrl: DEFAULT_AVATAR,
    avatarBroken: false,
    vipTitle: '暖阁年度会员',
    planetTitle: '暖阁星球',
    ...guestState(),
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) { /* ignore */ }
    loadTabBoundDslPage(this, '/pages/mine/mine').then(() => {})
    const SystemService = require('../../services/system')
    SystemService.fetchMinePageConfig(true).then((mine) => {
      if (!mine) return
      const patch = {}
      if (mine.styleKey) patch.styleKey = mine.styleKey
      if (mine.memberCardTitle) patch.vipTitle = mine.memberCardTitle
      this.setData(patch)
    }).catch(() => {})
    SystemService.fetchSystemConfig(true).then((config) => {
      const planet = config && (config.planet_config || config.planetConfig)
      const title = planet && (planet.title || planet.name)
      if (title) this.setData({ planetTitle: title })
    }).catch(() => {})
  },

  onReady() {
    if (typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
        fail() {},
      })
    }
    this._loginSheet = this.selectComponent('#global-login-sheet')
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    showTabBarForRoute(this, '/pages/mine/mine')
    this._resetStuckLoginSheet()
    try {
      const SystemService = require('../../services/system')
      SystemService.fetchMinePageConfig(false).then((mine) => {
        if (mine && mine.styleKey) this.setData({ styleKey: mine.styleKey })
        if (mine && mine.memberCardTitle) this.setData({ vipTitle: mine.memberCardTitle })
      }).catch(() => {})
    } catch (e) { /* ignore */ }
    AuthService.silentLogin()
      .then((loggedIn) => {
        this._refreshUserInfo()
        if (loggedIn) this._loadMineOverview()
      })
      .catch(() => this._refreshUserInfo())
  },

  _refreshUserInfo() {
    const app = getApp()
    const isLoggedIn = AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn
      ? (AuthUtil.getUserInfo() || (app && app.globalData.userInfo) || null)
      : null
    if (app) {
      app.globalData.isLoggedIn = isLoggedIn
      app.globalData.token = isLoggedIn ? AuthUtil.getToken() : null
      app.globalData.userInfo = userInfo
    }
    if (!isLoggedIn) {
      this.setData(guestState())
      return
    }
    const patched = withDisplayAvatar(userInfo)
    // 本地缓存若仍是 localhost/临时路径，写回已解析后的可展示 URL（或清空等 overview）
    if (patched.userInfo && patched.displayAvatarUrl !== DEFAULT_AVATAR) {
      const next = Object.assign({}, patched.userInfo, { avatarUrl: patched.displayAvatarUrl })
      AuthUtil.setUserInfo(next)
      if (app) app.globalData.userInfo = next
      this.setData({ isLoggedIn: true, userInfo: next, displayAvatarUrl: patched.displayAvatarUrl, avatarBroken: false })
      return
    }
    this.setData({
      isLoggedIn: true,
      userInfo: patched.userInfo,
      displayAvatarUrl: patched.displayAvatarUrl,
      avatarBroken: false,
    })
  },

  onAvatarError() {
    // 临时头像偶发加载失败时不要立刻清空，留给上传完成后刷新
    if (isTempLocalAvatar(this.data.displayAvatarUrl)) return
    if (this.data.displayAvatarUrl === DEFAULT_AVATAR) return
    this.setData({ displayAvatarUrl: DEFAULT_AVATAR, avatarBroken: true })
  },

  _loadMineOverview() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData(guestState())
      return
    }
    get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false })
      .then((data) => {
        if (!AuthUtil.isLoggedIn()) {
          this.setData(guestState())
          return
        }
        const local = AuthUtil.getUserInfo() || {}
        const nickName = data.nickname || local.nickName || local.nickname || '微信用户'
        // 优先本地（含刚选的微信临时头像），避免被 overview 旧坏链盖掉
        const displayAvatarUrl = pickDisplayAvatarUrl(
          local.avatarUrl,
          local.avatar,
          data.avatarUrl,
        )
        const userInfo = Object.assign({}, local, { nickName, nickname: nickName })
        if (displayAvatarUrl && displayAvatarUrl !== DEFAULT_AVATAR) {
          userInfo.avatarUrl = displayAvatarUrl
        }
        AuthUtil.setUserInfo(userInfo)
        const expire = data.memberExpireAt || ''
        const memberActive = !!data.memberActive
        let vipDesc = '尚未开通会员'
        let vipCta = '去开通'
        if (memberActive && expire) {
          vipDesc = `有效期至 ${expire}`
          vipCta = '去续费'
        } else if (memberActive) {
          vipDesc = '会员有效'
          vipCta = '去查看'
        }
        this.setData({
          isLoggedIn: true,
          userInfo,
          displayAvatarUrl,
          avatarBroken: false,
          memberInfo: { level_name: data.levelName || '' },
          continuousDays: Number(data.continuousSignDays) || 0,
          joinDays: Number(data.joinDays) || 0,
          memberActive,
          vipDesc,
          vipCta,
          stats: [
            { value: fmtCount(data.favoriteCount), label: '收藏' },
            { value: fmtCount(data.noteCount), label: '笔记' },
            { value: fmtCount(data.followCount), label: '关注' },
            { value: fmtCount(data.points), label: '暖豆' },
          ],
          learnItem: data.learn || null,
          planetItem: data.planet || null,
          planetTitle: (data.planet && data.planet.title) || this.data.planetTitle,
          questionCount: Number(data.questionCount) || 0,
          inviteCount: Number(data.inviteCount) || 0,
          pendingOrderCount: Number(data.pendingOrderCount) || 0,
          unusedCouponCount: Number(data.unusedCouponCount) || 0,
        })
      })
      .catch(() => {
        if (!AuthUtil.isLoggedIn()) this.setData(guestState())
      })
    this._loadNoticeUnread()
  },

  _loadNoticeUnread() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData({ noticeUnread: 0 })
      return
    }
    noticeService.unreadCount()
      .then((data) => {
        const count = Number((data && (data.count || data.unread)) || 0)
        this.setData({ noticeUnread: Number.isFinite(count) ? count : 0 })
        const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
        if (tabBar && tabBar.setNoticeUnread) tabBar.setNoticeUnread(this.data.noticeUnread)
      })
      .catch(() => this.setData({ noticeUnread: 0 }))
  },

  _resetStuckLoginSheet() {
    const sheet = this._loginSheet || this.selectComponent('#global-login-sheet')
    if (!sheet || !sheet.data) return
    if (sheet.data.mounted && !sheet.data.visible && !sheet.data.loading) {
      sheet.setData({ mounted: false, visible: false })
    }
  },

  _openLoginSheet(action) {
    const options = {
      action: action || '',
      onSuccess: () => {
        this._refreshUserInfo()
        this._loadMineOverview()
      },
    }
    const tryShow = () => {
      const sheet = this._loginSheet || this.selectComponent('#global-login-sheet')
      if (sheet && typeof sheet.show === 'function') {
        sheet.show(options)
        return true
      }
      return false
    }
    if (tryShow()) return true
    wx.nextTick(() => {
      if (tryShow()) return
      setTimeout(() => {
        if (tryShow()) return
        AuthUtil.openLoginSheet(options)
      }, 100)
    })
    return false
  },

  _ensureLogin(desc) {
    if (AuthUtil.isLoggedIn()) return true
    this._openLoginSheet(desc)
    return false
  },

  _nav(url, needLogin, loginDesc) {
    if (needLogin && !this._ensureLogin(loginDesc || '继续操作')) return
    if (blockTradeNavigation(url)) return
    if (url.indexOf('/pages/planet/planet') === 0
      || url.indexOf('/pages/shop/shop') === 0
      || url.indexOf('/pages/discover/discover') === 0
      || url.indexOf('/pages/mine/mine') === 0
      || url.indexOf('/pages/index/index') === 0) {
      wx.switchTab({ url })
      return
    }
    wx.navigateTo({
      url,
      fail: () => wx.showToast({ title: '页面打开失败', icon: 'none' }),
    })
  },

  onUserAreaTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('同步收藏与阅读记录')
      return
    }
    this._nav('/pkg-user/settings/settings')
  },

  onSettingsTap() {
    wx.navigateTo({
      url: '/pkg-user/settings/settings',
      fail: (err) => {
        console.warn('[mine] open settings failed', err)
        wx.showToast({ title: '设置页打开失败', icon: 'none' })
      },
    })
  },

  onMemberCardTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('开通会员')
      return
    }
    this._nav('/pkg-user/member-center/member-center')
  },

  onNoticeTap() {
    this._nav('/pkg-user/notices/notices', true, '查看消息')
  },

  onGoFavorites() {
    this._nav('/pkg-user/favorites/favorites', true, '查看收藏')
  },

  onGoHistory() {
    this._nav('/pages/content-list/content-list')
  },

  onGoOrders() {
    this._nav('/pkg-trade/order-list/order-list', true, '查看订单')
  },

  onGoLearnMore() {
    if (!this._ensureLogin('同步学习进度')) return
    const item = this.data.learnItem
    if (item && item.productId) {
      this._nav(`/pages/product-detail/product-detail?id=${item.productId}`)
      return
    }
    this._nav('/pages/shop/shop')
  },

  onGoPlanet() {
    this._nav('/pages/planet/planet')
  },

  onGoAsk() {
    this._nav('/pages/question-ask/question-ask', true, '提问打卡')
  },

  onGoContribute() {
    this._nav('/pages/contribute/contribute')
  },

  onGoResources() {
    this._nav('/pages/resources/resources')
  },

  onGoCoupons() {
    this._nav('/pkg-user/coupon-list/coupon-list', true, '查看优惠券')
  },

  onGoShare() {
    this._nav('/pages/share/share')
  },

  onGoJoin() {
    this._nav('/pages/join/join')
  },

  onGoService() {
    this._nav('/pkg-user/service-chat/service-chat')
  },

  onGoFeedback() {
    this._nav('/pkg-user/feedback/feedback')
  },

  onLogoutTap() {
    if (!this.data.isLoggedIn) return
    wx.showModal({
      title: '退出登录',
      content: '退出后将清除本机登录信息，不会删除账号',
      success: (res) => {
        if (!res.confirm) return
        AuthService.logout({ manual: true, redirectToLogin: false })
        this.setData(guestState())
        wx.showToast({ title: '已退出登录', icon: 'success' })
      },
    })
  },
})
