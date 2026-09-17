/* components/empty-state/empty-state — U4 空态（对齐 prototypes-warm/states.html） */
Component({
  properties: {
    title: { type: String, value: '暂无内容' },
    desc: { type: String, value: '' },
    buttonText: { type: String, value: '' },
    /** 兼容旧调用：action-text / actionText */
    actionText: { type: String, value: '' },
    icon: { type: String, value: '' },
    subText: { type: String, value: '' },
    subLink: { type: String, value: '' },
  },
  data: { _btn: '' },
  observers: {
    'buttonText, actionText'(buttonText, actionText) {
      this.setData({ _btn: buttonText || actionText || '' })
    },
  },
  lifetimes: {
    attached() {
      this.setData({ _btn: this.data.buttonText || this.data.actionText || '' })
    },
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    },
    onSubAction() {
      this.triggerEvent('subaction')
    },
  },
})
