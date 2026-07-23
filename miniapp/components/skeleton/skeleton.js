// components/skeleton/skeleton.js — D1：结构化骨架屏组件
Component({
  properties: {
    /** 是否显示 */
    show: {
      type: Boolean,
      value: true,
    },
    /** 骨架类型：home（首页：轮播+宫格+卡片）/ grid（商品宫格）/ list（通用列表，默认） */
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
