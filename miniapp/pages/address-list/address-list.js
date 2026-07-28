const { StorageUtil } = require('../../utils/storage')

const ADDRESS_LIST_KEY = 'addressList'
const EMPTY_FORM = {
  name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
}

Page({
  data: {
    address: null,
    editing: false,
    mode: '',
    form: { ...EMPTY_FORM },
    region: [],
    regionText: '',
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' })
  },

  onShow() {
    const addressList = StorageUtil.get(ADDRESS_LIST_KEY) || []
    const address = addressList.find((item) => item.is_default) || addressList[0] || null
    this.setData({
      address,
      editing: !address,
      form: address ? { ...EMPTY_FORM, ...address } : { ...EMPTY_FORM },
      region: address ? [address.province, address.city, address.district].filter(Boolean) : [],
      regionText: address ? [address.province, address.city, address.district].filter(Boolean).join(' ') : '',
    })
  },

  startEdit() {
    const address = this.data.address
    this.setData({
      editing: true,
      form: address ? { ...EMPTY_FORM, ...address } : { ...EMPTY_FORM },
      region: address ? [address.province, address.city, address.district].filter(Boolean) : [],
      regionText: address ? [address.province, address.city, address.district].filter(Boolean).join(' ') : '',
    })
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ [`form.${field}`]: e.detail.value })
  },

  onRegionChange(e) {
    const region = e.detail.value || []
    this.setData({
      region,
      regionText: region.join(' '),
      'form.province': region[0] || '',
      'form.city': region[1] || '',
      'form.district': region[2] || '',
    })
  },

  saveAddress() {
    const form = this.data.form
    if (!form.name.trim()) {
      wx.showToast({ title: '请填写收货人姓名', icon: 'none' })
      return
    }
    if (!/^1\d{10}$/.test(form.phone.trim())) {
      wx.showToast({ title: '请填写正确的手机号', icon: 'none' })
      return
    }
    if (!form.province || !form.city || !form.district) {
      wx.showToast({ title: '请选择省市区', icon: 'none' })
      return
    }
    if (!form.detail.trim()) {
      wx.showToast({ title: '请填写详细地址', icon: 'none' })
      return
    }

    const address = {
      id: (this.data.address && this.data.address.id) || `local_${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      is_default: true,
    }
    StorageUtil.set(ADDRESS_LIST_KEY, [address])
    this.setData({ address, editing: false, form: address })
    wx.showToast({ title: '地址已保存', icon: 'success' })

    if (this.data.mode === 'select') {
      const eventChannel = this.getOpenerEventChannel()
      eventChannel.emit('selectAddress', address)
      setTimeout(() => wx.navigateBack(), 300)
    }
  },

  clearAddress() {
    wx.showModal({
      title: '删除收货地址',
      content: '确定删除当前收货地址吗？',
      success: (res) => {
        if (!res.confirm) return
        StorageUtil.remove(ADDRESS_LIST_KEY)
        this.setData({
          address: null,
          editing: true,
          form: { ...EMPTY_FORM },
          region: [],
          regionText: '',
        })
      },
    })
  },
})
