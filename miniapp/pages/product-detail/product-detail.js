// pages/product-detail/product-detail.js — 商品详情页
// 图片轮播、SKU选择弹窗、加购物车/立即购买

const productService = require('../../services/product')
const cartService = require('../../services/cart')
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig } = require('../../utils/share')

/** 相对上传路径 → 可访问的完整 URL */
function resolveMediaUrl(url) {
  const raw = String(url || '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw) || raw.indexOf('//') === 0) return raw
  const path = raw.indexOf('/') === 0 ? raw : `/${raw}`
  if (/^\/?uploads\//i.test(path) || path.indexOf('/uploads/') === 0) {
    return `https://zfculture.site${path}`
  }
  if (path.indexOf('/') === 0) {
    return `https://zfculture.site${path}`
  }
  return raw
}

/** 默认选最低价 SKU，与列表价（主表 min price）对齐 */
function pickLowestPriceSku(skus) {
  if (!skus || !skus.length) return null
  let best = skus[0]
  let bestPrice = Number(best && best.price)
  for (let i = 1; i < skus.length; i++) {
    const p = Number(skus[i].price)
    if (!Number.isFinite(p)) continue
    if (!Number.isFinite(bestPrice) || p < bestPrice) {
      best = skus[i]
      bestPrice = p
    }
  }
  return best
}

/** 详情长图无缝：图片块级、去边距；包裹段落也去缝 */
function seamlessDetailImages(html) {
  if (!html || typeof html !== 'string') return html || ''
  let out = html.replace(/<img\b([^>]*)>/gi, (_, attrs) => {
    let next = attrs
    const styleMatch = next.match(/\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i)
    const seamless =
      'display:block;width:100%;max-width:100%;height:auto;margin:0;padding:0;border:0;border-radius:0;vertical-align:top;'
    if (styleMatch) {
      const quote = styleMatch[0].includes("'") ? "'" : '"'
      const oldStyle = styleMatch[2] || styleMatch[3] || ''
      next = next.replace(styleMatch[0], ` style=${quote}${seamless}${oldStyle}${quote}`)
    } else {
      next = `${next} style="${seamless}"`
    }
    return `<img${next}>`
  })
  out = out.replace(
    /<(p|div)(\s[^>]*)?>\s*(<img\b[^>]*>)\s*<\/\1>/gi,
    '<$1 style="margin:0;padding:0;line-height:0;font-size:0;">$3</$1>'
  )
  return out
}

function couponRawFields(coupon) {
  const raw = (coupon && coupon.raw) || coupon || {}
  return {
    type: String(raw.couponType || raw.type || coupon.couponType || '').toLowerCase(),
    value: Number(
      raw.couponValue != null
        ? raw.couponValue
        : (raw.value != null ? raw.value : coupon.couponValue),
    ),
    min: Number(raw.minOrderAmount != null ? raw.minOrderAmount : raw.min_order_amount) || 0,
    scope: String(raw.scope || coupon.scope || 'all').toLowerCase(),
    scopeIds: raw.scopeIds || raw.scope_ids || coupon.scopeIds || [],
  }
}

function formatCouponLabel(coupon) {
  const { type, value } = couponRawFields(coupon)
  if (!Number.isFinite(value)) return '券'
  if (type === 'percent' || type === 'discount') {
    const rate = value > 1 ? value : value * 10
    return `${Number(rate.toFixed(1))}折`
  }
  return `¥${value}`
}

function formatCouponDesc(coupon) {
  const { min } = couponRawFields(coupon)
  if (Number.isFinite(min) && min > 0) return `满${min}可用`
  return '无门槛'
}

/** 按订单金额计算优惠额（元） */
function calcCouponDiscount(coupon, orderAmount) {
  const amount = Number(orderAmount) || 0
  if (!coupon || amount <= 0) return 0
  const { type, value } = couponRawFields(coupon)
  if (Number.isFinite(value) && value > 0) {
    if (type === 'percent' || type === 'discount') {
      const rate = value > 1 ? value / 10 : value
      const pay = amount * rate
      return Math.max(0, Number((amount - pay).toFixed(2)))
    }
    return Math.min(value, amount)
  }
  const label = String(coupon.label || '')
  const m = label.match(/¥\s*([\d.]+)/)
  if (m) return Math.min(parseFloat(m[1]) || 0, amount)
  return 0
}

function isCouponUsableForProduct(coupon, product, orderAmount) {
  const { scope, scopeIds, min } = couponRawFields(coupon)
  const ids = Array.isArray(scopeIds)
    ? scopeIds.map((x) => Number(x))
    : String(scopeIds || '').split(',').map((x) => Number(String(x).trim())).filter(Boolean)
  const productId = Number(product && (product.id || product.productId))
  const categoryId = Number(product && (product.categoryId || product.category_id))

  let scopeOk = true
  if (scope === 'product' && ids.length) {
    scopeOk = ids.indexOf(productId) !== -1
  } else if (scope === 'category' && ids.length) {
    scopeOk = ids.indexOf(categoryId) !== -1
  }

  const amountOk = !min || Number(orderAmount || 0) >= min

  let reason = ''
  if (!scopeOk) reason = '本商品不可用'
  else if (!amountOk) reason = `满${min}可用`

  return { usable: scopeOk && amountOk, disableReason: reason }
}

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
    skuMode: '', // 'cart' | 'buy' | 'select'
    selectedSku: null,
    selectedSkuValues: {}, // { 规格名: 规格值 }
    quantity: 1,
    submitting: false,
    stock: 0,

    // 优惠券
    showCouponSheet: false,
    couponList: [],
    selectedCouponId: '',
    selectedCoupon: null,
    couponEntryText: '满减可用',
    // 展示价（选券后为券后单价）
    displayPrice: '',
    displayOriginalPrice: '',
    hasCouponDiscount: false,
    skuCouponHint: '',
    discountAmountText: '',

    showServiceSheet: false,
    serviceItems: [
      { icon: '🚚', title: '快递发货', desc: '支付后尽快安排发货', rules: ['偏远地区时效可能延长'] },
      { icon: '🛡️', title: '售后保障', desc: '支持协商退换', rules: ['虚拟商品规则以页面说明为准'] },
    ],

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
        // 轮播图 = 主图 + images 去重（兼容只传了 mainImage 的情况）
        const gallery = Array.isArray(product.images) ? product.images.filter(Boolean) : []
        const main = product.mainImage || product.main_image || product.image || ''
        const merged = []
        const push = (u) => {
          const full = resolveMediaUrl(u)
          if (full && merged.indexOf(full) === -1) merged.push(full)
        }
        push(main)
        gallery.forEach(push)
        product.images = merged
        product.image = merged[0] || ''
        product.mainImage = merged[0] || resolveMediaUrl(main) || ''
        // 富文本内相对图也补全域名
        if (product.detail) {
          product.detail = String(product.detail).replace(
            /(src=["'])(\/uploads\/[^"']+)(["'])/gi,
            (_, a, p, b) => `${a}https://zfculture.site${p}${b}`,
          )
        }
        if (product.description) {
          product.description = String(product.description).replace(
            /(src=["'])(\/uploads\/[^"']+)(["'])/gi,
            (_, a, p, b) => `${a}https://zfculture.site${p}${b}`,
          )
        }
        // 处理 SKU 列表
        const skus = product.skus || product.sku_list || []
        product.skuList = skus
        // 处理规格
        const specs = product.specs || product.spec_list || []
        product.specList = specs
        // 默认选最低价规格，与列表展示价一致（避免列表 ¥1、详情首个规格 ¥9.9）
        let selectedSku = null
        let selectedSkuValues = {}
        if (skus.length > 0) {
          // 仅 1 个 SKU 时直接默认选中；多个则选最低价
          selectedSku = skus.length === 1 ? skus[0] : pickLowestPriceSku(skus)
          if (selectedSku && selectedSku.price != null) {
            product.price = selectedSku.price
          }
          if (specs.length > 0 && selectedSku) {
            specs.forEach((spec, idx) => {
              // 规格值仅一个时默认选它
              const only = Array.isArray(spec.values) && spec.values.length === 1 ? spec.values[0] : null
              selectedSkuValues[spec.name] = selectedSku.values
                ? selectedSku.values[idx] || only || spec.values[0]
                : (only || spec.values[0])
            })
          }
        }
        product.categoryId = product.categoryId || product.category_id || null
        // 富文本（详情拼图去缝）
        let richContent = ''
        if (product.detail && product.detail.indexOf('<') !== -1) {
          richContent = product.detail
        } else if (product.description && product.description.indexOf('<') !== -1) {
          richContent = product.description
        }
        richContent = seamlessDetailImages(richContent)
        const typeList = Array.isArray(product.productTypes)
          ? product.productTypes
          : [product.productType || product.product_type || 'physical']
        const hasDigital = typeList.indexOf('digital') !== -1
        const hasService = typeList.indexOf('service') !== -1
        const hasPhysical = typeList.indexOf('physical') !== -1
        this.setData({
          product,
          loading: false,
          selectedSku,
          selectedSkuValues,
          stock: selectedSku ? selectedSku.stock : (product.stock || 0),
          richContent,
          isDigital: hasDigital && !hasPhysical,
          isService: hasService,
          productTypes: typeList,
        }, () => this._syncCouponAndPrice())
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

  /** 轮播图加载失败：去掉坏图，避免空白顶布局 */
  onSwiperImageError(e) {
    const idx = Number(e.currentTarget.dataset.index)
    const images = (this.data.product && this.data.product.images) || []
    if (!Number.isFinite(idx) || idx < 0 || idx >= images.length) return
    const next = images.filter((_, i) => i !== idx)
    this.setData({
      'product.images': next,
      swiperCurrent: Math.min(this.data.swiperCurrent, Math.max(0, next.length - 1)),
    })
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

  /** 进入购物车 */
  onGoCartTap() {
    wx.navigateTo({ url: '/pages/cart/cart' })
  },

  onCouponEntry() {
    if (!AuthUtil.requireLoginForAction('查看优惠券')) return
    this._openCouponSheet()
  },

  onSelectSpecTap() {
    this.setData({ showSkuPanel: true, skuMode: 'select', quantity: this.data.quantity || 1 })
  },

  onServiceEntry() {
    this.setData({ showServiceSheet: true })
  },

  onServiceClose() {
    this.setData({ showServiceSheet: false })
  },

  noop() {},

  _currentUnitPrice() {
    const { selectedSku, product } = this.data
    return Number(selectedSku ? selectedSku.price : (product && product.price)) || 0
  },

  _currentOrderAmount() {
    return this._currentUnitPrice() * (this.data.quantity || 1)
  },

  /** 同步优惠券文案 + 券后价展示 */
  _syncCouponAndPrice() {
    const unit = this._currentUnitPrice()
    const qty = this.data.quantity || 1
    const amount = unit * qty
    let coupon = this.data.selectedCoupon
    let couponId = this.data.selectedCouponId || ''

    if (coupon && this.data.product) {
      const check = isCouponUsableForProduct(coupon.raw || coupon, this.data.product, amount)
      if (!check.usable) {
        coupon = null
        couponId = ''
      }
    }

    const discount = coupon ? calcCouponDiscount(coupon, amount) : 0
    const payTotal = Math.max(0, amount - discount)
    const payUnit = qty > 0 ? payTotal / qty : payTotal
    const hasDiscount = !!(coupon && discount > 0)
    const unitStr = Number(unit).toFixed(2).replace(/\.00$/, '')
    const payUnitStr = Number(payUnit).toFixed(2).replace(/\.00$/, '')

    let couponEntryText = '满减可用'
    let skuCouponHint = ''
    if (coupon) {
      const name = coupon.name || '优惠券'
      couponEntryText = hasDiscount
        ? `${name} · 已减¥${discount.toFixed(2)}`
        : (name || coupon.label || '已选优惠券')
      skuCouponHint = hasDiscount ? `已用券：${name}，本单减¥${discount.toFixed(2)}` : `已选：${name}`
    }

    this.setData({
      selectedCoupon: coupon,
      selectedCouponId: couponId,
      couponEntryText,
      displayPrice: hasDiscount ? payUnitStr : unitStr,
      displayOriginalPrice: hasDiscount ? unitStr : '',
      hasCouponDiscount: hasDiscount,
      discountAmountText: hasDiscount ? discount.toFixed(2) : '',
      skuCouponHint,
    })
  },

  _openCouponSheet() {
    const product = this.data.product
    const amount = this._currentOrderAmount()
    wx.showLoading({ title: '加载中', mask: true })
    couponService.getMyCoupons({ status: 'unused' })
      .then((res) => {
        const raw = (res && (res.records || res.list || res.items)) || (Array.isArray(res) ? res : [])
        const couponList = (raw || []).map((item) => {
          const id = String(item.id)
          const check = isCouponUsableForProduct(item, product, amount)
          const fields = couponRawFields(item)
          return {
            id,
            name: item.couponName || item.coupon_name || item.name || '优惠券',
            label: formatCouponLabel(item),
            desc: formatCouponDesc(item),
            usable: check.usable,
            disableReason: check.disableReason,
            couponType: fields.type,
            couponValue: fields.value,
            raw: item,
          }
        })
        couponList.sort((a, b) => Number(b.usable) - Number(a.usable))
        this.setData({
          couponList,
          showCouponSheet: true,
          selectedCouponId: this.data.selectedCouponId || '',
        })
      })
      .catch(() => {
        this.setData({ couponList: [], showCouponSheet: true })
      })
      .finally(() => wx.hideLoading())
  },

  onCouponSheetClose() {
    this.setData({ showCouponSheet: false })
  },

  onCouponSheetPick(e) {
    const id = (e.detail && e.detail.id) || ''
    this.setData({ selectedCouponId: id === undefined || id === null ? '' : String(id) })
  },

  onCouponSheetConfirm(e) {
    const id = String((e.detail && e.detail.id) || this.data.selectedCouponId || '')
    const hit = (this.data.couponList || []).find((c) => String(c.id) === id)
    this.setData({
      selectedCouponId: id,
      selectedCoupon: id && hit ? hit : null,
      showCouponSheet: false,
    }, () => this._syncCouponAndPrice())
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
    }, () => this._syncCouponAndPrice())
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
    this.setData({ quantity: this.data.quantity - 1 }, () => this._syncCouponAndPrice())
  },

  /** 数量加 */
  onQuantityPlus() {
    const max = this.data.stock
    if (this.data.quantity >= max) {
      wx.showToast({ title: '已达库存上限', icon: 'none' })
      return
    }
    this.setData({ quantity: this.data.quantity + 1 }, () => this._syncCouponAndPrice())
  },

  /** 数量输入 */
  onQuantityInput(e) {
    let val = parseInt(e.detail.value) || 1
    const max = this.data.stock
    if (val < 1) val = 1
    if (val > max) val = max
    this.setData({ quantity: val }, () => this._syncCouponAndPrice())
  },

  /** SKU 弹窗确认 */
  onSkuConfirm() {
    if (this.data.submitting) return
    const { skuMode, selectedSku, quantity, product } = this.data
    if (!selectedSku && (product.skuList || []).length > 0) {
      wx.showToast({ title: '请选择规格', icon: 'none' })
      return
    }
    if (skuMode === 'select') {
      this.setData({ showSkuPanel: false })
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
    const { product, selectedSku, quantity, selectedCouponId, selectedCoupon } = this.data
    const item = {
      product_id: product.id,
      product_name: product.name,
      product_image: product.images[0] || '',
      sku_id: selectedSku ? selectedSku.id : '',
      sku_name: selectedSku ? (selectedSku.skuName || selectedSku.name || '') : '',
      price: selectedSku ? selectedSku.price : product.price,
      quantity,
    }
    const items = encodeURIComponent(JSON.stringify([item]))
    let url = `/pages/order-create/order-create?items=${items}&from=buy_now`
    if (selectedCouponId) {
      url += `&userCouponId=${encodeURIComponent(selectedCouponId)}`
      if (selectedCoupon) {
        url += `&couponName=${encodeURIComponent(selectedCoupon.name || '')}`
        url += `&couponLabel=${encodeURIComponent(selectedCoupon.label || '')}`
        const fields = couponRawFields(selectedCoupon)
        if (fields.type) url += `&couponType=${encodeURIComponent(fields.type)}`
        if (Number.isFinite(fields.value)) url += `&couponValue=${encodeURIComponent(String(fields.value))}`
      }
    }
    wx.navigateTo({ url })
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
