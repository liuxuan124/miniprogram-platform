const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { getNavLayout } = require('../../utils/nav-layout')
const { resolveMediaUrl } = require('../../utils/media-url')
const warmDiscover = require('../../data/warm-discover')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')
const request = require('../../utils/request')
const productService = require('../../services/product')
const { resolveDisplayAvatarUrl } = require('../../utils/image-fallback')
const { picsum } = require('../../data/warm-media')

function coverRatioClassFromUrl(url, index) {
  const raw = String(url || '')
  let w = 0
  let h = 0
  const pathMatch = raw.match(/\/(\d+)\/(\d+)(?:\?|$)/)
  if (pathMatch) {
    w = Number(pathMatch[1])
    h = Number(pathMatch[2])
  } else {
    const wm = raw.match(/[?&]w=(\d+)/i)
    const hm = raw.match(/[?&]h=(\d+)/i)
    if (wm && hm) {
      w = Number(wm[1])
      h = Number(hm[1])
    }
  }
  if (w > 0 && h > 0) {
    const r = h / w
    if (r >= 1.3) return 'dc-card__cv--tall'
    if (r >= 1.05) return 'dc-card__cv--mid'
    if (r >= 0.92) return 'dc-card__cv--sq'
    return 'dc-card__cv--wide'
  }
  // 无尺寸信息时交错高低，贴近原型瀑布流
  const cycle = ['dc-card__cv--tall', 'dc-card__cv--mid', 'dc-card__cv--sq', 'dc-card__cv--tall']
  return cycle[index % cycle.length]
}

function mapContentCard(item, kind, index) {
  const cover = resolveMediaUrl(item.coverImage || item.coverUrl || item.cover_url || '')
  const author = item.author || item.authorName || '暖阁'
  const likes = item.likeCount || item.favoriteCount || item.viewCount || 0
  const likeText = likes >= 10000
    ? `${(likes / 10000).toFixed(1).replace(/\.0$/, '')}万`
    : likes >= 1000
      ? `${(likes / 1000).toFixed(1).replace(/\.0$/, '')}k`
      : String(likes || '')
  const roleRaw = item.authorRole || ''
  const roleMap = { owner: '主理人', contributor: '特约', editor: '官方', user: '' }
  const role = roleMap[roleRaw] || roleRaw
  return {
    uid: String(item.id || ''),
    id: item.id,
    isDemo: false,
    isText: !cover && kind === 'note',
    kind,
    title: item.title || '',
    quote: !cover ? (item.summary || item.title || '') : '',
    cover,
    hasCover: !!cover,
    coverRatioClass: cover ? coverRatioClassFromUrl(cover, index || 0) : '',
    author,
    authorInitial: String(author).slice(0, 1),
    role,
    avatar: resolveDisplayAvatarUrl(item.authorAvatar || ''),
    likeText,
    pill: item.pill || '',
    cnt: item.cnt || '',
  }
}

function mapProductCard(item) {
  const priceNum = item.price != null ? Number(item.price) : NaN
  const priceLabel = Number.isFinite(priceNum)
    ? `¥${Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(0)}`
    : (item.price != null ? `¥${item.price}` : '')
  const sales = Number(item.sales || 0)
  const likeText = sales >= 1000
    ? `${(sales / 1000).toFixed(1).replace(/\.0$/, '')}k`
    : (sales ? String(sales) : '')
  return {
    uid: String(item.id || ''),
    id: item.id,
    isDemo: false,
    kind: 'goods',
    title: item.name || item.title || '商品',
    cover: resolveMediaUrl(item.mainImage || item.cover || ''),
    hasCover: true,
    author: '暖阁商城',
    role: '',
    avatar: picsum('shop1', 60, 60),
    likeText,
    price: item.price != null ? String(item.price) : '',
    pill: priceLabel,
  }
}

/** 首屏同步种子（与 shop/planet DEMO_* 同模式），避免空列闪一下再灌数据 */
function normalizeDiscoverList(list) {
  return (list || []).map((item, i) => {
    if (!item) return item
    let next = item
    if (item.hasCover && item.cover && !item.coverRatioClass) {
      next = { ...next, coverRatioClass: coverRatioClassFromUrl(item.cover, i) }
    }
    if (!next.authorInitial && next.author) {
      next = { ...next, authorInitial: String(next.author).slice(0, 1) }
    }
    return next
  })
}

function splitDiscoverColumns(list) {
  const left = []
  const right = []
  normalizeDiscoverList(list).forEach((item, i) => {
    if (i % 2 === 0) left.push(item)
    else right.push(item)
  })
  return { leftList: left, rightList: right }
}

const DEMO_NOTE_COLS = splitDiscoverColumns(warmDiscover.listForTab('note'))

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    statusBarHeight: getNavLayout().statusBarHeight,
    tabs: warmDiscover.TABS,
    activeTab: 'note',
    chips: warmDiscover.chipsForTab('note'),
    activeChip: '全部',
    leftList: DEMO_NOTE_COLS.leftList,
    rightList: DEMO_NOTE_COLS.rightList,
    page: 1,
    pageSize: 12,
    hasMore: false,
    loading: false,
    refreshing: false,
    isEmpty: false,
    footerText: '—— 到底啦 ——',
    usingDemo: true,
    showBanner: true,
    recruitBanner: {
      title: '创作者招募中',
      desc: '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
      cta: '去投稿',
    },
  },

  onLoad() {
    try {
      const sys = wx.getSystemInfoSync()
      if (sys && sys.statusBarHeight) {
        this.setData({ statusBarHeight: sys.statusBarHeight })
      }
    } catch (e) { /* ignore */ }
    if (!USE_LOCAL_SOURCE) {
      const SystemService = require('../../services/system')
      SystemService.fetchSystemConfig(true).then((config) => {
        const b = config && (config.creator_recruit_banner || config.creatorRecruitBanner)
        if (b && (b.title || b.desc)) {
          this.setData({
            recruitBanner: {
              title: b.title || '创作者招募中',
              desc: b.desc || '目前由暖阁编辑部与特约作者供稿，欢迎投稿加入',
              cta: b.cta || '去投稿',
            },
          })
        }
      }).catch(() => {})
    }
    this._switchTab('note', true)
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    this.setData({ themePageStyle: WARM_PAGE_STYLE })
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      showTabBarForRoute(this, '/pages/discover/discover')
    }
  },

  onPullDownRefresh() {
    this._reload().finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {},

  onRefresh() {
    this.setData({ refreshing: true })
    this._reload().finally(() => this.setData({ refreshing: false }))
  },

  _applyList(list, usingDemo) {
    const cols = splitDiscoverColumns(list)
    const count = cols.leftList.length + cols.rightList.length
    this.setData({
      ...cols,
      usingDemo: !!usingDemo,
      isEmpty: count === 0,
      hasMore: false,
      footerText: count ? '—— 到底啦 ——' : '暂无内容',
      loading: false,
    })
  },

  _reload() {
    const key = this.data.activeTab || 'note'
    if (USE_LOCAL_SOURCE) {
      this._applyList(warmDiscover.listForTab(key), true)
      return Promise.resolve()
    }
    return this._loadFromApi(key)
  },

  _loadFromApi(tabKey) {
    // 保留已有 DEMO/上一屏，不先清空；有真数据再覆盖
    if (tabKey === 'goods') {
      return productService.getProductList({ current: 1, size: 20 })
        .then((res) => {
          const records = (res && (res.records || res.list || res.items)) || []
          const list = records.map((row, i) => {
            const card = mapProductCard(row)
            card.coverRatioClass = coverRatioClassFromUrl(card.cover, i)
            return card
          })
          if (!list.length) {
            this._applyList(warmDiscover.listForTab('goods'), true)
            return
          }
          this._applyList(list, false)
        })
        .catch(() => this._applyList(warmDiscover.listForTab('goods'), true))
    }
    const contentType = tabKey === 'article' ? 'article' : 'note'
    return request.get('/api/v1/mp/contents', {
      current: 1,
      size: 20,
      contentType,
    }, { auth: false, showError: false })
      .then((res) => {
        const records = (res && (res.records || res.list)) || []
        const list = records.map((row, i) => mapContentCard(row, contentType === 'article' ? 'article' : 'note', i))
        if (!list.length) {
          this._applyList(warmDiscover.listForTab(tabKey), true)
          return
        }
        this._applyList(list, false)
      })
      .catch(() => this._applyList(warmDiscover.listForTab(tabKey), true))
  },

  _switchTab(tabKey, force) {
    const key = tabKey || 'note'
    if (!force && key === this.data.activeTab) return
    const chips = warmDiscover.chipsForTab(key)
    // 先同步铺 DEMO 列，避免空瀑布流闪屏；远程有货再盖
    this._applyList(warmDiscover.listForTab(key), true)
    this.setData({
      activeTab: key,
      chips,
      activeChip: '全部',
      showBanner: key === 'note',
    })
    if (!USE_LOCAL_SOURCE) this._loadFromApi(key)
  },

  onTabTap(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return
    this._switchTab(key, false)
  },

  onChipTap(e) {
    const chip = e.currentTarget.dataset.chip
    if (!chip || chip === this.data.activeChip) return
    this.setData({ activeChip: chip })
  },

  onTapNote(e) {
    const id = e.currentTarget.dataset.id
    const kind = e.currentTarget.dataset.kind || this.data.activeTab
    const isDemo = !!(e.currentTarget.dataset.demo || this.data.usingDemo)
    if (kind === 'goods') {
      if (isDemo || USE_LOCAL_SOURCE) {
        wx.navigateTo({ url: '/pages/product-detail/product-detail?demo=goods' })
      } else if (!id) {
        wx.showToast({ title: '商品暂不可用', icon: 'none' })
      } else {
        wx.navigateTo({ url: `/pages/product-detail/product-detail?id=${id}` })
      }
      return
    }
    if (isDemo || USE_LOCAL_SOURCE) {
      wx.navigateTo({
        url: kind === 'article'
          ? '/pages/content-detail/content-detail?demo=1'
          : '/pages/content-detail/content-detail?demo=note',
      })
      return
    }
    if (!id) {
      wx.showToast({ title: '内容暂不可用', icon: 'none' })
      return
    }
    wx.navigateTo({ url: `/pages/content-detail/content-detail?id=${id}` })
  },

  onTapContribute() {
    wx.navigateTo({ url: '/pages/contribute/contribute' })
  },

  onTapSearch() {
    wx.navigateTo({ url: '/pages/search/search' })
  },
})
