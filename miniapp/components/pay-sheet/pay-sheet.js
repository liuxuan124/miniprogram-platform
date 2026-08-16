Component({
  properties: {
    show: { type: Boolean, value: false },
    amount: { type: String, value: '0.00' },
    balance: { type: String, value: '0.00' },
  },
  data: {
    method: 'wechat',
    insufficient: true,
  },
  observers: {
    'amount, balance, show'(amount, balance, show) {
      const pay = parseFloat(amount) || 0
      const bal = parseFloat(balance) || 0
      const insufficient = bal < pay
      const patch = { insufficient }
      // 打开时若余额不足，默认仍选微信，避免误触余额
      if (show && insufficient && this.data.method === 'balance') {
        // keep user's pick; just refresh insufficient flag
      }
      this.setData(patch)
    },
  },
  methods: {
    noop() {},
    onClose() { this.triggerEvent('close') },
    onPick(e) { this.setData({ method: e.currentTarget.dataset.m }) },
    onConfirm() {
      this.triggerEvent('confirm', {
        method: this.data.method,
        balance: this.data.balance,
        amount: this.data.amount,
        insufficient: this.data.insufficient,
      })
    },
    /** 供父页面在弹窗内切回微信支付 */
    switchToWechat() {
      this.setData({ method: 'wechat' })
    },
  },
})
