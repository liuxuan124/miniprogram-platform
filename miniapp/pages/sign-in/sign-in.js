// pages/sign-in/sign-in.js — 每日签到页面
const memberService = require('../../services/member')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    memberInfo: null,
    continuousDays: 0,       // 连续签到天数
    hasSignedIn: false,      // 今日是否已签到
    signInPoints: 0,         // 签到获得积分
    weekDays: [],            // 本周签到状态
    loading: false,
  },

  onLoad() {
    if (!AuthUtil.requireLoginForAction('签到')) return
    this._loadMemberInfo()
  },

  onShow() {
    this._loadMemberInfo()
  },

  /** 下拉刷新 */
  onPullDownRefresh() {
    this._loadMemberInfo().then(() => {
      wx.stopPullDownRefresh()
    })
  },

  /** 加载会员信息 */
  _loadMemberInfo() {
    return memberService.getMemberInfo()
      .then((data) => {
        const continuousDays = data.continuous_days || 0
        const hasSignedIn = data.has_signed_in || false
        const weekDays = this._buildWeekDays(data.week_sign_in || [], continuousDays)

        this.setData({
          memberInfo: data,
          continuousDays,
          hasSignedIn,
          signInPoints: data.sign_in_points || 10,
          weekDays,
        })
      })
      .catch((err) => {
        console.error('[SignInPage] 获取会员信息失败:', err)
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 构建本周签到状态 */
  _buildWeekDays(weekSignIn, continuousDays) {
    const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
    const today = new Date().getDay() // 0=周日
    const todayIndex = today === 0 ? 6 : today - 1 // 转为 0=周一

    return dayLabels.map((label, index) => {
      const isToday = index === todayIndex
      const isSigned = weekSignIn ? weekSignIn.includes(index + 1) : false
      const isPast = index < todayIndex

      return {
        label: '周' + label,
        isToday,
        isSigned,
        isPast,
        status: isSigned ? 'signed' : (isToday ? 'today' : (isPast ? 'missed' : 'future')),
      }
    })
  },

  /** 签到操作 */
  onSignInTap() {
    if (this.data.hasSignedIn) {
      wx.showToast({ title: '今日已签到', icon: 'none' })
      return
    }

    if (this.data.loading) return
    this.setData({ loading: true })

    memberService.signIn()
      .then((data) => {
        const pointsEarned = data.points_earned || 0
        const continuousDays = data.continuous_days || this.data.continuousDays + 1

        this.setData({
          hasSignedIn: true,
          continuousDays,
          loading: false,
        })

        // 刷新会员信息以更新周签到状态
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

  /** 查看积分记录 */
  onViewPointsLog() {
    wx.navigateTo({ url: '/pages/points-log/points-log' })
  },
})
