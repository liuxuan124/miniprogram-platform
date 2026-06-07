// pages/mine/mine.js — 我的页面（会员中心入口）
const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const memberService = require('../../services/member')
const SystemService = require('../../services/system')
const { LOGIN_RULES } = require('../../config/login-rules')

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,
    memberInfo: null,       // 会员信息（等级、积分等）
    mineConfig: SystemService.DEFAULT_MINE_PAGE_CONFIG,
    servicePhone: '',
    continuousDays: 0,      // 连续签到天数
    hasSignedIn: false,     // 今日是否已签到
    // 订单快捷入口
    orderTabs: [
      { key: 'pending_payment', label: '待确认' },
      { key: 'paid', label: '待发货' },
      { key: 'shipped', label: '待收货' },
      { key: 'refund', label: '退款' },
    ],
    // 菜单列表
    menuList: [
      ...SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems,
    ],
    visibleMenuList: [
      ...SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems.filter((item) => item.enabled !== false),
    ],
  },

  onLoad() {
    this._loadMinePageConfig()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
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
        const visibleMenuList = menuList.filter((item) => {
          if (item.enabled === false) return false
          // F5: 无 url 且非客服入口则隐藏，避免「功能开发中」死入口
          if (!item.url && item.id !== 'contact') return false
          return true
        })
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
        this.setData({
          mineConfig: SystemService.DEFAULT_MINE_PAGE_CONFIG,
          menuList: SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems,
          visibleMenuList: SystemService.DEFAULT_MINE_PAGE_CONFIG.menuItems.filter((item) => item.enabled !== false),
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

    this.setData({ isLoggedIn, userInfo })
  },

  /** 加载会员信息 */
  _loadMemberInfo() {
    memberService.getMemberInfo()
      .then((data) => {
        this.setData({
          memberInfo: data,
          continuousDays: data.continuous_days || 0,
          hasSignedIn: data.has_signed_in || false,
        })
      })
      .catch((err) => {
        console.error('[MinePage] 获取会员信息失败:', err)
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
              })
            })
            .catch((retryErr) => {
              console.error('[MinePage] 重新登录后获取会员信息失败:', retryErr)
            })
        }
      })
  },

  /** 点击头像/登录区域 */
  onUserAreaTap() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
    }
  },

  /** 获取用户信息（头像昵称） */
  onGetUserProfile() {
    if (!this.data.isLoggedIn) {
      wx.navigateTo({ url: '/pages/login/login' })
      return
    }

    AuthService.getUserProfile()
      .then((userInfo) => {
        return AuthService.updateUserInfo(userInfo)
      })
      .then(() => {
        this._refreshUserInfo()
        wx.showToast({ title: '更新成功', icon: 'success' })
      })
      .catch((err) => {
        console.error('[MinePage] 更新用户信息失败:', err)
      })
  },

  /** 跳转会员中心 */
  goMemberCenter() {
    wx.navigateTo({ url: '/pages/member-center/member-center' })
  },

  /** 订单快捷入口 */
  onOrderTabTap(e) {
    const { key } = e.currentTarget.dataset
    if (!AuthUtil.requireLoginForAction('查看订单')) return
    wx.navigateTo({
      url: '/pages/order-list/order-list?status=' + key,
    })
  },

  /** 查看全部订单 */
  onViewAllOrders() {
    if (!AuthUtil.requireLoginForAction('查看订单')) return
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  /** 菜单项点击 */
  onMenuTap(e) {
    const { id } = e.currentTarget.dataset
    const menuItem = this.data.menuList.find((m) => m.id === id)
    if (!menuItem) return

    // 根据登录规则判断是否需要登录
    const requireLogin = LOGIN_RULES.mineMenuRequireLogin[id]
    if (requireLogin && !AuthUtil.requireLoginForAction(menuItem.title)) return

    if (id === 'contact') {
      const phone = this.data.servicePhone
        || (this.data.mineConfig && this.data.mineConfig.servicePhone) || ''
      if (phone) {
        wx.makePhoneCall({
          phoneNumber: String(phone),
          fail: () => wx.showToast({ title: '客服电话: ' + phone, icon: 'none', duration: 3000 }),
        })
      } else {
        wx.showToast({ title: '客服暂未配置', icon: 'none' })
      }
      return
    }

    if (menuItem.url) {
      wx.navigateTo({
        url: menuItem.url,
        fail() {
          wx.showToast({ title: '功能开发中', icon: 'none' })
        },
      })
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' })
    }
  },

  /** 退出登录 */
  onLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          AuthService.logout()
        }
      },
    })
  },
})
