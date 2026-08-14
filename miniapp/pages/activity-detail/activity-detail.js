// pages/activity-detail/activity-detail.js — 活动详情页
// 活动详情展示、短信报名、个人签到二维码

const request = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')
const qrcode = require('../../utils/qrcode')

const SMS_SCENE = 'activity_signup'
const PHONE_RE = /^1[3-9]\d{9}$/
const QR_CANVAS_SIZE = 200

Page({
  ...createSharePageConfig(),
  data: {
    activityId: '',
    activity: {},
    loading: true,
    submitting: false,

    sessions: [],
    selectedSession: '',

    formName: '',
    formPhone: '',
    formSmsCode: '',
    formRemark: '',

    smsCountdown: 0,
    smsSending: false,

    signedUp: false,
    mySignup: null,
    checkInVerified: false,
    qrCanvasSize: QR_CANVAS_SIZE,
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ activityId: id })
    this._loadActivityDetail(id)
  },

  onShow() {
    if (this.data.activityId) {
      this._loadMySignup()
    }
  },

  onUnload() {
    this._clearSmsTimer()
  },

  /** 加载活动详情 */
  _loadActivityDetail(id) {
    this.setData({ loading: true })

    request.get(`/api/v1/mp/activities/${id}`, {}, { auth: false })
      .then((activity) => {
        const progress = activity.quota ? Math.min(100, Math.round((activity.signed || 0) * 100 / activity.quota)) : 0
        const normalized = {
          ...activity,
          type_label: activity.type === 'booking' ? '预约服务' : '活动报名',
          progress,
          full: activity.quota ? (activity.signed || 0) >= activity.quota : false,
          cover_color: activity.cover ? '' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
          cover_icon: '🎪',
          sessions: activity.sessions || [],
        }
        this.setData({
          activity: normalized,
          sessions: normalized.sessions || [],
          loading: false,
        })
        wx.setNavigationBarTitle({ title: normalized.name })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '活动不存在', icon: 'none' })
      })
  },

  /** 已登录则刷新我的报名；未报名保持表单 */
  _loadMySignup() {
    if (!this.data.activityId || !AuthUtil.isLoggedIn()) {
      return
    }
    request.get(`/api/v1/mp/activities/${this.data.activityId}/my-signup`, {}, { showError: false })
      .then((signup) => {
        this._applySignup(signup)
      })
      .catch(() => {})
  },

  _applySignup(signup) {
    if (!signup || !signup.id) {
      this.setData({ signedUp: false, mySignup: null, checkInVerified: false })
      return
    }
    const approved = signup.status === 'approved' && !!signup.checkInCode
    this.setData({
      signedUp: true,
      mySignup: signup,
      checkInVerified: signup.checkInStatus === 'VERIFIED',
    }, () => {
      if (approved) {
        this._drawCheckInQr(signup.checkInCode)
      }
    })
  },

  _drawCheckInQr(checkInCode) {
    const payload = qrcode.buildCheckInQrPayload(checkInCode)
    const draw = () => {
      const ctx = wx.createCanvasContext('checkinQr', this)
      qrcode.drawQrcode(ctx, payload, { size: QR_CANVAS_SIZE })
    }
    wx.nextTick(() => {
      setTimeout(draw, 50)
    })
  },

  /** 选择场次 */
  onSessionTap(e) {
    const index = e.currentTarget.dataset.index
    const session = this.data.sessions[index]
    if (session.full) {
      wx.showToast({ title: '该场次已满', icon: 'none' })
      return
    }
    this.setData({ selectedSession: index })
  },

  onNameInput(e) {
    this.setData({ formName: e.detail.value })
  },

  onPhoneInput(e) {
    this.setData({ formPhone: e.detail.value })
  },

  onSmsCodeInput(e) {
    this.setData({ formSmsCode: e.detail.value })
  },

  onRemarkInput(e) {
    this.setData({ formRemark: e.detail.value })
  },

  /** 获取报名验证码 */
  onSendSms() {
    if (!AuthUtil.requireLoginForAction('报名活动')) return
    if (this.data.smsCountdown > 0 || this.data.smsSending) return

    const phone = (this.data.formPhone || '').trim()
    if (!PHONE_RE.test(phone)) {
      wx.showToast({ title: '请先输入正确手机号', icon: 'none' })
      return
    }

    this.setData({ smsSending: true })
    request.post('/api/v1/mp/sms/send', { phone, scene: SMS_SCENE }, { loading: true, loadingText: '发送中...' })
      .then(() => {
        this.setData({ smsSending: false })
        wx.showToast({ title: '验证码已发送', icon: 'none' })
        this._startSmsCountdown()
      })
      .catch(() => {
        this.setData({ smsSending: false })
      })
  },

  _startSmsCountdown() {
    this._clearSmsTimer()
    this.setData({ smsCountdown: 60 })
    this._smsTimer = setInterval(() => {
      const next = this.data.smsCountdown - 1
      if (next <= 0) {
        this._clearSmsTimer()
        this.setData({ smsCountdown: 0 })
        return
      }
      this.setData({ smsCountdown: next })
    }, 1000)
  },

  _clearSmsTimer() {
    if (this._smsTimer) {
      clearInterval(this._smsTimer)
      this._smsTimer = null
    }
  },

  /** 提交报名 */
  onSubmitSignup() {
    if (!AuthUtil.requireLoginForAction('报名活动')) return
    if (this.data.submitting) return

    if (this.data.sessions.length > 0 && this.data.selectedSession === '') {
      wx.showToast({ title: '请选择场次', icon: 'none' })
      return
    }
    if (!this.data.formName.trim()) {
      wx.showToast({ title: '请输入姓名', icon: 'none' })
      return
    }
    if (!this.data.formPhone.trim()) {
      wx.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!PHONE_RE.test(this.data.formPhone.trim())) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }
    if (!this.data.formSmsCode.trim()) {
      wx.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const session = this.data.sessions[this.data.selectedSession]
    request.post(`/api/v1/mp/activities/${this.data.activityId}/signup`, {
      name: this.data.formName.trim(),
      phone: this.data.formPhone.trim(),
      session: session ? session.name : '',
      smsCode: this.data.formSmsCode.trim(),
      remark: this.data.formRemark,
    }, { loading: true, loadingText: '提交中...' })
      .then((signup) => {
        this.setData({ submitting: false })
        wx.showToast({ title: '报名成功', icon: 'success' })
        this._applySignup(signup)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  },
})
