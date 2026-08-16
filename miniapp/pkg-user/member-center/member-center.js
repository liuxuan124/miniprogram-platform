const { getMemberInfo, signIn, getSignInStatus } = require('../../services/member')
const { AuthUtil } = require('../../utils/auth')
const { buildSignInDays } = require('../../utils/sign-in-days')

function pickLocalUser() {
  const app = getApp()
  const local = AuthUtil.getUserInfo()
    || (app && app.globalData && app.globalData.userInfo)
    || {}
  return {
    nickName: local.nickName || local.nickname || '',
    nickname: local.nickName || local.nickname || '',
    avatarUrl: local.avatarUrl || '',
    phone: local.phone || '',
  }
}

function normalizeMember(raw) {
  const data = raw || {}
  const points = Number(
    data.points != null ? data.points
      : (data.totalPoints != null ? data.totalPoints
        : (data.total_points != null ? data.total_points : 0))
  ) || 0
  return {
    ...data,
    levelName: data.levelName || data.level_name || '普通会员',
    levelCode: data.levelCode || data.level_code || '',
    points,
    totalPoints: points,
    couponCount: data.couponCount != null
      ? data.couponCount
      : (data.unusedCouponCount != null ? data.unusedCouponCount : (data.unused_coupon_count || 0)),
    orderCount: data.orderCount || data.order_count || 0,
    nickname: data.nickname || data.nickName || '',
    avatarUrl: data.avatarUrl || data.avatar_url || '',
  }
}

/** 按积分计算升级进度（当前档 → 下一档） */
function calcUpgradeByPoints(points, levelList) {
  const list = levelList || []
  const currentPoints = Math.max(0, Number(points) || 0)
  if (!list.length) {
    return {
      currentLevelName: '普通会员',
      nextLevelName: '',
      currentPoints,
      targetPoints: 0,
      neededPoints: 0,
      progress: 100,
      progressWidth: '100%',
      tip: '已达最高等级',
    }
  }

  let currentIndex = 0
  for (let i = 0; i < list.length; i++) {
    if (currentPoints >= (Number(list[i].minPoints) || 0)) currentIndex = i
  }

  const currentLevel = list[currentIndex]
  if (currentIndex >= list.length - 1) {
    return {
      currentLevelName: currentLevel.name,
      nextLevelName: '',
      currentPoints,
      targetPoints: currentPoints,
      neededPoints: 0,
      progress: 100,
      progressWidth: '100%',
      tip: '已达最高等级',
      levelCode: currentLevel.code,
    }
  }

  const nextLevel = list[currentIndex + 1]
  const start = Number(currentLevel.minPoints) || 0
  const target = Number(nextLevel.minPoints) || (start + 1)
  const range = Math.max(target - start, 1)
  const earned = Math.max(currentPoints - start, 0)
  const progress = Math.min(100, Math.max(0, Math.round((earned / range) * 100)))
  const neededPoints = Math.max(target - currentPoints, 0)

  return {
    currentLevelName: currentLevel.name,
    nextLevelName: nextLevel.name,
    currentPoints,
    targetPoints: target,
    neededPoints,
    progress,
    progressWidth: `${progress}%`,
    tip: neededPoints > 0
      ? `已有 ${currentPoints} 积分，还需 ${neededPoints} 积分升级至${nextLevel.name}`
      : `已达到${nextLevel.name}`,
    levelCode: currentLevel.code,
  }
}

Page({
  data: {
    userInfo: {
      nickName: '',
      nickname: '',
      avatarUrl: '',
      displayName: '微信用户',
    },
    memberInfo: {
      levelName: '普通会员',
      levelCode: '',
      points: 0,
      totalPoints: 0,
      couponCount: 0,
      orderCount: 0,
    },
    upgradeInfo: {
      nextLevelName: '银卡会员',
      neededPoints: 500,
      progress: 0,
      progressWidth: '0%',
      currentPoints: 0,
      targetPoints: 500,
      tip: '加载中…',
    },
    signInStatus: {
      todaySigned: false,
      streak: 0,
    },
    signInDays: [],
    benefitList: [
      { name: '全场好物折扣', icon: '🎁', bgColor: 'linear-gradient(135deg, #eef2ff, #dfe6ff)', desc: '当前等级权益' },
      { name: '积分加速', icon: '⚡', bgColor: 'linear-gradient(135deg, #fff2ee, #ffe4d9)', desc: '成长值翻倍进度' },
      { name: '优先发货', icon: '🚚', bgColor: 'linear-gradient(135deg, #e7f5ea, #d1fae5)', desc: '热销品优先安排' },
      { name: '专属客服通道', icon: '💬', bgColor: 'linear-gradient(135deg, #fef3c7, #fde68a)', desc: '工作日优先响应' },
    ],
    levelList: [
      { code: 'lv1', name: '普通会员', icon: '🌱', minPoints: 0, benefits: ['基础积分', '公开内容'] },
      { code: 'lv2', name: '银卡会员', icon: '📘', minPoints: 500, benefits: ['9.5折好物', '专属专题'] },
      { code: 'lv3', name: '金卡会员', icon: '👑', minPoints: 1200, benefits: ['9折', '成长加速'] },
      { code: 'lv4', name: '钻石会员', icon: '💎', minPoints: 2000, benefits: ['9折', '季度礼遇'] },
    ],
  },

  onLoad() {
    this._syncLocalUser()
    if (!AuthUtil.requireLoginForAction('查看会员', {
      onSuccess: () => this._loadPageData(),
    })) return
    this._loadPageData()
  },

  _loadPageData() {
    this._syncLocalUser()
    this.fetchMemberInfo()
    this.fetchSignInStatus()
  },

  onShow() {
    this._syncLocalUser()
    if (AuthUtil.isLoggedIn()) {
      this.fetchMemberInfo()
      this.fetchSignInStatus()
    }
  },

  _syncLocalUser() {
    const local = pickLocalUser()
    const displayName = local.nickName || '微信用户'
    this.setData({
      userInfo: {
        ...local,
        displayName,
      },
    })
  },

  _mergeUserInfo(member) {
    const local = pickLocalUser()
    const nick = (member && member.nickname) || local.nickName || ''
    const avatarUrl = (member && member.avatarUrl) || local.avatarUrl || ''
    const displayName = (nick && nick !== '未登录') ? nick : (local.nickName || '微信用户')
    return {
      nickName: nick || displayName,
      nickname: nick || displayName,
      avatarUrl,
      displayName,
      phone: local.phone || '',
    }
  },

  async fetchMemberInfo() {
    try {
      const raw = await getMemberInfo()
      if (!raw) {
        this._syncLocalUser()
        return
      }
      const memberInfo = normalizeMember(raw)
      const userInfo = this._mergeUserInfo(memberInfo)
      const upgrade = calcUpgradeByPoints(memberInfo.points, this.data.levelList)
      memberInfo.levelCode = upgrade.levelCode || memberInfo.levelCode
      // 展示名优先用档位表，避免后端空档名
      if (!memberInfo.levelName || memberInfo.levelName === '普通会员') {
        memberInfo.levelName = upgrade.currentLevelName || memberInfo.levelName
      }
      this.setData({
        memberInfo,
        userInfo,
        upgradeInfo: {
          nextLevelName: upgrade.nextLevelName,
          neededPoints: upgrade.neededPoints,
          progress: upgrade.progress,
          progressWidth: upgrade.progressWidth,
          currentPoints: upgrade.currentPoints,
          targetPoints: upgrade.targetPoints,
          tip: upgrade.tip,
        },
      })
    } catch (err) {
      console.error('获取会员信息失败', err)
      this._syncLocalUser()
    }
  },

  calcUpgradeInfo(memberInfo) {
    const upgrade = calcUpgradeByPoints(
      (memberInfo && memberInfo.points) || this.data.memberInfo.points,
      this.data.levelList
    )
    this.setData({
      upgradeInfo: {
        nextLevelName: upgrade.nextLevelName,
        neededPoints: upgrade.neededPoints,
        progress: upgrade.progress,
        progressWidth: upgrade.progressWidth,
        currentPoints: upgrade.currentPoints,
        targetPoints: upgrade.targetPoints,
        tip: upgrade.tip,
      },
      'memberInfo.levelCode': upgrade.levelCode || '',
      'memberInfo.levelName': (memberInfo && memberInfo.levelName) || upgrade.currentLevelName,
    })
  },

  async fetchSignInStatus() {
    try {
      const status = await getSignInStatus() || {}
      const normalized = {
        todaySigned: !!(status.todaySigned || status.today_signed),
        streak: status.streak != null
          ? status.streak
          : (status.continuousSignDays || status.continuous_sign_days || 0),
      }
      this.setData({ signInStatus: normalized })
      this.setData({ signInDays: buildSignInDays(normalized) })
    } catch (err) {
      console.error('获取签到状态失败', err)
    }
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
    wx.navigateTo({ url: '/pkg-user/points-log/points-log' })
  },

  goCouponList() {
    wx.navigateTo({ url: '/pkg-user/coupon-list/coupon-list' })
  },

  goOrderList() {
    wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
  },

  goAddressList() {
    wx.navigateTo({ url: '/pkg-user/address-list/address-list' })
  },

  goReservation() {
    wx.navigateTo({ url: '/pkg-user/my-appointments/my-appointments' })
  },

  goActivity() {
    wx.navigateTo({ url: '/pkg-extra/activity-list/activity-list' })
  },

  goFavorites() {
    wx.navigateTo({ url: '/pkg-user/favorites/favorites' })
  },

  goPrivilege() {
    wx.pageScrollTo({ selector: '.benefits-section', duration: 300 })
  },

  goPointsExchange() {
    wx.navigateTo({ url: '/pkg-user/coupon-list/coupon-list' })
  },

  goSignIn() {
    wx.navigateTo({ url: '/pkg-user/sign-in/sign-in' })
  },
})
