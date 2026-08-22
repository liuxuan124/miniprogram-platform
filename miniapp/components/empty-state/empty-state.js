/* components/empty-state/empty-state — U4 空态 */
Component({
  properties: {
    title: { type: String, value: '暂无内容' },
    desc: { type: String, value: '' },
    buttonText: { type: String, value: '' },
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    },
  },
})
