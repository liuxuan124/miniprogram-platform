// pages/coupon-list/coupon-list.js — 优惠券列表页面（可领取/我的切换）
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')

const TABS = [
  { key: 'available', label: '领券中心' },
  { key: 'my', label: '我的优惠券' },
]

const MY_SUB_TABS = [
  { key: 'available', label: '可使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
]

/** 前端 Tab → 后端用户券状态 */
const MY_STATUS_MAP = {
  available: 'unused',
  used: 'used',
  expired: 'expired',
}

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function pickList(res) {
  if (!res) return []
  if (Array.isArray(res)) return res
  return res.list || res.items || res.records || []
}

function normalizeAvailableCoupon(raw) {
  const type = String((raw && (raw.type || raw.couponType)) || 'fixed')
  const value = toNumber(
    raw && (raw.value != null
      ? raw.value
      : (raw.couponValue != null
        ? raw.couponValue
        : (raw.amount != null ? raw.amount : raw.discount))),
    0,
  )
  const minAmount = toNumber(
    raw && (raw.minOrderAmount != null
      ? raw.minOrderAmount
      : (raw.min_amount != null ? raw.min_amount : raw.minAmount)),
    0,
  )
  const endTime = (raw && (raw.endTime || raw.end_time || raw.expire_at || raw.expire_time)) || ''
  return {
    id: raw && (raw.id != null ? raw.id : raw.couponId),
    name: (raw && (raw.name || raw.title || raw.couponName)) || '优惠券',
    type,
    displayValue: type === 'percent' ? `${value}` : `${value}`,
    unit: type === 'percent' ? '折' : '元',
    condition: minAmount > 0 ? `满¥${minAmount}可用` : ((raw && raw.condition) || '无门槛'),
    expireText: endTime ? `${String(endTime).replace('T', ' ').slice(0, 16)}到期` : '',
    claimed: !!(raw && raw.claimed),
  }
}

function normalizeMyCoupon(raw) {
  const type = String((raw && (raw.couponType || raw.type)) || 'fixed')
  const value = toNumber(
    raw && (raw.couponValue != null
      ? raw.couponValue
      : (raw.value != null ? raw.value : (raw.amount != null ? raw.amount : raw.discount))),
    0,
  )
  const minAmount = toNumber(raw && (raw.minOrderAmount != null ? raw.minOrderAmount : raw.min_amount), 0)
  const endTime = (raw && (raw.endTime || raw.end_time || raw.expire_at)) || ''
  return {
    id: raw && raw.id,
    name: (raw && (raw.couponName || raw.name || raw.title)) || '优惠券',
    type,
    displayValue: `${value}`,
    unit: type === 'percent' ? '折' : '元',
    condition: minAmount > 0 ? `满¥${minAmount}可用` : ((raw && raw.condition) || '无门槛'),
    expireText: endTime ? `${String(endTime).replace('T', ' ').slice(0, 16)}到期` : '',
  }
}

Page({
  data: {
    tabs: TABS,
    activeTab: 'available',
    mySubTabs: MY_SUB_TABS,
    activeMySubTab: 'available',
    availableCoupons: [],
    availablePage: 1,
    availableHasMore: true,
    claimingId: '',
    myCoupons: [],
    myPage: 1,
    myHasMore: true,
    loading: false,
    isEmpty: false,
    pageSize: 20,
  },

  onLoad() {
    this._loadData(true)
  },

  onPullDownRefresh() {
    this._loadData(true).then(() => {
      wx.stopPullDownRefresh()
    })
  },

  onReachBottom() {
    if (!this.data.loading) {
      this._loadData(false)
    }
  },

  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeTab) return

    if (key === 'my' && !AuthUtil.requireLoginForAction('查看优惠券')) return

    this.setData({
      activeTab: key,
      isEmpty: false,
    })
    this._loadData(true)
  },

  onMySubTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeMySubTab) return

    this.setData({
      activeMySubTab: key,
      isEmpty: false,
    })
    this._loadMyCoupons(true)
  },

  _loadData(reset = false) {
    if (this.data.activeTab === 'available') {
      return this._loadAvailableCoupons(reset)
    }
    return this._loadMyCoupons(reset)
  },

  _loadAvailableCoupons(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.availablePage + 1
    this.setData({ loading: true })

    return couponService.getAvailableCoupons({ page, page_size: this.data.pageSize })
      .then((res) => {
        const list = pickList(res).map(normalizeAvailableCoupon)
        const total = (res && res.total) || list.length
        const hasMore = page * this.data.pageSize < total
        const availableCoupons = reset ? list : this.data.availableCoupons.concat(list)

        this.setData({
          availableCoupons,
          availablePage: page,
          availableHasMore: hasMore,
          loading: false,
          isEmpty: availableCoupons.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  _loadMyCoupons(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.myPage + 1
    this.setData({ loading: true })

    const params = {
      page,
      page_size: this.data.pageSize,
      status: MY_STATUS_MAP[this.data.activeMySubTab] || 'unused',
    }

    return couponService.getMyCoupons(params)
      .then((res) => {
        const list = pickList(res).map(normalizeMyCoupon)
        const total = (res && res.total) || list.length
        const hasMore = page * this.data.pageSize < total
        const myCoupons = reset ? list : this.data.myCoupons.concat(list)

        this.setData({
          myCoupons,
          myPage: page,
          myHasMore: hasMore,
          loading: false,
          isEmpty: myCoupons.length === 0,
        })
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  onClaimTap(e) {
    if (!AuthUtil.requireLoginForAction('领取优惠券')) return
    if (this.data.claimingId) return

    const id = e.currentTarget.dataset.id
    const idx = e.currentTarget.dataset.index

    this.setData({ claimingId: id })
    couponService.claimCoupon(id)
      .then(() => {
        wx.showToast({ title: '领取成功', icon: 'success' })
        const key = `availableCoupons[${idx}].claimed`
        this.setData({
          [key]: true,
          claimingId: '',
        })
      })
      .catch((err) => {
        const msg = (err && err.message) || '领取失败'
        wx.showToast({ title: msg, icon: 'none' })
        this.setData({ claimingId: '' })
      })
  },
})
