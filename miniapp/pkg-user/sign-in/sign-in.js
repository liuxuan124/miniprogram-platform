// pkg-user/sign-in/sign-in.js — 每日签到页面
const memberService = require('../../services/member')
const { AuthUtil } = require('../../utils/auth')
const { buildWeekSignDays, buildSignInDays } = require('../../utils/sign-in-days')

Page({
  data: {
    memberInfo: null,
    continuousDays: 0,
    hasSignedIn: false,
    signInPoints: 10,
    weekDays: [],
    streakDays: [],
    loading: false,
  },

  onLoad() {
    if (!AuthUtil.requireLoginForAction('签到', {
      onSuccess: () => this._loadMemberInfo(),
    })) return
    this._loadMemberInfo()
  },

  onShow() {
    if (AuthUtil.isLoggedIn()) {
      this._loadMemberInfo()
    }
  },

  onPullDownRefresh() {
    this._loadMemberInfo().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  _loadMemberInfo() {
    return Promise.all([
      memberService.getMemberInfo(),
      memberService.getSignInStatus().catch(() => null),
    ])
      .then(([data, status]) => {
        const continuousDays = (status && status.streak != null)
          ? status.streak
          : (data.continuousSignDays || data.continuous_days || 0)
        const hasSignedIn = status
          ? !!(status.todaySigned || status.today_signed)
          : !!(data.todaySigned || data.has_signed_in)
        const streakDays = buildSignInDays({
          streak: continuousDays,
          todaySigned: hasSignedIn,
        })
        const weekDays = buildWeekSignDays(data.week_sign_in || data.weekSignIn || [])

        this.setData({
          memberInfo: data,
          continuousDays,
          hasSignedIn,
          signInPoints: data.sign_in_points || data.signInPoints || 10,
          weekDays,
          streakDays,
        })
      })
      .catch((err) => {
        console.error('[SignInPage] 获取会员信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onSignInTap() {
    if (this.data.hasSignedIn) {
      wx.showToast({ title: '今日已签到', icon: 'none' })
      return
    }
    if (this.data.loading) return
    this.setData({ loading: true })

    memberService.signIn()
      .then((data) => {
        const pointsEarned = data.earnedPoints || data.points_earned || 10
        const continuousDays = data.continuousSignDays || data.continuous_days || this.data.continuousDays + 1
        this.setData({
          hasSignedIn: true,
          continuousDays,
          loading: false,
        })
        this._loadMemberInfo()
        wx.showModal({
          title: '签到成功',
          content: `恭喜获得 ${pointsEarned} 积分！已连续签到 ${continuousDays} 天`,
          showCancel: false,
          confirmText: '太棒了',
        })
      })
      .catch((err) => {
        this.setData({ loading: false })
        console.error('[SignInPage] 签到失败:', err)
        wx.showToast({ title: '签到失败，请重试', icon: 'none' })
      })
  },

  onViewPointsLog() {
    wx.navigateTo({ url: '/pkg-user/points-log/points-log' })
  },
})
