// pages/mine/mine.js — 我的页（对齐后台 minePageConfig）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const memberService = require('../../services/member')
const SystemService = require('../../services/system')
const { LOGIN_RULES } = require('../../config/login-rules')

const ORDER_TAB_KEYS = ['pending', 'paid', 'shipped', 'completed']
const ORDER_STATUS_API = {
  pending: 'pending_payment',
  paid: 'paid',
  shipped: 'shipped',
  completed: 'completed',
}
const ORDER_TAB_EMOJI = {
  pending: '💰',
  paid: '📦',
  shipped: '🚚',
  completed: '✅',
}
const LINE_ICON_EMOJI = {
  'line:document': '📄',
  'line:books': '📚',
  'line:calendar': '📅',
  'line:crown': '👑',
  'line:coupon': '🎫',
  'line:wallet': '💰',
  'line:package': '📦',
  'line:truck': '🚚',
  'line:check': '✅',
  'line:star': '⭐',
  'line:pin': '📍',
  'line:chat': '💬',
  'line:gear': '⚙️',
  'line:mail': '✉️',
  'line:user': '👤',
  'line:heart': '❤️',
  'line:bag': '🛍️',
  'line:gift': '🎁',
  'line:phone': '📞',
  'line:ticket': '🎟️',
  'line:clipboard': '📋',
  'line:feedback': '📝',
  'line:idcard': '🪪',
  'line:list': '📃',
  'line:bell': '🔔',
  'line:shield': '🛡️',
  'line:home': '🏠',
  'line:grid': '▦',
  'line:tag': '🏷️',
  'line:search': '🔍',
  'line:pencil': '✏️',
  'line:sun': '☀️',
}

function iconDisplay(icon) {
  if (!icon) return '•'
  if (String(icon).startsWith('line:')) return LINE_ICON_EMOJI[icon] || '•'
  return icon
}

function filterMenuItems(list) {
  return (list || []).filter((item) => {
    if (item.enabled === false) return false
    if (!item.url && item.id !== 'contact') return false
    return true
  }).map((item) => ({
    ...item,
    iconText: iconDisplay(item.icon),
  }))
}

function buildOrderTabs(mineConfig) {
  const labels = (mineConfig.orderQuickAccess && mineConfig.orderQuickAccess.tabLabels)
    || SystemService.DEFAULT_ORDER_QUICK_ACCESS.tabLabels
  return ORDER_TAB_KEYS.map((key) => ({
    key,
    apiStatus: ORDER_STATUS_API[key],
    label: labels[key] || SystemService.DEFAULT_ORDER_QUICK_ACCESS.tabLabels[key],
    iconText: ORDER_TAB_EMOJI[key],
  }))
}

function memberCtaText(mineConfig, isLoggedIn) {
  if (isLoggedIn) return '查看权益'
  const raw = String((mineConfig && mineConfig.loginButtonText) || '').trim()
  if (raw && raw !== '微信一键登录') return raw
  return '登录'
}

function memberBenefitsLine(styleKey, isLoggedIn) {
  if (styleKey === 'member') return '专属折扣 · 积分加速 · 优先预约'
  if (isLoggedIn) return '查看会员权益与成长进度'
  return '登录后查看会员权益与成长进度'
}

Page({
  data: {
    statusBarHeight: 20,
    isLoggedIn: false,
    userInfo: null,
    memberInfo: null,
    mineConfig: SystemService.DEFAULT_MINE_PAGE_CONFIG,
    styleKey: 'basic',
    showDecor: true,
    showMemberCard: true,
    showOrderTabs: true,
    showAllOrdersBtn: true,
    showMenuIcons: true,
    showAvatar: true,
    memberCta: '登录',
    memberBenefits: '登录后查看会员权益与成长进度',
    levelLabel: '会员等级',
    orderTabs: buildOrderTabs(SystemService.DEFAULT_MINE_PAGE_CONFIG),
    menuList: filterMenuItems(SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems),
    continuousDays: 0,
    badges: { pending: 0, appoint: 0, review: 0 },
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20 })
    } catch (e) { /* ignore */ }
    this._loadMinePageConfig(true)
  },

  onReady() {
    this._loginSheet = this.selectComponent('#global-login-sheet')
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3, hidden: false })
    }

    this._resetStuckLoginSheet()
    this._loadMinePageConfig(false)
    AuthService.silentLogin()
      .then((loggedIn) => {
        this._refreshUserInfo()
        if (loggedIn) this._loadMemberInfo()
      })
      .catch(() => {
        this._refreshUserInfo()
      })
  },

  _applyMineConfig(config) {
    const mineConfig = SystemService.normalizeMinePageConfig(config)
    const styleKey = config.styleKey || SystemService.resolveMineStyleKey(mineConfig)
    const menuList = filterMenuItems(mineConfig.menuItems)
    const orderQa = mineConfig.orderQuickAccess || SystemService.DEFAULT_ORDER_QUICK_ACCESS
    const userProfile = mineConfig.userProfile || SystemService.DEFAULT_USER_PROFILE
    const isLoggedIn = this.data.isLoggedIn

    this.setData({
      mineConfig,
      styleKey,
      showDecor: mineConfig.showDecorBackground !== false,
      showMemberCard: mineConfig.showMemberCard !== false,
      showOrderTabs: orderQa.showOrderTabs !== false,
      showAllOrdersBtn: orderQa.showAllOrdersBtn !== false,
      showMenuIcons: !!mineConfig.showMenuIcons,
      showAvatar: userProfile.showAvatar !== false,
      orderTabs: buildOrderTabs(mineConfig),
      menuList,
      memberCta: memberCtaText(mineConfig, isLoggedIn),
      memberBenefits: memberBenefitsLine(styleKey, isLoggedIn),
      levelLabel: userProfile.memberLevelLabel || '会员等级',
    })
  },

  _loadMinePageConfig(force) {
    SystemService.fetchMinePageConfig(!!force)
      .then((config) => this._applyMineConfig(config))
      .catch(() => this._applyMineConfig(SystemService.DEFAULT_MINE_PAGE_CONFIG))
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
        userInfo: null,
        memberInfo: null,
        badges: { pending: 0, appoint: 0, review: 0 },
        memberCta: memberCtaText(this.data.mineConfig, false),
        memberBenefits: memberBenefitsLine(this.data.styleKey, false),
      })
      return
    }

    this.setData({
      isLoggedIn: true,
      userInfo,
      memberCta: memberCtaText(this.data.mineConfig, true),
      memberBenefits: memberBenefitsLine(this.data.styleKey, true),
    })
  },

  _loadMemberInfo() {
    if (!AuthUtil.isLoggedIn()) return
    memberService.getMemberInfo()
      .then((data) => {
        this.setData({
          memberInfo: data,
          continuousDays: data.continuous_days || data.continuousDays || 0,
        })
      })
      .catch((err) => {
        console.error('[MinePage] 获取会员信息失败:', err)
      })
  },

  _resetStuckLoginSheet() {
    const sheet = this._loginSheet || this.selectComponent('#global-login-sheet')
    if (!sheet || !sheet.data) return
    if (sheet.data.mounted && !sheet.data.visible && !sheet.data.loading) {
      sheet.setData({ mounted: false, visible: false })
    }
  },

  /** 半屏登录面板（不跳转登录页） */
  _openLoginSheet(action) {
    const options = {
      action: action || '',
      onSuccess: () => {
        this._refreshUserInfo()
        this._loadMemberInfo()
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

  onUserAreaTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('解锁会员权益')
      return
    }
    wx.navigateTo({ url: '/pkg-user/settings/settings' })
  },

  onLoginTap() {
    if (this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pkg-user/member-center/member-center' })
      return
    }
    this._openLoginSheet('查看会员权益')
  },

  onMemberCardTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('查看会员权益')
      return
    }
    wx.navigateTo({ url: '/pkg-user/member-center/member-center' })
  },

  onMemberCtaTap() {
    this.onLoginTap()
  },

  onOrderTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (!this._ensureLogin('查看订单')) return
    const apiStatus = ORDER_STATUS_API[key] || key
    wx.navigateTo({
      url: '/pkg-trade/order-list/order-list?status=' + apiStatus,
    })
  },

  onViewAllOrders() {
    if (!this._ensureLogin('查看订单')) return
    wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
  },

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

    const skipLogin = id === 'settings' || id === 'contact' || id === 'feedback'
      || /设置|客服|反馈|协议|隐私/.test(menuItem.title || title)
    const requireLogin = !skipLogin && (
      LOGIN_RULES.mineMenuRequireLogin[id]
      || /订单|资产|优惠券|收藏|地址|预约|已购|会员|资料/.test(menuItem.title || title)
    )
    if (requireLogin && !this._ensureLogin(menuItem.title || title || '继续操作')) return

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
})
