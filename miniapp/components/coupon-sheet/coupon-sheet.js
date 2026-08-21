Component({
  properties: {
    show: { type: Boolean, value: false },
    coupons: { type: Array, value: [] },
    selectedId: { type: String, value: '' },
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close') },
    onPick(e) {
      const usable = e.currentTarget.dataset.usable
      if (usable === false || usable === 'false') {
        wx.showToast({ title: '该券不适用于当前商品', icon: 'none' })
        return
      }
      const id = e.currentTarget.dataset.id
      this.triggerEvent('pick', { id: id === undefined || id === null ? '' : String(id) })
    },
    onConfirm() { this.triggerEvent('confirm', { id: this.data.selectedId || '' }) },
  },
})
