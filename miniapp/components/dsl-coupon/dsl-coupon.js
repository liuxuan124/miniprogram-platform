// components/dsl-coupon/dsl-coupon.js — 优惠券组件
const { executeAction } = require('../../utils/render')

Component({
  properties: {
    /** 组件配置 */
    config: {
      type: Object,
      value: {},
    },
    /** 运行时数据（由数据源填充） */
    runtimeData: {
      type: Array,
      value: [],
    },
    /** 组件动作列表 */
    actions: {
      type: Array,
      value: [],
    },
    /** 自定义样式 */
    styleString: {
      type: String,
      value: '',
    },
  },

  data: {
    displayCoupons: [],
  },

  observers: {
    'config.items, runtimeData': function () {
      this._refreshDisplayCoupons()
    },
  },

  lifetimes: {
    attached() {
      this._refreshDisplayCoupons()
    },
  },

  methods: {
    _refreshDisplayCoupons() {
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const configItems = Array.isArray(this.data.config.items) ? this.data.config.items : []
      const fallbackCoupons = [{
        id: 'fallback-new-user',
        name: '新人专享券',
        amount: 10,
        min_amount: 100,
        button_text: '领取',
      }]

      this.setData({
        displayCoupons: runtimeData.length ? runtimeData : (configItems.length ? configItems : fallbackCoupons),
      })
    },

    /** 点击优惠券 */
    onTapCoupon(e) {
      const id = e.currentTarget.dataset.id
      const coupons = this.data.displayCoupons || []
      const coupon = coupons.find((c) => c.id === id)

      if (coupon && coupon.action) {
        executeAction(coupon.action)
      } else if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
      }
    },

    /** 获取优惠金额显示文本 */
    _getDiscountText(coupon) {
      if (coupon.type === 'percent') {
        return (coupon.discount || 10) + '折'
      }
      return '¥' + (coupon.amount || coupon.discount || 0)
    },
  },
})
