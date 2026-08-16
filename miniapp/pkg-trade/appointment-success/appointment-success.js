Page({
  data: {
    serviceName: '选品诊断 1v1 咨询',
    slotText: '',
    price: '299',
    bookingNo: '',
  },
  onLoad(q) {
    this.setData({
      serviceName: q.name ? decodeURIComponent(q.name) : this.data.serviceName,
      slotText: q.slot ? decodeURIComponent(q.slot) : '待确认时段',
      price: q.price || '299',
      bookingNo: q.no || ('BK' + Date.now().toString().slice(-8)),
    })
  },
  goHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },
  goMineAppt() {
    wx.redirectTo({ url: '/pkg-user/my-appointments/my-appointments' })
  },
})
