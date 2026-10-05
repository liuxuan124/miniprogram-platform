// components/dsl-coupon/dsl-coupon.js — 优惠券组件
const { executeAction, navigatePage } = require('../../utils/render')
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')
const {
  normalizeCouponProps,
  resolveCouponState,
  resolveButtonText,
  toGray,
  matchFilter,
  sortCoupons,
} = require('../../utils/coupon-props')

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatPercentDiscount(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return '—'
  const zhe = n > 0 && n <= 1 ? n * 10 : n
  const text = Number.isInteger(zhe)
    ? String(zhe)
    : String(Number(zhe.toFixed(1))).replace(/\.0$/, '')
  return `${text}折`
}

/**
 * 归一化单张券。
 *
 * 🔴 `state`（claim/used/soldout）与 `buttonText` 现在由 coupon-props统一判定，
 *    端上与后台画布同规则 —— 否则会出现「后台画布显示『已抢光』、
 *    真机还写『立即领取』」这种双口径。
 */
function normalizeCoupon(raw, index, cfg) {
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
  const state = resolveCouponState(raw, cfg)
  const dim = state !== 'claim'
  return {
    id: (raw && (raw.id != null ? raw.id : raw.couponId)) || `coupon_${index}`,
    name: (raw && (raw.name || raw.title || raw.couponName)) || '优惠券',
    type,
    displayValue: type === 'percent' ? formatPercentDiscount(value) : `¥${value}`,
    condition: minAmount > 0 ? `满${minAmount}可用` : ((raw && raw.condition) || '无门槛'),
    expireText: endTime ? `${String(endTime).replace('T', ' ').slice(0, 16)}到期` : '',
    // 券自带 button_text 优先（运营可能在券级别单独配），否则用组件级三态文案
    button_text: (raw && raw.button_text) || resolveButtonText(state, cfg),
    state,
    claimed: state === 'used',
    isDim: dim,
    // 🔴 需求要求「已失效/已领取置灰」：金额与按钮都按底色混白算灰，
    //    不额外配一套灰度色 —— 运营改了主色，置灰自动跟随。
    amount_color: dim ? toGray(cfg.amountColor) : cfg.amountColor,
    btn_color: dim ? toGray(cfg.btnColor) : cfg.btnColor,
  }
}

/** 手动自选模式下的券：面板已存好展示字段，直接补 state 与文案 */
function normalizeManualPick(pick, index, cfg) {
  const state = resolveCouponState(pick, cfg)
  const dim = state !== 'claim'
  return {
    id: pick.id,
    name: pick.name || `券 #${pick.id}`,
    type: 'fixed',
    displayValue: pick.display_value || '—',
    condition: pick.condition || '',
    expireText: '',
    button_text: resolveButtonText(state, cfg),
    state,
    claimed: state === 'used',
    isDim: dim,
    amount_color: dim ? toGray(cfg.amountColor) : cfg.amountColor,
    btn_color: dim ? toGray(cfg.btnColor) : cfg.btnColor,
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
    themeClass: 'dsl-coupon--tear',
    title: '领券中心',
    titleStyle: '',
    showMore: false,
    moreText: '更多',
    moreLink: '',
    moreStyle: '',
    listStyle: '',
    rootStyle: '',
    cardStyle: '',
    amountSize: 24,
    nameStyle: '',
    condStyle: '',
    btnStyle: '',
    claimingId: '',
    autoHideWhenEmpty: true,
    /** auto_hide_when_empty=true 且无券 → 整块不渲染 */
    hidden: false,
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
      const cfg = normalizeCouponProps(config)
      const runtimeData = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []

      // ---- 取券源：手动自选 > 运行时数据源 > 旧 items > 兜底 ----
      let source = []
      if (cfg.dataMode === 'manual') {
        source = cfg.manualItems.map((pick, index) => normalizeManualPick(pick, index, cfg))
        // 手动模式不发请求，但 runtimeData 若已有该券的实时领取态则合并
        source = source.map((c) => {
          const live = runtimeData.find((r) => String(r && r.id) === String(c.id))
          return live ? normalizeCoupon(live, 0, cfg) : c
        })
      } else {
        const legacy = cfg.legacyItems
        if (runtimeData.length) {
          source = sortCoupons(
            runtimeData.filter((c) => matchFilter(c, cfg.filterTypes)),
            cfg.sort,
          ).map((item, index) => normalizeCoupon(item, index, cfg))
        } else if (legacy.length) {
          source = legacy.slice(0, cfg.displayLimit).map((item, index) => normalizeCoupon(item, index, cfg))
        } else {
          // 兜底示例券：只在编辑预览/无数据源时用，保住组件不会塌成 0 高度
          source = [normalizeCoupon({
            id: 'fallback-new-user',
            name: '新人专享券',
            type: 'fixed',
            value: 10,
            minOrderAmount: 100,
          }, 0, cfg)]
        }
      }

      const list = source.slice(0, cfg.displayLimit)

      // ---- 样式（rpx：px × 2） ----
      const dim = cfg.autoHideWhenEmpty && !list.length
      this.setData({
        displayCoupons: list,
        title: cfg.title,
        titleStyle: `font-size:${cfg.titleSize * 2}rpx`,
        showMore: cfg.showMore,
        moreText: cfg.moreText,
        moreLink: cfg.moreLink,
        moreStyle: `font-size:${Math.max(20, cfg.descSize * 2 - 2)}rpx`,
        layoutClass: `dsl-coupon--${cfg.layout}`,
        themeClass: `dsl-coupon--theme-${cfg.theme}`,
        rootStyle: `padding:${cfg.blockPadding * 2}rpx`,
        listStyle: `gap:${cfg.cardGap * 2}rpx`,
        cardStyle: `background:${cfg.bgColor}`,
        amountSize: cfg.amountSize,
        nameStyle: `font-size:${(cfg.descSize + 1) * 2}rpx`,
        condStyle: `font-size:${cfg.descSize * 2}rpx`,
        btnStyle: `background:${cfg.btnColor};color:#fff`,
        autoHideWhenEmpty: cfg.autoHideWhenEmpty,
        // 供 wxml 判断「是否整块隐藏」
        hidden: dim,
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
        navigatePage('/pkg-user/coupon-list/coupon-list')
        return
      }

      this.setData({ claimingId: String(id) })
      couponService.claimCoupon(id)
        .then(() => {
          // 🔴 领取成功后按钮应变「去使用」—— 这是新配置里的第二态文案。
          //    旧代码置 claimed:true 让 wxml 写死显示「已领取」，与面板配的
          //    「已领取文案」完全脱钩，运营改了 use_text 端上永远看不到。
          const cfg = normalizeCouponProps(this.data.config || {})
          const keyState = `displayCoupons[${index}].state`
          const keyBtn = `displayCoupons[${index}].button_text`
          this.setData({
            [keyState]: 'used',
            [keyBtn]: resolveButtonText('used', cfg),
            [`displayCoupons[${index}].claimed`]: true,
            [`displayCoupons[${index}].isDim`]: true,
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
      // 优先跳面板配的落地页；没配时回落领券中心（老行为）
      const link = String(this.data.moreLink || '').trim()
      if (link) {
        navigatePage(link)
        return
      }
      navigatePage('/pkg-user/coupon-list/coupon-list')
    },
  },
})
