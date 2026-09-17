const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const memberService = require('../../services/member')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { blockTradeNavigation } = require('../../utils/product-module-gate')
const noticeService = require('../../services/notice')
const { picsum } = require('../../data/warm-media')

Page({
  ...createSharePageConfig(),
  data: {
    statusBarHeight: 20,
    styleKey: 'warm',
    isLoggedIn: false,
    userInfo: null,
    memberInfo: null,
    continuousDays: 18,
    joinDays: 342,
    noticeUnread: 0,
    vipDesc: '有效期至 2027-03-18 · 全站长文免费读',
    vipTitle: '暖阁年度会员',
    planetTitle: '暖阁星球',
    demoNickName: '林砚',
    demoLevelName: 'LV.4 常读者',
    demoAvatar: picsum('warmav', 140, 140),
    learnCover: picsum('warmc1', 200, 150),
    stats: [
      { value: '126', label: '收藏' },
      { value: '38', label: '笔记' },
      { value: '12', label: '关注' },
      { value: '2,480', label: '暖豆' },
    ],
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) { /* ignore */ }
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
        if (loggedIn) {
          this._loadMemberInfo()
          this._loadNoticeUnread()
        }
      })
      .catch(() => this._refreshUserInfo())
  },

  _refreshUserInfo() {
    const app = getApp()
    const isLoggedIn = AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn
      ? (AuthUtil.getUserInfo() || app.globalData.userInfo)
      : null
    if (app.globalData.isLoggedIn !== isLoggedIn) {
      app.globalData.isLoggedIn = isLoggedIn
      app.globalData.token = isLoggedIn ? AuthUtil.getToken() : null
      app.globalData.userInfo = userInfo
    }
    if (!isLoggedIn) {
      this.setData({
        isLoggedIn: false,
        userInfo: { nickName: this.data.demoNickName || '林砚' },
        memberInfo: { level_name: this.data.demoLevelName || 'LV.4 常读者' },
        noticeUnread: 9,
        vipDesc: '有效期至 2027-03-18 · 全站长文免费读',
        continuousDays: 18,
        joinDays: 342,
        stats: [
          { value: '126', label: '收藏' },
          { value: '38', label: '笔记' },
          { value: '12', label: '关注' },
          { value: '2,480', label: '暖豆' },
        ],
      })
      return
    }
    this.setData({ isLoggedIn: true, userInfo })
  },

  _loadMemberInfo() {
    if (!AuthUtil.isLoggedIn()) return
    memberService.getMemberInfo()
      .then((data) => {
        const days = data.continuous_days || data.continuousDays || 18
        const expire = data.expireAt || data.expire_at || data.memberExpireAt || '2027-03-18'
        this.setData({
          memberInfo: data,
          continuousDays: days,
          vipDesc: `有效期至 ${expire} · 全站长文免费读`,
        })
      })
      .catch(() => {})
  },

  _loadNoticeUnread() {
    if (!AuthUtil.isLoggedIn()) return
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
        this._loadMemberInfo()
        this._loadNoticeUnread()
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
    this._nav('/pkg-user/settings/settings')
  },

  onMemberCardTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('开通会员')
      return
    }
    this._nav('/pkg-user/member-center/member-center')
  },

  onNoticeTap() {
    // 站内消息中心（未读通知列表），对齐 prototypes-warm/notice.html
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
    // 对齐原型「继续学习」→ 专栏详情；demo 预览不受商品总开关拦截
    this._nav('/pages/product-detail/product-detail?demo=column')
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
})
