// pages/coupon-list/coupon-list.js — 优惠券列表页面（可领取/我的切换）
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')

// Tab 定义
const TABS = [
  { key: 'available', label: '领券中心' },
  { key: 'my', label: '我的优惠券' },
]

// 我的优惠券子 Tab
const MY_SUB_TABS = [
  { key: 'available', label: '可使用' },
  { key: 'used', label: '已使用' },
  { key: 'expired', label: '已过期' },
]

Page({
  data: {
    tabs: TABS,
    activeTab: 'available',

    // 我的优惠券子 Tab
    mySubTabs: MY_SUB_TABS,
    activeMySubTab: 'available',

    // 可领取优惠券
    availableCoupons: [],
    availablePage: 1,
    availableHasMore: true,

    // 我的优惠券
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

  /** 切换主 Tab */
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

  /** 切换我的优惠券子 Tab */
  onMySubTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (key === this.data.activeMySubTab) return

    this.setData({
      activeMySubTab: key,
      isEmpty: false,
    })
    this._loadMyCoupons(true)
  },

  /** 加载数据 */
  _loadData(reset = false) {
    if (this.data.activeTab === 'available') {
      return this._loadAvailableCoupons(reset)
    } else {
      return this._loadMyCoupons(reset)
    }
  },

  /** 加载可领取优惠券 */
  _loadAvailableCoupons(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.availablePage + 1
    this.setData({ loading: true })

    return couponService.getAvailableCoupons({ page, page_size: this.data.pageSize })
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
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

  /** 加载我的优惠券 */
  _loadMyCoupons(reset = false) {
    if (this.data.loading) return Promise.resolve()

    const page = reset ? 1 : this.data.myPage + 1
    this.setData({ loading: true })

    const params = {
      page,
      page_size: this.data.pageSize,
      status: this.data.activeMySubTab,
    }

    return couponService.getMyCoupons(params)
      .then((res) => {
        const list = res.list || res.items || []
        const total = res.total || 0
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

  /** 领取优惠券 */
  onClaimTap(e) {
    if (!AuthUtil.requireLoginForAction('领取优惠券')) return

    const id = e.currentTarget.dataset.id
    const idx = e.currentTarget.dataset.index

    couponService.claimCoupon(id)
      .then(() => {
        wx.showToast({ title: '领取成功', icon: 'success' })

        // 更新该优惠券的领取状态
        const key = `availableCoupons[${idx}].claimed`
        this.setData({
          [key]: true,
        })
      })
      .catch((err) => {
        const msg = (err && err.message) || '领取失败'
        wx.showToast({ title: msg, icon: 'none' })
      })
  },

  /** 格式化优惠金额显示 */
  _formatDiscount(coupon) {
    if (coupon.type === 'percent') {
      return (coupon.discount / 10) + '折'
    }
    return coupon.discount || coupon.amount || 0
  },
})
