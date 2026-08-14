// pages/appointment-book/appointment-book.js — 预约：短信校验 + 正确字段提交

const appointmentService = require('../../services/appointment')
const request = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')

Page({
  data: {
    serviceId: '',
    serviceInfo: null,
    dates: [],
    selectedDate: '',
    slots: [],
    selectedSlot: '',
    selectedSlotLabel: '',
    contactName: '',
    contactPhone: '',
    smsCode: '',
    smsCountdown: 0,
    remark: '',
    bookStep: 1,
    priceLabel: '免费',
    submitting: false,
  },

  _smsTimer: null,

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

  onUnload() {
    if (this._smsTimer) clearInterval(this._smsTimer)
  },

  _initDates() {
    const dates = []
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      dates.push({
        date: this._formatDate(d),
        label: i === 0 ? '今天' : i === 1 ? '明天' : `${d.getMonth() + 1}/${d.getDate()}`,
        weekday: weekDays[d.getDay()],
        disabled: false,
      })
    }
    this.setData({ dates, selectedDate: dates[0].date })
    this._loadSlots(dates[0].date)
  },

  _loadServiceInfo(id) {
    appointmentService.getAppointmentServices({ current: 1, size: 50 })
      .then((res) => {
        const list = res.records || res.list || res.items || []
        const service = list.find((s) => String(s.id) === String(id)) || (res.id ? res : null)
        if (service && service.name) {
          const price = Number(service.price)
          this.setData({
            serviceInfo: service,
            priceLabel: !price ? '免费' : `¥${price}`,
          })
          wx.setNavigationBarTitle({ title: service.name })
        }
      })
      .catch(() => {})
  },

  _loadSlots(date) {
    this.setData({ slots: [], selectedSlot: '' })
    appointmentService.getAvailableSlots(this.data.serviceId, { date })
      .then((res) => {
        const raw = res.records || res.slots || res.list || res.items || res || []
        const slots = (Array.isArray(raw) ? raw : []).map((slot) => {
          const start = slot.startTime || slot.start_time || slot.start || ''
          const end = slot.endTime || slot.end_time || slot.end || ''
          const booked = Number(slot.bookedCount ?? slot.booked_count ?? 0)
          const max = Number(slot.maxCapacity ?? slot.capacity ?? slot.max_capacity ?? 0)
          const available =
            slot.available !== false &&
            Number(slot.status ?? 1) === 1 &&
            (max <= 0 || booked < max)
          return {
            ...slot,
            id: slot.id,
            label: slot.label || `${start} - ${end}`,
            start_time: start,
            end_time: end,
            available,
          }
        })
        this.setData({ slots })
      })
      .catch(() => {
        this.setData({ slots: [] })
        wx.showToast({ title: '获取时段失败', icon: 'none' })
      })
  },

  onDateTap(e) {
    if (e.currentTarget.dataset.disabled) return
    const date = e.currentTarget.dataset.date
    this.setData({ selectedDate: date, selectedSlot: '' })
    this._loadSlots(date)
  },

  onSlotTap(e) {
    const index = e.currentTarget.dataset.index
    const slot = this.data.slots[index]
    if (!slot || !slot.available) {
      wx.showToast({ title: '该时段不可预约', icon: 'none' })
      return
    }
    this.setData({ selectedSlot: index, selectedSlotLabel: slot.label || '' })
  },

  onNameInput(e) {
    this.setData({ contactName: e.detail.value })
  },
  onPhoneInput(e) {
    this.setData({ contactPhone: e.detail.value })
  },
  onSmsCodeInput(e) {
    this.setData({ smsCode: e.detail.value })
  },
  onRemarkInput(e) {
    this.setData({ remark: e.detail.value })
  },

  onSendSms() {
    if (!AuthUtil.requireLoginForAction('获取验证码')) return
    if (this.data.smsCountdown > 0) return
    const phone = (this.data.contactPhone || '').trim()
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      wx.showToast({ title: '请先填写正确手机号', icon: 'none' })
      return
    }
    request
      .post('/api/v1/mp/sms/send', { phone, scene: 'appointment_book' })
      .then(() => {
        wx.showToast({ title: '验证码已发送', icon: 'none' })
        this.setData({ smsCountdown: 60 })
        if (this._smsTimer) clearInterval(this._smsTimer)
        this._smsTimer = setInterval(() => {
          const n = this.data.smsCountdown - 1
          if (n <= 0) {
            clearInterval(this._smsTimer)
            this._smsTimer = null
            this.setData({ smsCountdown: 0 })
          } else {
            this.setData({ smsCountdown: n })
          }
        }, 1000)
      })
      .catch((err) => {
        wx.showToast({ title: (err && err.message) || '发送失败', icon: 'none' })
      })
  },

  onPrevStep() {
    if (this.data.bookStep > 1) this.setData({ bookStep: this.data.bookStep - 1 })
  },

  onNextOrSubmit() {
    const step = this.data.bookStep
    if (step === 1) {
      if (!this.data.selectedDate) {
        wx.showToast({ title: '请选择日期', icon: 'none' })
        return
      }
      if (this.data.selectedSlot === '') {
        wx.showToast({ title: '请选择时段', icon: 'none' })
        return
      }
      this.setData({ bookStep: 2 })
      return
    }
    if (step === 2) {
      if (!this.data.contactName.trim()) {
        wx.showToast({ title: '请输入姓名', icon: 'none' })
        return
      }
      if (!/^1[3-9]\d{9}$/.test(this.data.contactPhone.trim())) {
        wx.showToast({ title: '手机号格式不正确', icon: 'none' })
        return
      }
      if (!this.data.smsCode.trim()) {
        wx.showToast({ title: '请输入验证码', icon: 'none' })
        return
      }
      const price = Number((this.data.serviceInfo && this.data.serviceInfo.price) || 0)
      this.setData({
        bookStep: 3,
        priceLabel: !price ? '免费' : `¥${price}`,
      })
      return
    }
    this.onSubmitBook()
  },

  onSubmitBook() {
    if (!AuthUtil.requireLoginForAction('预约服务')) return
    if (this.data.submitting) return

    const slot = this.data.slots[this.data.selectedSlot]
    if (!slot || !slot.id) {
      wx.showToast({ title: '请重新选择时段', icon: 'none' })
      return
    }

    const payload = {
      serviceId: Number(this.data.serviceId),
      slotId: Number(slot.id),
      contactName: this.data.contactName.trim(),
      contactPhone: this.data.contactPhone.trim(),
      smsCode: this.data.smsCode.trim(),
      remark: this.data.remark.trim(),
    }

    this.setData({ submitting: true })
    appointmentService
      .createAppointment(payload)
      .then((res) => {
        this.setData({ submitting: false })
        const appointmentId = (res && (res.id || res.appointment_id)) || ''
        const slotLabel = `${this.data.selectedDate} ${this.data.selectedSlotLabel || ''}`
        wx.redirectTo({
          url: `/pages/appointment-success/appointment-success?name=${encodeURIComponent(
            (this.data.serviceInfo && this.data.serviceInfo.name) || '预约服务'
          )}&slot=${encodeURIComponent(slotLabel)}&price=${encodeURIComponent(this.data.priceLabel)}&no=${appointmentId}`,
        })
      })
      .catch((err) => {
        this.setData({ submitting: false })
        wx.showToast({ title: (err && err.message) || '预约失败', icon: 'none' })
      })
  },

  _formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
})
