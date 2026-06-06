// pages/appointment-calendar/appointment-calendar.js — 预约日历页
// 日历组件、可切换月份、有预约日期显示圆点、点击日期显示可预约时段

const request = require('../../utils/request')

Page({
  data: {
    // 日历数据
    year: 0,
    month: 0,
    weekDays: ['日', '一', '二', '三', '四', '五', '六'],
    calendarDays: [],

    // 选中日期
    selectedDate: '',
    selectedDateLabel: '',

    // 时段数据
    slots: [],
    selectedSlot: '',
    serviceId: '',

    // 有预约的日期列表（后端返回）
    appointmentDates: [],

    // 状态
    loading: false,
  },

  onLoad() {
    const now = new Date()
    this.setData({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    })
    this._loadAppointmentDates()
    this._buildCalendar()
  },

  /** 加载有预约的日期列表 */
  _loadAppointmentDates() {
    request.get('/api/v1/mp/appointment-services', { current: 1, size: 1 }, { auth: false })
      .then((data) => {
        const service = data.records && data.records[0]
        this.setData({
          serviceId: service ? service.id : '',
          appointmentDates: [],
        })
        this._buildCalendar()
      })
      .catch(() => {
        this.setData({ serviceId: '', appointmentDates: [] })
        this._buildCalendar()
      })
  },

  /** 构建日历数据 */
  _buildCalendar() {
    const { year, month, appointmentDates } = this.data
    const today = new Date()
    const todayStr = this._formatDate(today)

    // 当月第一天
    const firstDay = new Date(year, month - 1, 1)
    // 当月最后一天
    const lastDay = new Date(year, month, 0)

    const startWeekday = firstDay.getDay() // 0=周日
    const daysInMonth = lastDay.getDate()

    // 上个月补齐
    const prevMonthLastDay = new Date(year, month - 1, 0).getDate()
    const calendarDays = []

    // 上月末尾
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      const dateStr = this._formatDate(new Date(year, month - 2, day))
      calendarDays.push({
        day,
        date: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: false,
        hasAppointment: false,
      })
    }

    // 当月
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this._formatDate(new Date(year, month - 1, d))
      calendarDays.push({
        day: d,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: false,
        hasAppointment: appointmentDates.indexOf(d) >= 0,
      })
    }

    // 下月补齐（凑满6行=42格）
    const remaining = 42 - calendarDays.length
    for (let d = 1; d <= remaining; d++) {
      const dateStr = this._formatDate(new Date(year, month, d))
      calendarDays.push({
        day: d,
        date: dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: false,
        hasAppointment: false,
      })
    }

    this.setData({ calendarDays })
  },

  /** 上个月 */
  onPrevMonth() {
    let { year, month } = this.data
    if (month === 1) {
      year--
      month = 12
    } else {
      month--
    }
    this.setData({ year, month, selectedDate: '', selectedSlot: '', slots: [] })
    this._loadAppointmentDates()
  },

  /** 下个月 */
  onNextMonth() {
    let { year, month } = this.data
    if (month === 12) {
      year++
      month = 1
    } else {
      month++
    }
    this.setData({ year, month, selectedDate: '', selectedSlot: '', slots: [] })
    this._loadAppointmentDates()
  },

  /** 点击日期 */
  onDayTap(e) {
    const date = e.currentTarget.dataset.date
    const isCurrent = e.currentTarget.dataset.current
    if (!isCurrent) return // 非当月不可选

    // 更新选中状态
    const calendarDays = this.data.calendarDays.map((day) => ({
      ...day,
      isSelected: day.date === date,
    }))

    // 格式化显示
    const d = new Date(date)
    const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const label = `${d.getMonth() + 1}月${d.getDate()}日 ${weekDays[d.getDay()]}`

    this.setData({
      calendarDays,
      selectedDate: date,
      selectedDateLabel: label,
      selectedSlot: '',
    })

    this._loadSlots(date)
  },

  /** 加载选中日期的时段 */
  _loadSlots(date) {
    if (!this.data.serviceId) {
      this.setData({ slots: [], loading: false })
      wx.showToast({ title: '暂无可预约服务', icon: 'none' })
      return
    }
    this.setData({ loading: true })

    request.get(`/api/v1/mp/appointment-services/${this.data.serviceId}/slots`, { date }, { auth: false })
      .then((data) => {
        const slotList = data.records || []
        const slots = slotList.map((item) => ({
          ...item,
          label: item.label || `${item.startTime || item.start_time}-${item.endTime || item.end_time}`,
          start_time: item.startTime || item.start_time,
          end_time: item.endTime || item.end_time,
          available: item.available !== false && item.status !== 0,
        }))
        this.setData({
          slots,
          loading: false,
        })
      })
      .catch(() => {
      this.setData({
        slots: [],
        loading: false,
      })
      wx.showToast({ title: '时段加载失败', icon: 'none' })
      })
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

  /** 预约该时段 */
  onBookTap() {
    if (this.data.selectedSlot === '') {
      wx.showToast({ title: '请先选择时段', icon: 'none' })
      return
    }

    const slot = this.data.slots[this.data.selectedSlot]
    wx.navigateTo({
      url: `/pages/appointment-book/appointment-book?date=${this.data.selectedDate}&start=${slot.start_time}&end=${slot.end_time}`,
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
