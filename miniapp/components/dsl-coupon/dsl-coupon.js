// components/dsl-coupon/dsl-coupon.js — 优惠券组件
const { executeAction, navigatePage } = require('../../utils/render')
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function normalizeCoupon(raw, index, buttonText) {
  const type = String((raw && raw.type) || 'fixed')
  const value = toNumber(
    raw && (raw.value != null ? raw.value : (raw.amount != null ? raw.amount : raw.discount)),
    0,
  )
  const minAmount = toNumber(
    raw && (raw.minOrderAmount != null
      ? raw.minOrderAmount
      : (raw.min_amount != null ? raw.min_amount : raw.minAmount)),
    0,
  )
  const endTime = (raw && (raw.endTime || raw.end_time || raw.expire_time || raw.expire_at)) || ''
  return {
    id: (raw && (raw.id != null ? raw.id : raw.couponId)) || `coupon_${index}`,
    name: (raw && (raw.name || raw.title || raw.couponName)) || '优惠券',
    type,
    displayValue: type === 'percent' ? `${value}折` : `¥${value}`,
    condition: minAmount > 0 ? `满${minAmount}可用` : ((raw && raw.condition) || '无门槛'),
    expireText: endTime ? `${String(endTime).replace('T', ' ').slice(0, 16)}到期` : '',
    button_text: (raw && raw.button_text) || buttonText || '领取',
    claimed: !!(raw && raw.claimed),
  }
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    displayCoupons: [],
    layoutClass: 'dsl-coupon--horizontal',
    title: '领券中心',
    titleStyle: '',
    claimingId: '',
  },

  observers: {
    'config, runtimeData': function () {
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
      const config = this.data.config || {}
      const limit = Math.max(toNumber(config.limit, 3), 1)
      const buttonText = config.button_text || '领取'
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      const configItems = Array.isArray(config.items) ? config.items : []
      const fallbackCoupons = [{
        id: 'fallback-new-user',
        name: '新人专享券',
        type: 'fixed',
        value: 10,
        minOrderAmount: 100,
        button_text: buttonText,
      }]
      const source = runtimeData.length
        ? runtimeData
        : (configItems.length ? configItems : fallbackCoupons)

      const titleSize = toNumber(config.title_font_size, 15)
      this.setData({
        title: config.title || '领券中心',
        titleStyle: titleSize > 0 ? `font-size:${titleSize * 2}rpx` : '',
        layoutClass: config.style_type === 'vertical' ? 'dsl-coupon--vertical' : 'dsl-coupon--horizontal',
        displayCoupons: source.slice(0, limit).map((item, index) => normalizeCoupon(item, index, buttonText)),
      })
    },

    onTapCoupon(e) {
      const id = e.currentTarget.dataset.id
      const index = e.currentTarget.dataset.index
      const coupons = this.data.displayCoupons || []
      const coupon = coupons[index] || coupons.find((c) => String(c.id) === String(id))
      if (!coupon || coupon.claimed) return

      if (coupon.action) {
        executeAction(coupon.action)
        return
      }
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
        return
      }

      // 真实领取：登录后调接口
      if (!AuthUtil.requireLoginForAction('领取优惠券')) return
      if (this.data.claimingId) return
      if (String(id).indexOf('fallback') === 0) {
        navigatePage('/pages/coupon-list/coupon-list')
        return
      }

      this.setData({ claimingId: String(id) })
      couponService.claimCoupon(id)
        .then(() => {
          const key = `displayCoupons[${index}].claimed`
          this.setData({
            [key]: true,
            claimingId: '',
          })
          wx.showToast({ title: '领取成功', icon: 'success' })
          this.triggerEvent('componentevent', {
            type: 'coupon_claimed',
            couponId: id,
          })
        })
        .catch((err) => {
          this.setData({ claimingId: '' })
          wx.showToast({ title: (err && err.message) || '领取失败', icon: 'none' })
        })
    },

    onMoreTap() {
      navigatePage('/pages/coupon-list/coupon-list')
    },
  },
})
