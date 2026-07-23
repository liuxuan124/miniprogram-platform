Component({
  properties: {
    show: { type: Boolean, value: false },
    amount: { type: String, value: '0.00' },
  },
  data: { method: 'wechat' },
  methods: {
    onClose() { this.triggerEvent('close') },
    onPick(e) { this.setData({ method: e.currentTarget.dataset.m }) },
    onConfirm() {
      this.triggerEvent('confirm', { method: this.data.method })
    },
  },
})
