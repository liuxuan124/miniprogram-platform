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
    list: [],
    editing: false,
    editingId: '',
    mode: '',
    form: { ...EMPTY_FORM },
    region: [],
    regionText: '',
  },

  onLoad(options) {
    this.setData({ mode: options.mode || '' })
  },

  onShow() {
    if (this.data.editing) return
    this._loadList()
  },

  _loadList() {
    const list = StorageUtil.get(ADDRESS_LIST_KEY) || []
    this.setData({
      list: Array.isArray(list) ? list : [],
      editing: false,
      editingId: '',
    })
  },

  _persist(list) {
    StorageUtil.set(ADDRESS_LIST_KEY, list)
    this.setData({ list })
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

    const list = this.data.list.slice()
    const editingId = this.data.editingId
    const payload = {
      id: editingId || `local_${Date.now()}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      is_default: false,
    }

    const idx = list.findIndex((item) => String(item.id) === String(editingId))
    if (idx >= 0) {
      payload.is_default = !!list[idx].is_default
      list[idx] = payload
    } else {
      payload.is_default = list.length === 0
      list.push(payload)
    }

    this._persist(list)
    this.setData({ editing: false, editingId: '', form: { ...EMPTY_FORM }, region: [], regionText: '' })
    wx.showToast({ title: '地址已保存', icon: 'success' })

    if (this.data.mode === 'select' && !editingId) {
      const eventChannel = this.getOpenerEventChannel()
      eventChannel.emit('selectAddress', payload)
      setTimeout(() => wx.navigateBack(), 300)
    }
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
    const list = this.data.list.map((item) => ({
      ...item,
      is_default: String(item.id) === String(id),
    }))
    this._persist(list)
    wx.showToast({ title: '已设为默认', icon: 'success' })
  },

  clearAddress(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除收货地址',
      content: '确定删除该收货地址吗？',
      success: (res) => {
        if (!res.confirm) return
        let list = this.data.list.filter((item) => String(item.id) !== String(id))
        if (list.length && !list.some((item) => item.is_default)) {
          list = list.map((item, i) => ({ ...item, is_default: i === 0 }))
        }
        this._persist(list)
      },
    })
  },
})
