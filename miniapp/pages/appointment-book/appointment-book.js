// pages/appointment-book/appointment-book.js — 预约下单页
// 选择时段 + 填写联系信息 + 提交预约

const appointmentService = require('../../services/appointment')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    // 服务信息
    serviceId: '',
    serviceInfo: null,

    // 日期选择
    dates: [],         // 可选日期列表 [{ date, label, weekday, disabled }]
    selectedDate: '',  // 选中的日期 YYYY-MM-DD

    // 时段选择
    slots: [],         // 可用时段 [{ start_time, end_time, available, label }]
    selectedSlot: '',  // 选中的时段标识

    // 联系信息
    contactName: '',
    contactPhone: '',
    remark: '',

    // 提交状态
    submitting: false,
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }

    this.setData({ serviceId: id })
    this._initDates()
    this._loadServiceInfo(id)
  },

  /** 初始化可选日期（未来7天） */
  _initDates() {
    const dates = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const dateStr = this._formatDate(d)
      const weekday = weekDays[d.getDay()]

      dates.push({
        date: dateStr,
        label: i === 0 ? '今天' : i === 1 ? '明天' : `${d.getMonth() + 1}/${d.getDate()}`,
        weekday: weekday,
        disabled: false,
      })
    }

    this.setData({
      dates,
      selectedDate: dates[0].date,
    })

    // 加载第一天的时段
    this._loadSlots(dates[0].date)
  },

  /** 加载服务信息 */
  _loadServiceInfo(id) {
    appointmentService.getAppointmentServices({ id })
      .then((res) => {
        // 如果返回的是列表，找到对应ID的服务
        const list = res.list || res.items || []
        const service = list.find((s) => s.id == id) || list[0] || res
        if (service && service.name) {
          this.setData({ serviceInfo: service })
          wx.setNavigationBarTitle({ title: service.name })
        }
      })
      .catch(() => {
        // 服务信息加载失败不影响核心流程
      })
  },

  /** 加载可用时段 */
  _loadSlots(date) {
    this.setData({ slots: [], selectedSlot: '' })

    appointmentService.getAvailableSlots(this.data.serviceId, { date })
      .then((res) => {
        const slots = res.slots || res.list || res.items || res || []
        // 为每个时段添加 label
        const formattedSlots = slots.map((slot) => ({
          ...slot,
          label: slot.label || `${slot.start_time || slot.start} - ${slot.end_time || slot.end}`,
          start_time: slot.start_time || slot.start,
          end_time: slot.end_time || slot.end,
          available: slot.available !== false && (slot.remaining === undefined || slot.remaining > 0),
        }))
        this.setData({ slots: formattedSlots })
      })
      .catch(() => {
        this.setData({ slots: [] })
        wx.showToast({ title: '获取时段失败', icon: 'none' })
      })
  },

  /** 选择日期 */
  onDateTap(e) {
    const date = e.currentTarget.dataset.date
    const disabled = e.currentTarget.dataset.disabled
    if (disabled) return

    this.setData({ selectedDate: date, selectedSlot: '' })
    this._loadSlots(date)
  },

  /** 选择时段 */
  onSlotTap(e) {
    const index = e.currentTarget.dataset.index
    const slot = this.data.slots[index]
    if (!slot || !slot.available) {
      wx.showToast({ title: '该时段不可预约', icon: 'none' })
      return
    }
    this.setData({ selectedSlot: index })
  },

  /** 联系人姓名输入 */
  onNameInput(e) {
    this.setData({ contactName: e.detail.value })
  },

  /** 联系人电话输入 */
  onPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value })
  },

  /** 备注输入 */
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  /** 提交预约 */
  onSubmitBook() {
    if (!AuthUtil.requireLoginForAction('预约服务')) return
    if (this.data.submitting) return

    // 验证
    if (!this.data.selectedDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' })
      return
    }
    if (this.data.selectedSlot === '') {
      wx.showToast({ title: '请选择时段', icon: 'none' })
      return
    }
    if (!this.data.contactName.trim()) {
      wx.showToast({ title: '请输入联系人姓名', icon: 'none' })
      return
    }
    if (!this.data.contactPhone.trim()) {
      wx.showToast({ title: '请输入联系电话', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(this.data.contactPhone.trim())) {
      wx.showToast({ title: '手机号格式不正确', icon: 'none' })
      return
    }

    const slot = this.data.slots[this.data.selectedSlot]
    const data = {
      service_id: this.data.serviceId,
      date: this.data.selectedDate,
      slot: {
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
      contact_name: this.data.contactName.trim(),
      contact_phone: this.data.contactPhone.trim(),
      remark: this.data.remark.trim(),
    }

    this.setData({ submitting: true })

    appointmentService.createAppointment(data)
      .then((res) => {
        this.setData({ submitting: false })
        const appointmentId = res.appointment_id || res.id
        wx.showToast({ title: '预约成功', icon: 'success' })
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/my-appointments/my-appointments?highlight=${appointmentId}`,
          })
        }, 1500)
      })
      .catch(() => {
        this.setData({ submitting: false })
        wx.showToast({ title: '预约失败', icon: 'none' })
      })
  },

  /** 格式化日期 YYYY-MM-DD */
  _formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
})
