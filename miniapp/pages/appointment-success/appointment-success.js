const appointmentService = require('../../services/form-appointment')

Page({
  data: {
    serviceName: '',
    slotText: '',
    price: '',
    bookingNo: '',
    loadError: '',
  },
  onLoad(q) {
    const id = q.id || q.no || ''
    if (!id || id === 'DEMO') {
      this.setData({ loadError: '未找到预约单，请到「我的预约」核对' })
      return
    }
    appointmentService.getMyAppointment(id)
      .then((row) => {
        if (!row || !row.id) {
          this.setData({ loadError: '预约不存在或无权查看' })
          return
        }
        const date = row.appointmentDate || row.appointment_date || ''
        const time = row.appointmentTime || row.appointment_time || ''
        const price = row.servicePrice != null ? row.servicePrice : (row.service_price != null ? row.service_price : '')
        this.setData({
          serviceName: row.serviceName || row.service_name || '预约服务',
          slotText: [date, time].filter(Boolean).join(' ') || '待确认时段',
          price: price === '' || price == null ? '' : String(price),
          bookingNo: row.orderNo || row.order_no || String(row.id),
          loadError: '',
        })
      })
      .catch(() => {
        this.setData({ loadError: '预约确认失败，请到「我的预约」查看' })
      })
  },
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  goMineAppt() {
    wx.redirectTo({ url: '/pages/my-appointments/my-appointments' })
  },
})
