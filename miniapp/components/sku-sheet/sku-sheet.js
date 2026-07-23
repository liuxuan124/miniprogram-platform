Component({
  properties: {
    show: { type: Boolean, value: false },
    image: { type: String, value: '' },
    price: { type: String, value: '0' },
    stock: { type: Number, value: 0 },
    groups: { type: Array, value: [] },
    selectedMap: { type: Object, value: {} },
    selectedLabel: { type: String, value: '' },
    quantity: { type: Number, value: 1 },
    mode: { type: String, value: 'buy' },
  },
  methods: {
    onClose() { this.triggerEvent('close') },
    onPick(e) {
      const { name, val } = e.currentTarget.dataset
      this.triggerEvent('pick', { name, val })
    },
    onMinus() { this.triggerEvent('qty', { delta: -1 }) },
    onPlus() { this.triggerEvent('qty', { delta: 1 }) },
    onCart() { this.triggerEvent('cart') },
    onBuy() { this.triggerEvent('buy') },
  },
})
