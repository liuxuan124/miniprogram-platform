// components/empty-state/empty-state.js — D2：统一空态组件
Component({
  properties: {
    /** 图标路径，不传则用默认通用空态图 */
    icon: {
      type: String,
      value: '',
    },
    /** 标题文案 */
    title: {
      type: String,
      value: '暂无数据',
    },
    /** 补充说明，可选 */
    desc: {
      type: String,
      value: '',
    },
    /** 行动按钮文案，不传则不显示按钮 */
    actionText: {
      type: String,
      value: '',
    },
    /** 行动按钮样式：primary（品牌色）/ default（描边） */
    actionType: {
      type: String,
      value: 'default',
    },
  },

  methods: {
    onActionTap() {
      this.triggerEvent('action')
    },
  },
})
