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
      { name: '全年9折优惠', icon: '⭐', bgColor: 'linear-gradient(135deg, #fef3c7, #fed7aa)', desc: '金卡会员专享' },
      { name: '积分加速翻倍', icon: '⭐', bgColor: 'linear-gradient(135deg, #fef3c7, #fed7aa)', desc: '金卡会员专享' },
      { name: '专属活动优先报名', icon: '⭐', bgColor: 'linear-gradient(135deg, #fef3c7, #fed7aa)', desc: '金卡会员专享' },
      { name: '生日双倍积分', icon: '⭐', bgColor: 'linear-gradient(135deg, #fef3c7, #fed7aa)', desc: '金卡会员专享' },
      { name: '专属客服通道', icon: '⭐', bgColor: 'linear-gradient(135deg, #fef3c7, #fed7aa)', desc: '金卡会员专享' },
    ],
    levelList: [
      { code: 'normal', name: '普通会员', icon: '🥉', minPoints: 0, benefits: ['基础积分'] },
      { code: 'silver', name: '银卡会员', icon: '🥈', minPoints: 500, benefits: ['1.2倍积分', '生日礼包'] },
      { code: 'gold', name: '金卡会员', icon: '🥇', minPoints: 2000, benefits: ['1.5倍积分', '专属折扣', '优先客服'] },
      { code: 'diamond', name: '钻石会员', icon: '💎', minPoints: 5000, benefits: ['2倍积分', '免运费', '新品优先', '专属客服'] },
    ],
  },

  onLoad() {
    if (!AuthUtil.requireLoginForAction('查看会员')) return
    this.fetchMemberInfo()
    this.fetchSignInStatus()
  },

  onShow() {
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
    wx.navigateTo({ url: '/pages/reservation/reservation' })
  },

  goActivity() {
    wx.navigateTo({ url: '/pages/activity/activity' })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pages/favorites/favorites' })
  },

  goPrivilege() {
    wx.navigateTo({ url: '/pages/privilege/privilege' })
  },

  goPointsExchange() {
    wx.navigateTo({ url: '/pages/points-log/points-log' })
  },

  goSignIn() {
    wx.navigateTo({ url: '/pages/sign-in/sign-in' })
  },
})
