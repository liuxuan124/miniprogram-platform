const { StorageUtil } = require('../../utils/storage')

const ADDRESS_KEY = 'shipping_address'

Page({
  data: { address: null },

  onShow() {
    this.setData({ address: StorageUtil.get(ADDRESS_KEY) || null })
  },

  chooseAddress() {
    wx.chooseAddress({
      success: (res) => {
        const address = {
          userName: res.userName,
          telNumber: res.telNumber,
          provinceName: res.provinceName,
          cityName: res.cityName,
          countyName: res.countyName,
          detailInfo: res.detailInfo,
        }
        StorageUtil.set(ADDRESS_KEY, address)
        this.setData({ address })
      },
      fail: (err) => {
        if (err && /auth deny|authorize/i.test(err.errMsg || '')) {
          wx.showToast({ title: '请允许使用微信地址', icon: 'none' })
        }
      },
    })
  },

  clearAddress() {
    StorageUtil.remove(ADDRESS_KEY)
    this.setData({ address: null })
  },
})
