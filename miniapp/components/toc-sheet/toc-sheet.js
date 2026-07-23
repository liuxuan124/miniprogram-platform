Component({
  properties: {
    show: { type: Boolean, value: false },
    toc: { type: Array, value: [] },
  },
  methods: {
    onClose() { this.triggerEvent('close') },
    onJump(e) { this.triggerEvent('jump', { index: e.currentTarget.dataset.index }) },
    onPdf() { this.triggerEvent('pdf') },
  },
})
