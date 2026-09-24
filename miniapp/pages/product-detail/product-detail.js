// pages/product-detail/product-detail.js — 商品详情页
// 图片轮播、SKU选择弹窗、加购物车/立即购买

const productService = require('../../services/product')
const cartService = require('../../services/cart')
const couponService = require('../../services/coupon')
const { AuthUtil } = require('../../utils/auth')
const { createSharePageConfig, openWarmShareSheet } = require('../../utils/share')
const { previewRichHtmlImages } = require('../../utils/rich-html')
const { USE_LOCAL_SOURCE } = require('../../data/warm-source')
const iosVirtualPay = require('../../utils/iosVirtualPay')

function getStatusBarHeight() {
  try {
    const sys = wx.getSystemInfoSync()
    return Number(sys.statusBarHeight) || 20
  } catch (e) {
    return 20
  }
}

function virtualRefundNotice(product) {
  const fallback = '⚠️ 虚拟商品说明：数字内容支付成功后立即开通权限，退款规则见下单页说明。'
  try {
    const app = getApp()
    const rules = app && app.globalData && app.globalData.commerceVirtualRefundRules
    if (!rules || typeof rules !== 'object') return fallback
    const ptype = String((product && (product.productType || product.product_type)) || 'ebook').toLowerCase()
    const row = (rules.byProductType || {})[ptype] || (rules.byProductType || {}).ebook
    const label = row && row.label ? row.label : '退款规则见下单页说明'
    return `⚠️ 虚拟商品说明：${label}。支付成功即开通权限。`
  } catch (e) {
    return fallback
  }
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n)
}

function formatCountdown(ms) {
  if (ms <= 0) return '首发价已结束'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `首发价剩余 ${pad2(h)}:${pad2(m)}:${pad2(s)}`
}

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
    priceReady: false,
    displayOriginalPrice: '',
    memberFree: false,
    memberPrice: null,
    hasCouponDiscount: false,
    skuCouponHint: '',
    discountAmountText: '',
    coverUrl: '',
    buyCtaText: '立即购买',

    showServiceSheet: false,
    serviceItems: [
      { icon: '🚚', title: '快递发货', desc: '支付后尽快安排发货', rules: ['偏远地区时效可能延长'] },
      { icon: '🛡️', title: '售后保障', desc: '支持协商退换', rules: ['虚拟商品规则以页面说明为准'] },
    ],

    // 富文本描述
    richContent: '',
    isDigital: false,
    isService: false,
    reviewScore: '',
    reviewCount: 0,
    // 勿预置演示文案：真实商品未返回 gains 时会残留旧模板观感
    gains: [],
    whoFor: '',
    faqs: [],
    isColumn: false,
    isEbook: false,
    isWarmDigital: false,
    isWarmPhysical: false,
    columnChapters: [],
    columnGroups: [],
    columnPts: [],
    columnIntro: [],
    columnIntroImage: '',
    columnMetaLine: '',
    columnSeg: 'toc',
    columnSegs: [
      { key: 'toc', label: '目录 32' },
      { key: 'reviews', label: '评价 1.6k' },
      { key: 'faq', label: '常见问题' },
    ],
    columnReviews: [],
    columnFaqs: [],
    reviewCountLabel: '',
    ebookAbout: [],
    ebookIntroImage: '',
    ebookToc: [],
    ebookReviews: [],
    ebookTitle: '',
    ebookMetaLine: '',
    ebookCtaText: '立即购买',
    digiNotice: '',
    memberPerk: '另享资料库全解锁',
    teacher: null,
    earlyBirdLabel: '早鸟价剩余 02 天 14:26',
    purchased: false,
    goodsSpecs: [],
    tryReadCfg: '试读范围由后台配置',
    tryReadTitle: '',
    tryReadParagraphs: [],
    tryReadDone: 0,
    tryReadTotal: 0,
    tryReadPercent: 0,
    statusBarHeight: getStatusBarHeight(),
    launchCountdown: '',
  },

  onLoad(options) {
    this.setData({ statusBarHeight: getStatusBarHeight() })
    const id = options && options.id
    const demo = options && options.demo
    // demo=pay1|1：¥1 支付验通路；demo=column|ebook|goods：专栏/电子书演示
    if (demo === 'pay1' || demo === '1') {
      this._applyDemo('pay1')
      this._resolvePay1ProductId()
      return
    }
    if (demo === 'column' || demo === 'ebook' || demo === 'goods' || (USE_LOCAL_SOURCE && (!id || demo))) {
      const mode = (demo === 'goods' || demo === 'ebook') ? 'ebook' : 'column'
      this._applyDemo(mode)
      return
    }
    if (!id) {
      this.setData({ loading: false })
      wx.showToast({ title: '商品不存在', icon: 'none' })
      return
    }
    this.setData({ id })
    this._loadDetail(id)
  },

  onUnload() {
    this._stopLaunchCountdown()
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages && pages.length > 1) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.switchTab({ url: '/pages/shop/shop' })
  },

  _stopLaunchCountdown() {
    if (this._launchTimer) {
      clearInterval(this._launchTimer)
      this._launchTimer = null
    }
  },

  _startLaunchCountdown(endMs) {
    this._stopLaunchCountdown()
    const end = Number(endMs)
    if (!Number.isFinite(end) || end <= Date.now()) {
      this.setData({ launchCountdown: '' })
      return
    }
    const tick = () => {
      this.setData({ launchCountdown: formatCountdown(end - Date.now()) })
    }
    tick()
    this._launchTimer = setInterval(tick, 1000)
  },

  _ebookTryFields(g, product) {
    const tr = (g && g.tryRead) || {}
    const previewRaw = product
      ? (product.previewChapters != null ? product.previewChapters : product.preview_chapters)
      : null
    const done = previewRaw > 0 ? Number(previewRaw) : Number(tr.readChapters) || 0
    const total = Number(product && (product.chapterCount || product.chapter_count))
      || Number(tr.totalChapters)
      || 0
    const percent = total > 0
      ? Math.max(1, Math.round((done / total) * 100))
      : 0
    return {
      tryReadCfg: tr.cfg || '',
      tryReadTitle: tr.title || '',
      tryReadParagraphs: Array.isArray(tr.paragraphs) && tr.paragraphs.length
        ? tr.paragraphs
        : (tr.body ? String(tr.body).split('\n').filter(Boolean) : []),
      tryReadDone: done,
      tryReadTotal: total,
      tryReadPercent: percent,
    }
  },

  _applyDemo(mode) {
    const { DEMO_COLUMN, DEMO_GOODS, DEMO_PAY1 } = require('../../data/warm-demo')
    if (mode === 'pay1') {
      const g = DEMO_PAY1
      this.setData({
        loading: false,
        isEbook: false,
        isColumn: false,
        isDigital: true,
        isWarmDigital: true,
        isWarmPhysical: false,
        id: '',
        product: {
          name: g.title,
          price: g.price,
          original_price: g.original,
          originalPrice: g.original,
          images: [g.cover],
          mainImage: g.cover,
          description: g.description,
          productType: g.productType || 'digital',
          product_type: g.productType || 'digital',
          productTypes: ['digital'],
          deliveryMode: g.deliveryMode || 'auto',
          delivery_mode: g.deliveryMode || 'auto',
          skuList: [],
        },
        coverUrl: g.cover,
        displayPrice: String(g.price),
        priceReady: true,
        goodsSpecs: g.specs || [],
        gains: g.gains || [],
        ebookTitle: g.title,
        ebookMetaLine: g.metaLine || g.subtitle || '',
        ebookAbout: g.about || [],
        ebookCtaText: `¥${g.price} 立即购买`,
        digiNotice: g.notice || '',
      })
      wx.setNavigationBarTitle({ title: g.title })
      return
    }
    if (mode === 'ebook') {
      const g = DEMO_GOODS
      this.setData({
        loading: false,
        isEbook: true,
        isColumn: false,
        isDigital: true,
        isWarmDigital: false,
        isWarmPhysical: false,
        product: {
          name: g.title,
          price: g.price,
          original_price: g.original,
          originalPrice: g.original,
          images: [g.cover],
          mainImage: g.cover,
          description: '数字内容，支付成功后立即开通阅读权限。',
        },
        coverUrl: g.cover,
        displayPrice: String(g.price),
        priceReady: true,
        memberPrice: g.memberPrice,
        memberPerk: g.memberPerk || '另享资料库全解锁',
        goodsSpecs: g.specs,
        reviewScore: '4.9',
        reviewCount: 826,
        reviewCountLabel: g.reviewCountLabel || '826',
        ebookTitle: g.title,
        ebookMetaLine: g.metaLine || '墨白 著 · 12 万字 · EPUB / PDF · ⭐️ 4.9',
        ebookCtaText: '¥39 立即购买',
        ebookAbout: g.about || [],
        ebookIntroImage: g.introImage || '',
        ebookToc: g.toc || [],
        ebookReviews: g.reviews || [],
        ...this._ebookTryFields(g),
      })
      this._startLaunchCountdown()
      return
    }
    const c = DEMO_COLUMN
    this.setData({
      loading: false,
      isColumn: true,
      isEbook: false,
      isDigital: true,
      isWarmDigital: false,
      isWarmPhysical: false,
      product: {
        name: c.title,
        price: c.price,
        original_price: c.original,
        images: [c.cover],
        mainImage: c.cover,
        description: '连载专栏，每周三更新。',
        tag: c.tag,
      },
      coverUrl: c.cover,
      displayPrice: String(c.price),
      priceReady: true,
      buyCtaText: `¥${c.price} 立即加入`,
      teacher: c.teacher,
      earlyBirdLabel: '早鸟价剩余 02 天 14:26',
      purchased: false,
      columnChapters: c.chapters,
      columnGroups: c.chapterGroups || [{ title: '目录', items: c.chapters }],
      columnPts: c.pts || [],
      columnIntro: c.intro || [],
      columnIntroImage: c.introImage || '',
      columnMetaLine: `${c.chapterCount || 32} 讲 · ${c.learners || '1.2 万人在学'} · ⭐️ 4.9`,
      columnSeg: 'toc',
      columnSegs: [
        { key: 'toc', label: `目录 ${c.chapterCount || 32}` },
        { key: 'reviews', label: `评价 ${c.reviewCountLabel || '1.6k'}` },
        { key: 'faq', label: '常见问题' },
      ],
      columnReviews: c.reviews || [],
      columnFaqs: c.faqs || [],
      reviewScore: '4.9',
      reviewCount: 1600,
      reviewCountLabel: c.reviewCountLabel || '1.6k',
    })
    wx.setNavigationBarTitle({ title: '专栏' })
  },

  onColumnSeg(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.columnSeg) return
    this.setData({ columnSeg: key })
  },

  /** demo=pay1：解析/补种真实 productId，便于真实下单 */
  _resolvePay1ProductId() {
    const { resolvePay1ProductId, hasValidProductId } = require('../../utils/pay1-product')
    resolvePay1ProductId().then((id) => {
      if (!hasValidProductId(id)) return
      const product = Object.assign({}, this.data.product || {}, { id })
      this.setData({ id: String(id), product })
    }).catch(() => {})
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
        const typeStr = typeList.map((t) => String(t || '').toLowerCase()).join(',')
        const { DEMO_COLUMN, DEMO_GOODS } = require('../../data/warm-demo')
        const isColumn = /column|专栏/.test(typeStr)
        const isEbook = (/ebook|电子书/.test(typeStr) || (/内容生意手册/.test(String(product.name || '')) && !isColumn))
          && !/resource_pack|资料|membership|会员|physical|周边|column|专栏/.test(typeStr)
        const pname = String(product.name || '')
        const isPay1Name = /暖阁体验包|体验包.*1元/.test(pname)
        if (product.originalPrice != null && product.original_price == null) {
          product.original_price = product.originalPrice
        }
        const hasDigital = typeList.indexOf('digital') !== -1
          || typeList.indexOf('resource_pack') !== -1
          || isColumn || isEbook || isPay1Name
        const hasService = typeList.indexOf('service') !== -1
        const hasPhysical = typeList.indexOf('physical') !== -1
        const isMembershipType = /membership|会员/.test(typeStr)
        const isResourcePack = /resource_pack|资料/.test(typeStr)
        const deliveryMode = String(product.deliveryMode || product.delivery_mode || '').toLowerCase()
        const autoDeliver = deliveryMode === 'auto' || deliveryMode === 'virtual' || deliveryMode === 'online'
        // 暖阁虚拟壳：电子资料/会员/体验包；auto 交付或无实物标记时优先虚拟，避免落到旧电商模板
        const isWarmDigital = !isColumn && !isEbook
          && (
            isPay1Name
            || isResourcePack
            || isMembershipType
            || autoDeliver
            || (hasDigital && !hasPhysical)
            || (/digital|虚拟/.test(typeStr) && !hasPhysical)
          )
        const isWarmPhysical = !isColumn && !isEbook && !isWarmDigital
        const memberFreeRaw = product.memberFree != null ? product.memberFree : product.member_free
        const memberFree = memberFreeRaw === true || memberFreeRaw === 1 || memberFreeRaw === '1'
        const memberPriceRaw = product.memberPrice != null ? product.memberPrice : product.member_price
        const memberPrice = memberFree
          ? null
          : (memberPriceRaw != null && memberPriceRaw !== '' && Number(memberPriceRaw) > 0
            ? memberPriceRaw
            : null)
        let chapters = Array.isArray(product.chapters) && product.chapters.length
          ? product.chapters
          : []
        let chapterGroups = Array.isArray(product.chapterGroups) && product.chapterGroups.length
          ? product.chapterGroups
          : (Array.isArray(product.chapter_groups) && product.chapter_groups.length
            ? product.chapter_groups
            : [])
        // 后端暂无章节表：专栏真实 id 进详情时目录为空 → 暖阁 DEMO 兜底（与 demo=column 一致）
        const useWarmColumnShell = isColumn
          && !chapters.length
          && !chapterGroups.length
          && /一个人的内容生意/.test(pname)
        if (useWarmColumnShell) {
          chapters = DEMO_COLUMN.chapters || []
          chapterGroups = DEMO_COLUMN.chapterGroups || [{ title: '目录', items: chapters }]
        } else if (isColumn && !chapterGroups.length && chapters.length) {
          chapterGroups = [{ title: '目录', items: chapters }]
        }
        const purchased = product.purchased === true || product.purchased === 1
        const priceReady = product.price != null && product.price !== '' && Number.isFinite(Number(product.price))
        const priceLabel = priceReady
          ? (Number.isInteger(Number(product.price))
            ? String(Number(product.price))
            : String(product.price))
          : ''
        const coverUrl = (product.images && product.images[0]) || product.mainImage || ''
        const productGains = Array.isArray(product.gains) ? product.gains : []
        const chapterCount = Number(
          product.chapterCount
          || product.chapter_count
          || (useWarmColumnShell ? DEMO_COLUMN.chapterCount : 0)
          || chapters.length
        ) || 0
        const ebookTitle = isEbook ? (product.name || '') : ''
        // 电子书 toc 空时同样用暖阁 DEMO 补齐试读目录（仅「内容生意手册」）
        let ebookToc = Array.isArray(product.toc) ? product.toc : []
        const useWarmEbookShell = isEbook && !ebookToc.length && /内容生意手册/.test(pname)
        if (useWarmEbookShell) ebookToc = DEMO_GOODS.toc || []
        const defaultDigiSpecs = isWarmDigital
          ? [
              {
                k: '商品类型',
                v: isMembershipType ? '虚拟商品 · 会员' : (isResourcePack ? '虚拟商品 · 资料包' : '虚拟商品 · 数字内容'),
              },
              {
                k: '交付方式',
                vBefore: '支付后立即到账，',
                em: '在小程序内开通',
                vAfter: '，不发实体',
                v: '支付后立即到账，在小程序内开通，不发实体',
              },
              { k: '有效期', v: '永久有效 · 换手机登录同一微信可继续用' },
            ]
          : []
        const ebookPatch = isEbook
          ? {
              goodsSpecs: Array.isArray(product.specs) && product.specs.length
                ? product.specs
                : (useWarmEbookShell ? (DEMO_GOODS.specs || []) : []),
              gains: productGains,
              ebookAbout: product.description
                ? [String(product.description)]
                : (useWarmEbookShell ? (DEMO_GOODS.about || []) : []),
              ebookIntroImage: useWarmEbookShell ? (DEMO_GOODS.introImage || '') : '',
              ebookToc,
              ebookReviews: useWarmEbookShell ? (DEMO_GOODS.reviews || []) : [],
              ebookTitle,
              ebookMetaLine: product.subtitle || product.sub
                || (useWarmEbookShell ? DEMO_GOODS.metaLine : ''),
              ebookCtaText: purchased ? '开始阅读' : (priceReady ? `¥${priceLabel} 立即购买` : '立即购买'),
              memberPerk: useWarmEbookShell ? (DEMO_GOODS.memberPerk || '') : '',
              reviewCountLabel: useWarmEbookShell ? (DEMO_GOODS.reviewCountLabel || '') : '',
              displayPrice: priceLabel,
              priceReady,
              digiNotice: '',
              ...this._ebookTryFields(useWarmEbookShell ? DEMO_GOODS : null, product),
            }
          : isWarmDigital
            ? {
                goodsSpecs: Array.isArray(product.specs) && product.specs.length
                  ? product.specs
                  : defaultDigiSpecs,
                gains: productGains,
                ebookAbout: product.description ? [String(product.description)] : [],
                ebookIntroImage: '',
                ebookToc: [],
                ebookReviews: [],
                ebookTitle: pname,
                ebookMetaLine: product.subtitle || product.sub
                  || (isMembershipType ? '会员权益 · 支付后立即开通' : '虚拟商品 · 支付后立即开通'),
                ebookCtaText: purchased ? '立即使用' : (priceReady ? `¥${priceLabel} 立即购买` : '立即购买'),
                memberPerk: '',
                reviewCountLabel: '',
                displayPrice: priceLabel,
                priceReady,
                digiNotice: virtualRefundNotice(product),
              }
          : {
              goodsSpecs: [],
              gains: productGains,
              ebookAbout: [],
              ebookIntroImage: '',
              ebookToc: [],
              ebookReviews: [],
              ebookTitle: '',
              ebookMetaLine: '',
              ebookCtaText: purchased ? '再次购买' : (priceReady ? `¥${priceLabel} 立即购买` : '立即购买'),
              memberPerk: '',
              reviewCountLabel: '',
              displayPrice: priceLabel,
              priceReady,
              digiNotice: '',
              buyCtaText: purchased ? '再次购买' : (priceReady ? `¥${priceLabel} 立即购买` : '立即购买'),
            }
        if (isEbook && product.originalPrice != null && product.original_price == null) {
          product.original_price = product.originalPrice
        }
        if (isEbook) {
          const endRaw = product.launchEndAt || product.launch_end_at || product.promoEndAt || product.promo_end_at
          const endMs = endRaw ? new Date(endRaw).getTime() : 0
          this._startLaunchCountdown(Number.isFinite(endMs) && endMs > Date.now() ? endMs : 0)
        } else {
          this._stopLaunchCountdown()
        }
        if (isColumn && product.originalPrice != null && product.original_price == null) {
          product.original_price = product.originalPrice
        }
        if (isColumn && !product.tag && useWarmColumnShell) {
          product.tag = DEMO_COLUMN.tag
        }
        const warmCol = useWarmColumnShell ? DEMO_COLUMN : null
        if (isColumn) {
          ebookPatch.buyCtaText = purchased
            ? '立即学习'
            : (priceReady ? `¥${priceLabel} 立即加入` : '立即加入')
          ebookPatch.gains = productGains
          ebookPatch.displayPrice = priceLabel
          ebookPatch.priceReady = priceReady
        }
        this.setData({
          product,
          loading: false,
          selectedSku,
          selectedSkuValues,
          stock: selectedSku ? selectedSku.stock : (product.stock || 0),
          richContent,
          isDigital: (hasDigital && !hasPhysical) || isColumn || isEbook || isWarmDigital,
          isService: hasService,
          isColumn,
          isEbook,
          isWarmDigital,
          isWarmPhysical,
          coverUrl,
          gains: productGains,
          productTypes: typeList,
          memberFree,
          memberPrice,
          teacher: product.teacher || (warmCol && warmCol.teacher) || null,
          earlyBirdLabel: warmCol ? '早鸟价剩余 02 天 14:26' : '',
          purchased,
          columnChapters: chapters,
          columnGroups: isColumn ? chapterGroups : [],
          columnPts: (warmCol && warmCol.pts) || [],
          columnIntro: (warmCol && warmCol.intro)
            || (product.description ? [String(product.description)] : []),
          columnIntroImage: (warmCol && warmCol.introImage) || '',
          columnMetaLine: isColumn
            ? (warmCol
              ? `${warmCol.chapterCount || chapterCount || 32} 讲 · ${warmCol.learners || '1.2 万人在学'} · ⭐️ 4.9`
              : (chapterCount ? `${chapterCount} 讲` : ''))
            : '',
          columnSeg: 'toc',
          columnSegs: isColumn
            ? [
                { key: 'toc', label: chapterCount ? `目录 ${chapterCount}` : '目录' },
                {
                  key: 'reviews',
                  label: warmCol
                    ? `评价 ${warmCol.reviewCountLabel || '1.6k'}`
                    : '评价',
                },
                { key: 'faq', label: '常见问题' },
              ]
            : [],
          columnReviews: (warmCol && warmCol.reviews) || [],
          columnFaqs: (warmCol && warmCol.faqs) || [],
          reviewScore: warmCol ? '4.9' : '',
          reviewCountLabel: (warmCol && warmCol.reviewCountLabel) || '',
          ...ebookPatch,
        }, () => this._syncCouponAndPrice())
        if (!useWarmColumnShell) this._loadReviews(id)
      })
      .catch(() => {
        this.setData({ loading: false })
        wx.showToast({ title: '商品加载失败', icon: 'none' })
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

  /** 打开 SKU 弹窗 — 立即购买（电子书无规格时直达下单页） */
  onBuyNowTap() {
    if (!AuthUtil.requireLoginForAction('购买商品')) return
    const skuList = (this.data.product && this.data.product.skuList) || []
    if ((this.data.isEbook || this.data.isDigital || this.data.isWarmDigital) && skuList.length === 0) {
      this._buyNow()
      return
    }
    this.setData({ showSkuPanel: true, skuMode: 'buy', quantity: 1 })
  },

  onTryListenTap() {
    const free = (this.data.columnChapters || []).find((c) => c.free)
    wx.showToast({
      title: free ? `试听：${free.title}` : '可先试听前两讲',
      icon: 'none',
    })
  },

  /** 电子书试读 → 试读章节正文（DEMO 样章 / 首个可试读章） */
  onTrialTap() {
    const toc = this.data.ebookToc || []
    const free = toc.find((c) => c && c.free && (c.contentId || c.content_id || c.id))
    const contentId = free
      ? (free.contentId || free.content_id || free.id)
      : ''
    if (contentId && String(contentId).indexOf('warm-demo') !== 0) {
      wx.navigateTo({
        url: `/pages/content-detail/content-detail?id=${encodeURIComponent(contentId)}`,
        fail: () => this._openEbookTrialDemo(),
      })
      return
    }
    this._openEbookTrialDemo()
  },

  _openEbookTrialDemo() {
    wx.navigateTo({
      url: '/pages/content-detail/content-detail?demo=ebook-trial',
      fail: () => {
        wx.navigateTo({ url: '/pages/file-preview/file-preview?demo=1&name=' + encodeURIComponent('内容生意手册·试读.pdf') })
      },
    })
  },

  onTocTap(e) {
    const free = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.free
    if (free) {
      this.onTrialTap()
      return
    }
    wx.showToast({ title: '购买后可读全文', icon: 'none' })
  },

  onShareTap() {
    const product = this.data.product || {}
    const id = this.data.id || ''
    const isPay1 = this.data.isWarmDigital && /暖阁体验包|体验包.*1元/.test(String(product.name || ''))
    const path = id
      ? `/pages/product-detail/product-detail?id=${id}`
      : (isPay1
        ? '/pages/product-detail/product-detail?demo=pay1'
        : '/pages/product-detail/product-detail?demo=ebook')
    openWarmShareSheet({
      title: product.name || this.data.ebookTitle || '商品详情',
      path,
      cover: (product.images && product.images[0]) || product.mainImage || '',
      quote: this.data.ebookMetaLine || product.description || '',
    })
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' })
  },

  /** 咨询服务 → 预约日历 */
  onBookTap() {
    if (!AuthUtil.requireLoginForAction('预约咨询')) return
    wx.navigateTo({ url: '/pkg-trade/appointment-calendar/appointment-calendar' })
  },

  onReviewsTap() {
    wx.navigateTo({ url: `/pkg-trade/reviews/reviews?productId=${this.data.id}` })
  },

  onFavoriteTap() {
    wx.showToast({ title: '已收藏', icon: 'success' })
  },

  onGoMember() {
    wx.navigateTo({
      url: '/pkg-user/member-center/member-center',
      fail: () => {
        wx.navigateTo({
          url: '/pages/member-center/member-center',
          fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
        })
      },
    })
  },

  onServiceTap() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
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

  _rawUnitPrice() {
    const { selectedSku, product } = this.data
    if (selectedSku && selectedSku.price != null && selectedSku.price !== '') return selectedSku.price
    if (product && product.price != null && product.price !== '') return product.price
    return null
  },

  _hasValidPrice() {
    const raw = this._rawUnitPrice()
    if (raw == null || raw === '') return false
    return Number.isFinite(Number(raw))
  },

  _formatPriceLabel(raw) {
    if (raw == null || raw === '') return ''
    const n = Number(raw)
    if (!Number.isFinite(n)) return ''
    return Number.isInteger(n) ? String(n) : String(n)
  },

  _currentUnitPrice() {
    const raw = this._rawUnitPrice()
    return raw == null || raw === '' ? 0 : (Number(raw) || 0)
  },

  _currentOrderAmount() {
    return this._currentUnitPrice() * (this.data.quantity || 1)
  },

  _buyCtaText(purchased, isDigitalLike) {
    if (purchased) return isDigitalLike ? '立即使用' : '再次购买'
    if (!this._hasValidPrice()) return '立即购买'
    return `¥${this._formatPriceLabel(this._rawUnitPrice())} 立即购买`
  },

  /** 同步优惠券文案 + 券后价展示 */
  _syncCouponAndPrice() {
    const priceReady = this._hasValidPrice()
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
    const hasDiscount = !!(coupon && discount > 0 && priceReady)
    const unitStr = priceReady ? Number(unit).toFixed(2).replace(/\.00$/, '') : ''
    const payUnitStr = priceReady ? Number(payUnit).toFixed(2).replace(/\.00$/, '') : ''
    const displayPrice = hasDiscount ? payUnitStr : unitStr
    const purchased = !!this.data.purchased
    let buyCtaText = this.data.buyCtaText || '立即购买'
    let ebookCtaText = this.data.ebookCtaText || '立即购买'
    if (this.data.isWarmPhysical) {
      buyCtaText = this._buyCtaText(purchased, false)
    } else if (this.data.isColumn) {
      buyCtaText = purchased ? '立即学习' : (priceReady ? `¥${displayPrice} 立即加入` : '立即加入')
      ebookCtaText = buyCtaText
    } else if (this.data.isEbook) {
      ebookCtaText = purchased ? '开始阅读' : (priceReady ? `¥${displayPrice} 立即购买` : '立即购买')
      buyCtaText = ebookCtaText
    } else if (this.data.isWarmDigital) {
      ebookCtaText = purchased ? '立即使用' : (priceReady ? `¥${displayPrice} 立即购买` : '立即购买')
      buyCtaText = ebookCtaText
    }

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
      displayPrice,
      priceReady,
      displayOriginalPrice: hasDiscount ? unitStr : '',
      hasCouponDiscount: hasDiscount,
      discountAmountText: hasDiscount ? discount.toFixed(2) : '',
      skuCouponHint,
      buyCtaText,
      ebookCtaText,
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
          reviewScore: (data && data.avgScore) ? String(data.avgScore) : '',
          reviewCount: Number(data && data.total) || 0,
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
    const productType = product.productType || product.product_type
      || (Array.isArray(product.productTypes) && product.productTypes[0])
      || 'physical'
    if (iosVirtualPay.shouldBlockVirtualPurchase(productType, product)) {
      wx.showModal({
        title: '暂不支持购买',
        content: iosVirtualPay.blockReason(product),
        showCancel: false,
      })
      return
    }
    const go = (productId) => {
      const item = {
        product_id: productId || product.id,
        product_name: product.name,
        product_image: (product.images && product.images[0]) || '',
        sku_id: selectedSku ? selectedSku.id : '',
        sku_name: selectedSku ? (selectedSku.skuName || selectedSku.name || '') : '',
        price: selectedSku ? selectedSku.price : product.price,
        quantity,
        product_type: productType,
        productType,
        delivery_mode: product.deliveryMode || product.delivery_mode || '',
        deliveryMode: product.deliveryMode || product.delivery_mode || '',
        demoKey: product.demoKey || (/暖阁体验包|体验包.*1元/.test(String(product.name || '')) ? 'pay1' : ''),
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
    }
    // demo=pay1 无 id 时解析/补种真实商品，便于下单
    const { isPay1Name, hasValidProductId, resolvePay1ProductId } = require('../../utils/pay1-product')
    const rawId = product.id || product.productId
    if (hasValidProductId(rawId)) {
      go(rawId)
      return
    }
    if (isPay1Name(product.name)) {
      wx.showLoading({ title: '准备下单…', mask: true })
      resolvePay1ProductId()
        .then((id) => {
          wx.hideLoading()
          if (!hasValidProductId(id)) {
            wx.showToast({ title: '体验包未入库，请稍后重试', icon: 'none' })
            return
          }
          this.setData({
            id: String(id),
            product: Object.assign({}, product, { id }),
          })
          go(id)
        })
        .catch((err) => {
          wx.hideLoading()
          const title = (err && err.message) || '体验包未入库，请稍后重试'
          wx.showToast({ title, icon: 'none', duration: 3200 })
        })
      return
    }
    go(product.id)
  },

  /** 富文本图片预览 */
  onRichContentTap() {
    previewRichHtmlImages(this.data.richContent)
  },

  /** 分享 */
  onShareAppMessage() {
    const product = this.data.product
    const id = this.data.id
    const path = id
      ? `/pages/product-detail/product-detail?id=${id}`
      : (this.data.isWarmDigital
        ? '/pages/product-detail/product-detail?demo=pay1'
        : '/pages/product-detail/product-detail?demo=ebook')
    return {
      title: product ? product.name : '商品详情',
      path,
    }
  },
})
