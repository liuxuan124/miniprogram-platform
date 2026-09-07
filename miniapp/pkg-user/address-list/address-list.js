const addressService = require('../../services/address')

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
    list: [],
    editing: false,
    editingId: '',
    mode: '',
    form: { ...EMPTY_FORM },
    region: [],
    regionText: '',
    loading: false,
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' })
  },

  onShow() {
    if (this.data.editing) return
    this._loadList()
  },

  _loadList() {
    this.setData({ loading: true })
    addressService.migrateLocalIfNeeded()
      .then(() => addressService.listAddresses())
      .then((list) => {
        this.setData({
          list: list || [],
          editing: false,
          editingId: '',
          loading: false,
        })
      })
      .catch(() => {
        this.setData({
          list: addressService.readCache(),
          editing: false,
          editingId: '',
          loading: false,
        })
      })
  },

  onAdd() {
    this.setData({
      editing: true,
      editingId: '',
      form: { ...EMPTY_FORM },
      region: [],
      regionText: '',
    })
  },

  startEdit(e) {
    const id = e.currentTarget.dataset.id
    const address = this.data.list.find((item) => String(item.id) === String(id))
    if (!address) return
    this.setData({
      editing: true,
      editingId: address.id,
      form: { ...EMPTY_FORM, ...address },
      region: [address.province, address.city, address.district].filter(Boolean),
      regionText: [address.province, address.city, address.district].filter(Boolean).join(' '),
    })
  },

  cancelEdit() {
    this.setData({
      editing: false,
      editingId: '',
      form: { ...EMPTY_FORM },
      region: [],
      regionText: '',
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

    const editingId = this.data.editingId
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      is_default: !editingId && this.data.list.length === 0,
    }

    const req = editingId
      ? addressService.updateAddress(editingId, payload)
      : addressService.createAddress(payload)

    wx.showLoading({ title: '保存中', mask: true })
    req.then((saved) => {
      wx.hideLoading()
      this.setData({ editing: false, editingId: '', form: { ...EMPTY_FORM }, region: [], regionText: '' })
      wx.showToast({ title: '地址已保存', icon: 'success' })
      this._loadList()
      if (this.data.mode === 'select' && !editingId) {
        const eventChannel = this.getOpenerEventChannel()
        eventChannel.emit('selectAddress', saved)
        setTimeout(() => wx.navigateBack(), 300)
      }
    }).catch((err) => {
      wx.hideLoading()
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
    })
  },

  onSelect(e) {
    if (this.data.mode !== 'select') return
    const id = e.currentTarget.dataset.id
    const address = this.data.list.find((item) => String(item.id) === String(id))
    if (!address) return
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.emit('selectAddress', address)
    wx.navigateBack()
  },

  setDefault(e) {
    const id = e.currentTarget.dataset.id
    addressService.setDefaultAddress(id).then((list) => {
      this.setData({ list })
      wx.showToast({ title: '已设为默认', icon: 'success' })
    }).catch((err) => {
      wx.showToast({ title: (err && err.message) || '设置失败', icon: 'none' })
    })
  },

  clearAddress(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除收货地址',
      content: '确定删除该收货地址吗？',
      success: (res) => {
        if (!res.confirm) return
        addressService.deleteAddress(id).then((list) => {
          this.setData({ list })
        }).catch((err) => {
          wx.showToast({ title: (err && err.message) || '删除失败', icon: 'none' })
        })
      },
    })
  },
})
