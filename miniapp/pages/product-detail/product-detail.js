// pages/product-detail/product-detail.js — 商品详情页
// 图片轮播、SKU选择弹窗、加购物车/立即购买

const productService = require('../../services/product')
const cartService = require('../../services/cart')
const orderService = require('../../services/order')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')

Page({
  ...createSharePageConfig(),
  data: {
    id: '',
    product: null,
    loading: true,

    // 图片轮播
    swiperCurrent: 0,

    // SKU 弹窗
    showSkuPanel: false,
    skuMode: '', // 'cart' | 'buy'
    selectedSku: null,
    selectedSkuValues: {}, // { 规格名: 规格值 }
    quantity: 1,
    submitting: false, // D4：加购请求进行中，防止重复提交
    stock: 0,

    // 富文本描述
    richContent: '',
    isDigital: false,
    isService: false,
    reviewScore: '4.9',
    reviewCount: 0,
    gains: ['可复用方法论与清单模板', '真实案例拆解', '订单发货通知'],
    whoFor: '准备启动或优化跨境业务的卖家与内容创作者。',
    faqs: [
      { q: '付款后如何交付？', a: '支付成功后商家会正常发货，具体说明可在订单详情的发货通知中查看。' },
      { q: '和 1v1 咨询有什么区别？', a: '资料包适合自学沉淀；1v1 针对你的具体业务诊断，两者互补。' },
    ],
  },

  onLoad(options) {
    const id = options.id
    if (!id) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 1500)
      return
    }
    this.setData({ id })
    this._loadDetail(id)
  },

  /** 加载商品详情 */
  _loadDetail(id) {
    this.setData({ loading: true })
    productService.getProductDetail(id)
      .then((res) => {
        const product = res.product || res
        // 处理图片列表
        if (!product.images || product.images.length === 0) {
          product.images = product.image ? [product.image] : []
        }
        // 处理 SKU 列表
        const skus = product.skus || product.sku_list || []
        product.skuList = skus
        // 处理规格
        const specs = product.specs || product.spec_list || []
        product.specList = specs
        // 默认选中第一个 SKU
        let selectedSku = null
        let selectedSkuValues = {}
        if (skus.length > 0) {
          selectedSku = skus[0]
          if (specs.length > 0) {
            specs.forEach((spec, idx) => {
              selectedSkuValues[spec.name] = selectedSku.values
                ? selectedSku.values[idx] || spec.values[0]
                : spec.values[0]
            })
          }
        }
        // 富文本
        let richContent = ''
        if (product.detail && product.detail.indexOf('<') !== -1) {
          richContent = product.detail
        } else if (product.description && product.description.indexOf('<') !== -1) {
          richContent = product.description
        }
        this.setData({
          product,
          loading: false,
          selectedSku,
          selectedSkuValues,
          stock: selectedSku ? selectedSku.stock : (product.stock || 0),
          richContent,
          isDigital: (product.productType || product.product_type) === 'digital',
          isService: (product.productType || product.product_type) === 'service',
        })
        this._loadReviews(id)
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '加载失败', icon: 'none' })
      })
  },

  /** 轮播图切换 */
  onSwiperChange(e) {
    this.setData({ swiperCurrent: e.detail.current })
  },

  /** 预览图片 */
  onImagePreview(e) {
    const current = e.currentTarget.dataset.src
    wx.previewImage({
      current,
      urls: this.data.product.images,
    })
  },

  /** 打开 SKU 弹窗 — 加入购物车 */
  onAddCartTap() {
    if (!AuthUtil.requireLoginForAction('加入购物车')) return
    this.setData({ showSkuPanel: true, skuMode: 'cart', quantity: 1 })
  },

  /** 打开 SKU 弹窗 — 立即购买 */
  onBuyNowTap() {
    if (!AuthUtil.requireLoginForAction('购买商品')) return
    this.setData({ showSkuPanel: true, skuMode: 'buy', quantity: 1 })
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  /** 咨询服务 → 预约日历 */
  onBookTap() {
    if (!AuthUtil.requireLoginForAction('预约咨询')) return
    wx.navigateTo({ url: '/pages/appointment-calendar/appointment-calendar' })
  },

  onReviewsTap() {
    wx.navigateTo({ url: `/pages/reviews/reviews?productId=${this.data.id}` })
  },

  onServiceTap() {
    wx.navigateTo({ url: '/pages/service-chat/service-chat' })
  },

  onCouponEntry() {
    wx.navigateTo({ url: '/pages/coupon-list/coupon-list' })
  },

  _loadReviews(id) {
    try {
      const reviewService = require('../../services/review')
      reviewService.getProductReviews(id, { current: 1, size: 1 }).then((data) => {
        this.setData({
          reviewScore: (data && data.avgScore) || '4.9',
          reviewCount: (data && data.total) || 0,
        })
      }).catch(() => {})
    } catch (e) { /* ignore */ }
  },

  /** 关闭 SKU 弹窗 */
  onSkuPanelClose() {
    this.setData({ showSkuPanel: false })
  },

  /** 选择规格值（内联面板兼容） */
  onSpecValueTap(e) {
    const { spec, value } = e.currentTarget.dataset
    this._applySpec(spec, value)
  },

  /** sku-sheet 选规格 */
  onSkuSheetPick(e) {
    const { name, val } = e.detail || {}
    this._applySpec(name, val)
  },

  _applySpec(spec, value) {
    const selectedSkuValues = { ...this.data.selectedSkuValues }
    selectedSkuValues[spec] = value
    const matchedSku = this._matchSku(selectedSkuValues)
    this.setData({
      selectedSkuValues,
      selectedSku: matchedSku,
      stock: matchedSku ? matchedSku.stock : 0,
      quantity: 1,
    })
  },

  onSkuSheetQty(e) {
    const delta = (e.detail && e.detail.delta) || 0
    if (delta < 0) this.onQuantityMinus()
    else if (delta > 0) this.onQuantityPlus()
  },

  onSkuSheetCart() {
    this.setData({ skuMode: 'cart' })
    this.onSkuConfirm()
  },

  onSkuSheetBuy() {
    this.setData({ skuMode: 'buy' })
    this.onSkuConfirm()
  },

  /** 根据已选规格值匹配 SKU */
  _matchSku(selectedValues) {
    const skus = this.data.product.skuList || []
    const specs = this.data.product.specList || []
    if (skus.length === 0) return null
    for (const sku of skus) {
      let matched = true
      if (specs.length > 0 && sku.values) {
        for (let i = 0; i < specs.length; i++) {
          if (sku.values[i] !== selectedValues[specs[i].name]) {
            matched = false
            break
          }
        }
      }
      if (matched) return sku
    }
    return null
  },

  /** 数量减 */
  onQuantityMinus() {
    if (this.data.quantity <= 1) return
    this.setData({ quantity: this.data.quantity - 1 })
  },

  /** 数量加 */
  onQuantityPlus() {
    const max = this.data.stock
    if (this.data.quantity >= max) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }
    this.setData({ quantity: this.data.quantity + 1 })
  },

  /** 数量输入 */
  onQuantityInput(e) {
    let val = parseInt(e.detail.value) || 1
    const max = this.data.stock
    if (val < 1) val = 1
    if (val > max) val = max
    this.setData({ quantity: val })
  },

  /** SKU 弹窗确认 */
  onSkuConfirm() {
    if (this.data.submitting) return // D4：处理中禁止重复提交
    const { skuMode, selectedSku, quantity, product } = this.data
    if (!selectedSku && (product.skuList || []).length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (quantity > this.data.stock) {
      wx.showToast({ title: '库存不足', icon: 'none' })
      return
    }

    if (skuMode === 'cart') {
      this._addToCart()
    } else {
      this._buyNow()
    }
  },

  /** 加入购物车 */
  _addToCart() {
    const { product, selectedSku, quantity } = this.data
    const data = {
      product_id: product.id,
      sku_id: selectedSku ? selectedSku.id : '',
      quantity,
    }
    this.setData({ submitting: true })
    cartService.addToCart(data)
      .then(() => {
        wx.showToast({ title: '已加入购物车', icon: 'success' })
        this.setData({ showSkuPanel: false, submitting: false })
      })
      .catch(() => {
        wx.showToast({ title: '添加失败', icon: 'none' })
        this.setData({ submitting: false })
      })
  },

  /** 立即购买 → 跳转订单创建页 */
  _buyNow() {
    const { product, selectedSku, quantity } = this.data
    const item = {
      product_id: product.id,
      product_name: product.name,
      product_image: product.images[0] || '',
      sku_id: selectedSku ? selectedSku.id : '',
      sku_name: selectedSku ? (selectedSku.skuName || selectedSku.name || '') : '',
      price: selectedSku ? selectedSku.price : product.price,
      quantity,
    }
    // 编码传递
    const items = encodeURIComponent(JSON.stringify([item]))
    wx.navigateTo({
      url: `/pages/order-create/order-create?items=${items}&from=buy_now`,
    })
    this.setData({ showSkuPanel: false })
  },

  /** 分享 */
  onShareAppMessage() {
    const product = this.data.product
    return {
      title: product ? product.name : '商品详情',
      path: `/pages/product-detail/product-detail?id=${this.data.id}`,
    }
  },
})
