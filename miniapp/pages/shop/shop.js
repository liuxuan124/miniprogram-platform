const productService = require('../../services/product')
const HomeService = require('../../services/home')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const { loadTabBoundDslPage, handleDslReachBottom, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const warmShop = require('../../data/warm-shop')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

const CATS = warmShop.CATS

/** 首屏同步种子，避免等配置/API 时空壳再跳完整页 */
const DEMO_SHOP = {
  vip: warmShop.VIP_BAR,
  flashList: warmShop.FLASH,
  feat: warmShop.FEAT,
  products: warmShop.PRODUCTS,
  usingDemo: true,
  empty: false,
  loadError: false,
}

/** DEMO ¥1 体验包卡片（API 无货时注入，不依赖 V60 迁移） */
const DEMO_PAY1_CARD = (warmShop.PRODUCTS || []).find((p) => p.demoKey === 'pay1') || null

function isPay1Product(p) {
  if (!p) return false
  if (p.demoKey === 'pay1') return true
  return /暖阁体验包|体验包.*1元/.test(String(p.name || ''))
}

/** API 有货但缺 ¥1 时仍置顶 DEMO pay1；有真货则挪到格首 */
function ensurePay1AtTop(list) {
  const rows = (list || []).slice()
  const idx = rows.findIndex(isPay1Product)
  if (idx === 0) return rows
  if (idx > 0) {
    const [hit] = rows.splice(idx, 1)
    return [hit].concat(rows)
  }
  if (!DEMO_PAY1_CARD) return rows
  return [Object.assign({}, DEMO_PAY1_CARD)].concat(rows)
}

function formatPrice(v) {
  if (v == null || v === '') return '0'
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

function pad2(n) {
  return n < 10 ? `0${n}` : String(n)
}

function typeLabel(type) {
  const t = String(type || '').toLowerCase()
  if (/ebook|电子书/.test(t)) return '电子书'
  if (/resource|资料/.test(t)) return '资料包'
  if (/column|专栏/.test(t)) return '专栏课'
  if (/membership|会员|社群/.test(t)) return '社群'
  if (/physical|周边|实物/.test(t)) return '周边'
  if (/digital|体验/.test(t)) return '体验包'
  return type || '商品'
}

function formatFromItem(item, tag) {
  if (item.format) return item.format
  const desc = String(item.description || item.detail || item.subtitle || '')
  if (/EPUB\s*\/\s*PDF|EPUB.*PDF/i.test(desc)) return 'EPUB / PDF'
  if (/\bPDF\b/i.test(desc) && !/EPUB/i.test(desc)) return 'PDF'
  if (/Notion/i.test(desc)) return 'Notion / Excel'
  if (/年度长文合集/.test(String(item.name || ''))) return 'PDF'
  if (tag === '专栏课') return '音频 + 讲稿'
  if (tag === '社群') return '年卡'
  if (tag === '周边') return '实物'
  if (tag === '电子书') return 'EPUB / PDF'
  return ''
}

function normalizeProduct(item, idx) {
  const cover = resolveMediaUrl(
    item.mainImage || item.main_image || item.coverUrl || item.cover_url || item.image || ''
  )
  const price = formatPrice(item.price != null ? item.price : item.minPrice || item.min_price)
  const origin = item.originPrice || item.origin_price || item.marketPrice || item.market_price || item.originalPrice || ''
  const member = item.memberPrice != null ? item.memberPrice : item.member_price
  const memberFreeRaw = item.memberFree != null ? item.memberFree : item.member_free
  const memberFree = memberFreeRaw === true || memberFreeRaw === 1 || memberFreeRaw === '1'
  const sold = item.sales || item.salesCount || item.sold || 0
  const type = String(item.productType || item.product_type || '商品')
  const tag = typeLabel(type)
  let memberPrice = ''
  if (memberFree) memberPrice = '会员免费'
  else if (member != null && member !== '' && Number(member) >= 0) {
    memberPrice = Number(member) === 0 ? '会员免费' : `会员价 ¥${formatPrice(member)}`
  } else if (/内容生意手册/.test(String(item.name || '')) && Number(price) === 39) {
    memberPrice = '会员价 ¥31'
  } else if (/陶土杯垫|杯垫/.test(String(item.name || '')) && Number(price) === 68) {
    memberPrice = '会员价 ¥54'
  } else if (/一个人的内容生意/.test(String(item.name || '')) && Number(price) === 199) {
    memberPrice = '会员价 ¥159'
  } else if (/年度会员/.test(String(item.name || ''))) {
    memberPrice = '老球友续费 8 折'
  } else if (/暖阁体验包|体验包.*1元/.test(String(item.name || ''))) {
    memberPrice = '通路体验'
  } else if (/选题库|年度长文/.test(String(item.name || ''))) {
    memberPrice = '会员免费'
  }
  let sub = item.subtitle || item.subTitle || item.description || ''
  const pname = String(item.name || '')
  if (/一个人的内容生意/.test(pname)) sub = '含 90 天星球会员'
  else if (/内容生意手册/.test(pname)) sub = '12 万字 · 可试读前 2 章'
  else if (/选题库/.test(pname)) sub = '7 个文件 · 终身更新'
  else if (/年度长文合集/.test(pname)) sub = '32 篇精选 · 268 页'
  else if (/陶土杯垫/.test(pname)) sub = '需填写收货地址'
  else if (/年度会员/.test(pname)) sub = '3,241 位球友 · 资料库全解锁'
  else if (/体验包.*1元|暖阁体验包/.test(pname)) sub = '支付体验'
  const isPay1 = /暖阁体验包|体验包.*1元/.test(pname)
  return {
    uid: String(item.id || `api-${idx}`),
    id: item.id || '',
    isDemo: false,
    demoKey: isPay1 ? 'pay1' : '',
    tag,
    productType: type,
    tagGold: /资料|周边|社群|membership|resource|digital|体验/.test(type) || /资料|周边|社群|体验/.test(tag),
    format: formatFromItem(item, tag),
    cover: cover || '',
    name: item.name || item.title || '商品',
    sub,
    price,
    origin: origin ? formatPrice(origin) : '',
    sold: sold ? String(sold).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
    memberPrice,
  }
}

/** 从商品列表里找「暖阁星球 · 年度会员」SKU */
function findMemberProductId(list) {
  const rows = list || []
  const byName = rows.find((p) => /年度会员/.test(String(p.name || '')))
  if (byName && byName.id) return byName.id
  const byType = rows.find((p) => {
    const type = String(p.productType || p.type || p.tag || '').toLowerCase()
    return /membership|^社群$/.test(type)
  })
  return byType && byType.id ? byType.id : ''
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    // 等远程装修时仍先画 DEMO 商城壳，不挡成空白/二次跳转
    dslPending: true,
    loading: false,
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    vip: DEMO_SHOP.vip,
    cats: CATS,
    flashList: DEMO_SHOP.flashList,
    feat: DEMO_SHOP.feat,
    products: DEMO_SHOP.products,
    cd: { h: '00', m: '00', s: '00' },
    page: 1,
    pageSize: 20,
    hasMore: false,
    refreshing: false,
    usingDemo: true,
    loadError: false,
    empty: false,
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      this.setData({ statusBarHeight: sys.statusBarHeight || 20, themePageStyle: WARM_PAGE_STYLE })
    } catch (e) {
      this.setData({ themePageStyle: WARM_PAGE_STYLE })
    }
    this._startCountdown()
    if (USE_LOCAL_SOURCE) {
      this.setData(Object.assign({ dslPending: false, dslMode: false }, DEMO_SHOP))
      return
    }
    // 不先等配置再 redirect：Tab 已落到 shop，留在本页；DSL 无绑定时再拉商品
    loadTabBoundDslPage(this, '/pages/shop/shop').then((ok) => {
      if (ok) return
      this._loadVip()
      this._loadProducts(true)
    })
  },

  onUnload() {
    if (this._cdTimer) clearInterval(this._cdTimer)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, '/pages/shop/shop')
    }
  },

  onPullDownRefresh() {
    if (USE_LOCAL_SOURCE) {
      wx.stopPullDownRefresh()
      return
    }
    if (this.data.dslMode) {
      loadTabBoundDslPage(this, '/pages/shop/shop', true).finally(() => wx.stopPullDownRefresh())
      return
    }
    Promise.all([this._loadVip(), this._loadProducts(true)]).finally(() => wx.stopPullDownRefresh())
  },

  onRefresh() {
    if (USE_LOCAL_SOURCE || this.data.dslMode) {
      this.setData({ refreshing: false })
      return
    }
    this.setData({ refreshing: true })
    Promise.all([this._loadVip(), this._loadProducts(true)]).finally(() => this.setData({ refreshing: false }))
  },

  onReachBottomLoad() {
    if (this.data.dslMode) {
      handleDslReachBottom(this)
      return
    }
    if (USE_LOCAL_SOURCE) return
    if (this.data.hasMore && !this.data.loading) {
      this._loadProducts(false)
    }
  },

  _startCountdown() {
    if (!this._cdEnd) this._cdEnd = Date.now() + ((2 * 3600) + (14 * 60) + 26) * 1000
    const tick = () => {
      let left = Math.max(0, this._cdEnd - Date.now())
      const h = Math.floor(left / 3600000)
      left -= h * 3600000
      const m = Math.floor(left / 60000)
      left -= m * 60000
      const s = Math.floor(left / 1000)
      this.setData({ cd: { h: pad2(h), m: pad2(m), s: pad2(s) } })
    }
    tick()
    if (this._cdTimer) clearInterval(this._cdTimer)
    this._cdTimer = setInterval(tick, 1000)
  },

  _loadVip() {
    return HomeService.getWarmHome()
      .then((data) => {
        const bar = data && data.vipBar
        if (!bar) {
          this.setData({ vip: Object.assign({}, warmShop.VIP_BAR) })
          this._syncVipProductId()
          return
        }
        const price = bar.price || ''
        const productId = bar.productId || ''
        this.setData({
          vip: {
            icon: bar.icon || '🎫',
            title: bar.title || warmShop.VIP_BAR.title,
            desc: bar.desc || warmShop.VIP_BAR.desc,
            priceLabel: bar.priceLabel || (price ? `¥${price}/${bar.unit || '年'}` : warmShop.VIP_BAR.priceLabel),
            price: price || warmShop.VIP_BAR.price,
            unit: bar.unit || '年',
            productName: bar.productName || warmShop.VIP_BAR.productName,
            productId,
            url: productId
              ? `/pages/product-detail/product-detail?id=${productId}`
              : '/pkg-user/member-center/member-center',
          },
        })
        this._syncVipProductId()
      })
      .catch(() => {
        this.setData({ vip: Object.assign({}, warmShop.VIP_BAR) })
      })
  },

  /** 会员条无 productId 时，用已加载的年度会员商品回填 */
  _syncVipProductId() {
    const vip = this.data.vip || {}
    if (vip.productId) return
    const pid = findMemberProductId(this.data.products)
    if (!pid) return
    this.setData({
      'vip.productId': pid,
      'vip.url': `/pages/product-detail/product-detail?id=${pid}`,
    })
  },

  _loadProducts(reset) {
    if (this.data.loading) return Promise.resolve()
    const page = reset ? 1 : this.data.page + 1
    this.setData({ loading: true, loadError: false })
    return productService.getProductList({ current: page, size: this.data.pageSize, showError: false })
      .then((res) => {
        const list = (res.records || res.list || res.items || []).map(normalizeProduct)
        if (reset && list.length === 0) {
          // API 空：保留 DEMO 首屏（含 pay1），避免空壳闪一下再变完整页
          this.setData({
            loading: false,
            hasMore: false,
            page: 1,
            loadError: false,
            empty: false,
            usingDemo: true,
            products: ensurePay1AtTop(this.data.products && this.data.products.length
              ? this.data.products
              : DEMO_SHOP.products),
          })
          return
        }
        // API 有货但缺 ¥1：注入 DEMO pay1 置顶（不依赖 V60）；有真货则挪到格首
        const products = reset
          ? ensurePay1AtTop(list)
          : this.data.products.concat(list)
        const ebook = list.find((p) => /内容生意手册/.test(p.name || '')) || list[0]
        const feat = reset && ebook
          ? {
              ...ebook,
              name: /内容生意手册/.test(ebook.name || '') ? '内容生意手册' : (ebook.name || '').slice(0, 12),
              desc: /内容生意手册/.test(ebook.name || '')
                ? '12 万字 · EPUB / PDF 双格式\n购买后在小程序内直接阅读'
                : (ebook.sub || ''),
              cover: ebook.cover || '',
              tag: '新书首发 · 虚拟商品',
            }
          : (reset ? null : this.data.feat)
        const flashName = (p) => {
          if (/内容生意手册/.test(p.name || '')) return '《内容生意手册》电子书'
          if (/选题库/.test(p.name || '')) return '选题库 Notion 模板包'
          if (/长文合集|年度长文/.test(p.name || '')) return '年度长文合集 PDF'
          if (/私域/.test(p.name || '')) return '从 0 搭一套私域'
          return p.name
        }
        // 限时特惠对齐原型：不塞 pay1；格首已保证可见
        const flashList = reset
          ? list.filter((p) => !isPay1Product(p)).slice(0, 4).map((p) => ({
              uid: `flash-${p.uid}`,
              id: p.id,
              isDemo: false,
              name: flashName(p),
              cover: p.cover,
              price: p.price,
              origin: p.origin,
            }))
          : this.data.flashList
        this.setData({
          products,
          feat,
          flashList,
          page,
          hasMore: page * this.data.pageSize < (res.total || 0),
          loading: false,
          usingDemo: false,
          empty: products.length === 0,
          loadError: false,
        })
        this._syncVipProductId()
      })
      .catch(() => {
        if (reset) {
          // 失败仍留 DEMO 壳，不清空、不跳走
          this.setData({
            loading: false,
            loadError: true,
            empty: false,
            usingDemo: true,
            vip: this.data.vip && this.data.vip.title ? this.data.vip : DEMO_SHOP.vip,
            flashList: (this.data.flashList && this.data.flashList.length) ? this.data.flashList : DEMO_SHOP.flashList,
            feat: this.data.feat || DEMO_SHOP.feat,
            products: ensurePay1AtTop(
              (this.data.products && this.data.products.length) ? this.data.products : DEMO_SHOP.products
            ),
          })
        } else {
          this.setData({ loading: false })
        }
      })
  },

  onRetry() {
    this._loadVip()
    this._loadProducts(true)
  },

  onProductTap(e) {
    const id = e.currentTarget.dataset.id
    const tag = String(e.currentTarget.dataset.tag || '')
    const name = String(e.currentTarget.dataset.name || '')
    const demoKey = String(e.currentTarget.dataset.demoKey || e.currentTarget.dataset.demokey || '')
    if (demoKey === 'pay1' || /暖阁体验包|体验包.*1元/.test(name)) {
      if (id) {
        wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
      } else {
        wx.navigateTo({ url: '/pages/product-detail/product-detail?demo=pay1' })
      }
      return
    }
    if (USE_LOCAL_SOURCE) {
      if (/社群|会员|membership/i.test(tag) || /年度会员|星球/.test(name)) {
        this._goMemberFallback()
        return
      }
      if (/专栏/.test(tag)) {
        wx.navigateTo({ url: '/pages/product-detail/product-detail?demo=column' })
        return
      }
      wx.navigateTo({ url: '/pages/product-detail/product-detail?demo=goods' })
      return
    }
    if (!id) {
      wx.showToast({ title: '商品暂不可用', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/product-detail/product-detail?id=' + id })
  },

  onCatTap(e) {
    const { url, tab } = e.currentTarget.dataset
    if (tab) {
      wx.switchTab({ url: tab })
      return
    }
    if (url) wx.navigateTo({ url })
  },

  onGoOrders() {
    wx.navigateTo({ url: '/pkg-trade/order-list/order-list' })
  },

  onGoService() {
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  onGoSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },

  onGoMember() {
    const vip = this.data.vip || {}
    let productId = vip.productId || findMemberProductId(this.data.products)
    if (productId) {
      if (!vip.productId) {
        this.setData({
          'vip.productId': productId,
          'vip.url': `/pages/product-detail/product-detail?id=${productId}`,
        })
      }
      wx.navigateTo({
        url: `/pages/product-detail/product-detail?id=${productId}`,
        fail: () => {
          wx.navigateTo({
            url: `/pages/order-create/order-create?productId=${productId}`,
            fail: () => this._goMemberFallback(),
          })
        },
      })
      return
    }
    this._goMemberFallback()
  },

  _goMemberFallback() {
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
})
