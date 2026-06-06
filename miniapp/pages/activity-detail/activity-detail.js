// pages/activity-detail/activity-detail.js — 活动详情页
// 活动详情展示、报名表单提交

const request = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    activityId: '',
    activity: {},
    loading: true,
    submitting: false,

    // 场次选择
    sessions: [],
    selectedSession: '',

    // 表单数据
    formName: '',
    formPhone: '',
    formRemark: '',
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

  /** 姓名输入 */
  onNameInput(e) {
    this.setData({ formName: e.detail.value })
  },

  /** 手机号输入 */
  onPhoneInput(e) {
    this.setData({ formPhone: e.detail.value })
  },

  /** 备注输入 */
  onRemarkInput(e) {
    this.setData({ formRemark: e.detail.value })
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
    if (!/^1[3-9]\d{9}$/.test(this.data.formPhone.trim())) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    this.setData({ submitting: true })

    const session = this.data.sessions[this.data.selectedSession]
    request.post(`/api/v1/mp/activities/${this.data.activityId}/signup`, {
      name: this.data.formName.trim(),
      phone: this.data.formPhone.trim(),
      session: session ? session.name : '',
      remark: this.data.formRemark,
    }, { auth: false, loading: true, loadingText: '提交中...' })
      .then(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '报名成功', icon: 'success' })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
      })
      .catch(() => {
        this.setData({ submitting: false })
      })
  },
})
