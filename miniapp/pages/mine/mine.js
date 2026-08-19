// pages/mine/mine.js — 我的页面（会员中心入口）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const memberService = require('../../services/member')
const SystemService = require('../../services/system')
const { LOGIN_RULES } = require('../../config/login-rules')

/** 过滤无效菜单；设置入口保留（个人信息在设置页） */
function filterDeadMenuItems(list) {
  return (list || []).filter((item) => {
    if (item.enabled === false) return false
    if (!item.url && item.id !== 'contact') return false
    return true
  })
}

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    memberInfo: null,
    mineConfig: SystemService.DEFAULT_MINE_PAGE_CONFIG,
    servicePhone: '',
    continuousDays: 0,
    hasSignedIn: false,
    orderTabs: [
      { key: 'pending_payment', label: '待付款' },
      { key: 'paid', label: '待发货' },
      { key: 'shipped', label: '待收货' },
      { key: 'refund', label: '退款' },
    ],
    stats: { coupons: 0, points: 0, growth: 0 },
    badges: { pending: 0, appoint: 0, review: 0 },
    tipText: '',
    menuList: [
      ...SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems,
    ],
    visibleMenuList: filterDeadMenuItems(SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems),
  },

  onLoad() {
    this._loadMinePageConfig()
  },

  onShow() {
    // 自定义 tabBar：始终藏住原生栏，避免双 Tab
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false })
    }

    AuthService.silentLogin()
      .then((loggedIn) => {
        this._refreshUserInfo()
        if (loggedIn) {
          this._loadMemberInfo()
        }
      })
      .catch(() => {
        this._refreshUserInfo()
      })
  },

  /** 加载后台配置的我的页面内容 */
  _loadMinePageConfig() {
    SystemService.fetchMinePageConfig()
      .then((config) => {
        const menuList = Array.isArray(config.menuItems) && config.menuItems.length
          ? config.menuItems
          : SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems
        const visibleMenuList = filterDeadMenuItems(menuList)
        const servicePhone = config.service_phone || config.servicePhone
          || (config.minePageConfig && config.minePageConfig.servicePhone) || ''
        this.setData({
          mineConfig: {
            ...SystemService.DEFAULT_MINE_PAGE_CONFIG,
            ...config.minePageConfig,
            ...config,
            servicePhone,
          },
          servicePhone,
          menuList,
          visibleMenuList,
        })
      })
      .catch(() => {
        const menuList = SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems
        this.setData({
          mineConfig: SystemService.DEFAULT_MINE_PAGE_CONFIG,
          menuList,
          visibleMenuList: filterDeadMenuItems(menuList),
        })
      })
  },

  /** 刷新用户信息 */
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

    // 未登录不展示假数据
    if (!isLoggedIn) {
      this.setData({
        isLoggedIn: false,
        userInfo: null,
        memberInfo: null,
        stats: { coupons: 0, points: 0, growth: 0 },
        badges: { pending: 0, appoint: 0, review: 0 },
        tipText: '',
      })
      return
    }

    this.setData({ isLoggedIn, userInfo })
  },

  /** 加载会员信息 */
  _loadMemberInfo() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData({
        stats: { coupons: 0, points: 0, growth: 0 },
        tipText: '',
      })
      return
    }

    memberService.getMemberInfo()
      .then((data) => {
        this.setData({
          memberInfo: data,
          continuousDays: data.continuous_days || data.continuousDays || 0,
          hasSignedIn: data.has_signed_in || false,
          stats: {
            coupons: data.couponCount || data.coupon_count || 0,
            points: data.points || data.availablePoints || 0,
            growth: data.growthValue || data.growth_value || 0,
          },
          tipText: data.appointmentTip || '',
        })
      })
      .catch((err) => {
        console.error('[MinePage] 获取会员信息失败:', err)
        this.setData({
          stats: { coupons: 0, points: 0, growth: 0 },
          tipText: '',
        })
        if (err && (err.code === 401 || err.code === 403)) {
          AuthService.silentLogin()
            .then((loggedIn) => {
              if (!loggedIn) return
              this._refreshUserInfo()
              return memberService.getMemberInfo()
            })
            .then((data) => {
              if (!data) return
              this.setData({
                memberInfo: data,
                continuousDays: data.continuous_days || 0,
                hasSignedIn: data.has_signed_in || false,
                stats: {
                  coupons: data.couponCount || data.coupon_count || 0,
                  points: data.points || data.availablePoints || 0,
                  growth: data.growthValue || data.growth_value || 0,
                },
                tipText: data.appointmentTip || '',
              })
            })
            .catch((retryErr) => {
              console.error('[MinePage] 重新登录后获取会员信息失败:', retryErr)
            })
        }
      })
  },

  goCoupons() {
    wx.navigateTo({ url: '/pkg-user/coupon-list/coupon-list' })
  },

  goAppointments() {
    if (!AuthUtil.requireLoginForAction('查看预约')) return
    wx.navigateTo({ url: '/pkg-user/my-appointments/my-appointments' })
  },

  goWriteReview() {
    wx.navigateTo({ url: '/pkg-trade/order-list/order-list?status=completed' })
  },

  /** 点击头像/登录区域 */
  onUserAreaTap() {
    if (!this.data.isLoggedIn) {
      AuthUtil.openLoginSheet({
        onSuccess: () => {
          this._refreshUserInfo()
          this._loadMemberInfo()
        },
      })
      return
    }
    this.goSettings()
  },

  goSettings() {
    wx.navigateTo({ url: '/pkg-user/settings/settings' })
  },

  /** 跳转会员中心 */
  goMemberCenter() {
    wx.navigateTo({ url: '/pkg-user/member-center/member-center' })
  },

  /** 订单快捷入口 */
  onOrderTabTap(e) {
    const { key } = e.currentTarget.dataset
    if (!AuthUtil.requireLoginForAction('查看订单')) return
    wx.navigateTo({
      url: '/pkg-trade/order-list/order-list?status=' + key,
    })
  },

  /** 查看全部订单 */
  onViewAllOrders() {
    if (!AuthUtil.requireLoginForAction('查看订单')) return
    wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
  },

  /** 菜单项点击 */
  onMenuTap(e) {
    const ds = e.currentTarget.dataset || {}
    const id = ds.id
    const title = ds.title || ''
    const rawUrl = String(ds.url || '').trim()
    const menuItem = this.data.menuList.find((m) => String(m.id) === String(id)) || {
      id,
      title,
      url: rawUrl,
    }

    // 根据登录规则判断是否需要登录（设置/客服/反馈无需登录）
    const skipLogin = id === 'settings' || id === 'contact' || id === 'feedback'
      || /设置|客服|反馈|协议|隐私/.test(menuItem.title || title)
    const requireLogin = !skipLogin && (
      LOGIN_RULES.mineMenuRequireLogin[id]
      || /订单|资产|优惠券|收藏|地址|预约/.test(menuItem.title || title)
    )
    if (requireLogin && !AuthUtil.requireLoginForAction(menuItem.title || title || '继续操作')) return

    if (id === 'contact' || rawUrl === 'contact' || /客服|售后/.test(menuItem.title || title)) {
      wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
      return
    }

    const url = this._resolveMenuUrl(rawUrl || menuItem.url || '', menuItem.title || title)
    if (!url) {
      wx.showToast({ title: '功能暂不可用', icon: 'none' })
      return
    }

    const path = url.split('?')[0]
    const isTab = [
      '/pages/index/index',
      '/pages/content-list/content-list',
      '/pages/knowledge-mall/knowledge-mall',
      '/pages/mine/mine',
    ].indexOf(path) >= 0
    // 旧商城路径转到新 Tab
    if (path === '/pages/product-list/product-list') {
      wx.switchTab({ url: '/pages/knowledge-mall/knowledge-mall' })
      return
    }
    if (isTab) {
      wx.switchTab({ url: path })
      return
    }
    wx.navigateTo({
      url,
      fail: (err) => {
        console.error('[Mine] navigate fail', url, err)
        wx.showToast({ title: '页面打开失败，请更新体验版', icon: 'none' })
      },
    })
  },

  _resolveMenuUrl(rawUrl, title) {
    if (!rawUrl && /设置/.test(title || '')) return '/pkg-user/settings/settings'
    if (!rawUrl) return ''
    if (rawUrl === 'contact') return '/pkg-user/service-chat/service-chat'

    const moved = {
      '/pages/favorites/favorites': '/pkg-user/favorites/favorites',
      '/pages/address-list/address-list': '/pkg-user/address-list/address-list',
      '/pages/settings/settings': '/pkg-user/settings/settings',
      '/pages/feedback/feedback': '/pkg-user/feedback/feedback',
      '/pages/member-center/member-center': '/pkg-user/member-center/member-center',
      '/pages/coupon-list/coupon-list': '/pkg-user/coupon-list/coupon-list',
      '/pages/order-list/order-list': '/pkg-trade/order-list/order-list',
      '/pages/order-detail/order-detail': '/pkg-trade/order-detail/order-detail',
      '/pages/my-appointments/my-appointments': '/pkg-user/my-appointments/my-appointments',
      '/pages/appointment-list/appointment-list': '/pkg-user/appointment-list/appointment-list',
      '/pages/service-chat/service-chat': '/pkg-user/service-chat/service-chat',
      '/pages/sign-in/sign-in': '/pkg-user/sign-in/sign-in',
      '/pages/points-log/points-log': '/pkg-user/points-log/points-log',
      '/pages/activity-list/activity-list': '/pkg-extra/activity-list/activity-list',
      '/pages/activity-detail/activity-detail': '/pkg-extra/activity-detail/activity-detail',
      '/pages/agreement/agreement': '/pkg-user/agreement/agreement',
      '/pages/reservation/reservation': '/pkg-user/my-appointments/my-appointments',
      '/pages/activity/activity': '/pkg-extra/activity-list/activity-list',
      '/pages/privilege/privilege': '/pkg-user/member-center/member-center',
    }
    if (moved[rawUrl]) return moved[rawUrl]

    // 兼容带 query 的旧路径
    const pathOnly = rawUrl.split('?')[0]
    if (moved[pathOnly]) {
      const q = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?')) : ''
      return moved[pathOnly] + q
    }

    if (rawUrl.startsWith('/pages/') || rawUrl.startsWith('/pkg-')) return rawUrl
    if (/反馈/.test(title || '')) return '/pkg-user/feedback/feedback'
    if (/设置/.test(title || '')) return '/pkg-user/settings/settings'
    return ''
  },

  /** 退出登录 */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          AuthService.logout({ redirectToLogin: false })
          this._refreshUserInfo()
        }
      },
    })
  },
})
