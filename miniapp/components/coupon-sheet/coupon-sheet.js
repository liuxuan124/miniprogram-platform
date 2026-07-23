Component({
  properties: {
    show: { type: Boolean, value: false },
    coupons: { type: Array, value: [] },
    selectedId: { type: String, value: '' },
  },
  methods: {
    onClose() { this.triggerEvent('close') },
    onPick(e) { this.triggerEvent('pick', { id: e.currentTarget.dataset.id || '' }) },
    onConfirm() { this.triggerEvent('confirm', { id: this.data.selectedId || '' }) },
  },
})
