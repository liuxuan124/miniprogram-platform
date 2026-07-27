const { getMemberInfo, signIn, getSignInStatus } = require('../../services/member')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    userInfo: {},
    memberInfo: {
      levelName: '普通会员',
      levelCode: 'normal',
      points: 0,
      totalPoints: 0,
      couponCount: 0,
      orderCount: 0,
    },
    upgradeInfo: {
      nextLevelName: '银卡会员',
      neededPoints: 500,
      progress: 0,
    },
    signInStatus: {
      todaySigned: false,
      streak: 0,
    },
    signInDays: [],
    benefitList: [
      { name: '全场资料包折扣', icon: '📘', bgColor: 'linear-gradient(135deg, #eef2ff, #dfe6ff)', desc: '当前等级权益' },
      { name: '积分加速', icon: '⚡', bgColor: 'linear-gradient(135deg, #fff2ee, #ffe4d9)', desc: '成长值翻倍进度' },
      { name: '优先预约咨询', icon: '🗓️', bgColor: 'linear-gradient(135deg, #e7f5ea, #d1fae5)', desc: '热门时段优先' },
      { name: '专属客服通道', icon: '💬', bgColor: 'linear-gradient(135deg, #fef3c7, #fde68a)', desc: '工作日优先响应' },
    ],
    levelList: [
      { code: 'lv1', name: 'LV.1 新人', icon: '🌱', minPoints: 0, benefits: ['基础积分', '公开内容'] },
      { code: 'lv2', name: 'LV.2 进阶', icon: '📘', minPoints: 500, benefits: ['9.5折资料包', '专属专题'] },
      { code: 'lv3', name: 'LV.3 高级', icon: '👑', minPoints: 1200, benefits: ['9折', '成长加速'] },
      { code: 'lv4', name: 'LV.4 资深', icon: '💎', minPoints: 2000, benefits: ['9折', '季度 1v1'] },
    ],
  },

  onLoad() {
    if (!AuthUtil.requireLoginForAction('查看会员')) return
    this.fetchMemberInfo()
    this.fetchSignInStatus()
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    this.fetchMemberInfo()
  },

  async fetchMemberInfo() {
    try {
      const memberInfo = await getMemberInfo()
      if (memberInfo) {
        this.setData({
          memberInfo,
          userInfo: memberInfo.user || {},
        })
        this.calcUpgradeInfo(memberInfo)
      }
    } catch (err) {
      console.error('获取会员信息失败', err)
    }
  },

  calcUpgradeInfo(memberInfo) {
    const levelList = this.data.levelList
    const currentCode = memberInfo.levelCode || 'normal'
    const currentPoints = memberInfo.totalPoints || 0
    const currentIndex = levelList.findIndex(item => item.code === currentCode)

    if (currentIndex >= levelList.length - 1) {
      this.setData({
        upgradeInfo: {
          nextLevelName: '',
          neededPoints: 0,
          progress: 100,
        },
      })
      return
    }

    const currentLevel = levelList[currentIndex]
    const nextLevel = levelList[currentIndex + 1]
    const rangeStart = currentLevel.minPoints
    const rangeEnd = nextLevel.minPoints
    const range = rangeEnd - rangeStart
    const earned = currentPoints - rangeStart
    const progress = Math.min(Math.max(Math.round((earned / range) * 100), 0), 100)
    const neededPoints = Math.max(rangeEnd - currentPoints, 0)

    this.setData({
      upgradeInfo: {
        nextLevelName: nextLevel.name,
        neededPoints,
        progress,
      },
    })
  },

  async fetchSignInStatus() {
    try {
      const status = await getSignInStatus() || {}
      this.setData({ signInStatus: status })
      this.buildSignInDays(status)
    } catch (err) {
      console.error('获取签到状态失败', err)
    }
  },

  buildSignInDays(status) {
    const days = []
    const pointsList = [5, 10, 15, 20, 25, 30, 50]
    const streak = status.streak || 0
    const todaySigned = status.todaySigned || false

    for (let i = 0; i < 7; i++) {
      days.push({
        day: i + 1,
        points: pointsList[i],
        signed: i < streak,
        today: i === streak,
      })
    }
    this.setData({ signInDays: days })
  },

  async handleSignIn() {
    if (this.data.signInStatus.todaySigned) return
    try {
      await signIn()
      wx.showToast({ title: '签到成功', icon: 'success' })
      this.fetchSignInStatus()
      this.fetchMemberInfo()
    } catch (err) {
      wx.showToast({ title: '签到失败', icon: 'none' })
    }
  },

  goPointsLog() {
    wx.navigateTo({ url: '/pages/points-log/points-log' })
  },

  goCouponList() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' })
  },

  goOrderList() {
    wx.navigateTo({ url: '/pages/order-list/order-list' })
  },

  goAddressList() {
    wx.navigateTo({ url: '/pages/address-list/address-list' })
  },

  goReservation() {
    wx.navigateTo({ url: '/pages/my-appointments/my-appointments' })
  },

  goActivity() {
    wx.navigateTo({ url: '/pages/activity-list/activity-list' })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  goPrivilege() {
    wx.pageScrollTo({ selector: '.benefits-section', duration: 300 })
  },

  goPointsExchange() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' })
  },

  goSignIn() {
    wx.navigateTo({ url: '/pages/sign-in/sign-in' })
  },
})
