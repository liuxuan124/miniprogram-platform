// components/skeleton/skeleton.js — D1：结构化骨架屏组件
Component({
  properties: {
    /** 是否显示 */
    show: {
      type: Boolean,
      value: true,
    },
    /** 骨架类型：home / grid / feed（长文列表）/ list（通用，默认） */
    type: {
      type: String,
      value: 'list',
    },
    /** 占位卡片/行数 */
    rows: {
      type: Number,
      value: 4,
    },
  },
})
