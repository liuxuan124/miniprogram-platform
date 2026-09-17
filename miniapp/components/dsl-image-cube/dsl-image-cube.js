Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },
  methods: {
    onTap(e) {
      this.triggerEvent('tapitem', { url: (e.currentTarget.dataset.url || '').trim() })
    },
  },
})
