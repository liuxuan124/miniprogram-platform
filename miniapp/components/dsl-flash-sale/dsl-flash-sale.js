// components/dsl-flash-sale/dsl-flash-sale.js — 限时秒杀
const { executeAction, navigatePage } = require('../../utils/render')
const {
  normalizeFlashSaleProps,
  parseTime,
  buildCountdownParts,
  resolveSalePhase,
  resolveBuyText,
  isDimPhase,
  resolveBadgeText,
  resolveProgressPercent,
  isImageIcon,
  pad,
} = require('../../utils/flash-sale-props')

/** 运行时数据源（自动模式）→ 展示字段 */
function fromRuntime(raw) {
  return {
    id: (raw && (raw.id != null ? raw.id : raw.productId)) || '',
    name: String((raw && (raw.name || raw.title || raw.productName)) || ''),
    price: String((raw && raw.price) != null ? raw.price : ''),
    original_price: String((raw && (raw.originalPrice || raw.original_price)) || ''),
    stock: Number((raw && raw.stock) || 0) || 0,
    sold: Number((raw && (raw.sold || raw.used)) || 0) || 0,
    link_url: (() => {
      const pid = raw && (raw.id != null ? raw.id : raw.productId)
      return pid ? `/pkg-content/product-detail/product-detail?id=${pid}` : ''
    })(),
  }
}

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    displayItems: [],
    title: '限时秒杀',
    titleIcon: '',
    isImageIcon: false,
    countdown: true,
    countdownStyle: 'flip',
    countdownText: '00:00:00',
    days: 0,
    showDays: false,
    hoursText: '00',
    minutesText: '00',
    secondsText: '00',
    prefix: '距结束',
    expired: false,
    showMore: false,
    moreText: '更多',
    moreLink: '',
    layout: 'scroll',
    cardSurface: 'white',
    themeColor: '#FF4D4F',
    showOriginalPrice: true,
    showProgress: false,
    showBuyButton: true,
    buyText: '立即抢',
    dimPhase: false,
    hidden: false,
    titleStyle: '',
    nameStyle: '',
    metaStyle: '',
    originStyle: '',
    priceStyle: '',
    btnStyle: '',
    rootStyle: '',
    _timer: null,
  },

  observers: {
    'config, runtimeData': function () {
      this._rebuild()
    },
  },

  lifetimes: {
    attached() {
      this._rebuild()
    },
    detached() {
      this._clearTimer()
    },
  },

  methods: {
    /**
     * 统一重建入口：归一化 → 起倒计时 → 算样式/头部。
     * 旧代码把逻辑散在三个方法里，改一个字段要记得同时改另外两处。
     */
    _rebuild() {
      const cfg = normalizeFlashSaleProps(this.data.config || {})
      this._cfg = cfg

      this._buildHeader(cfg)
      this._buildItems(cfg)
      this._startCountdown(cfg)
    },

    _buildHeader(cfg) {
      this.setData({
        title: cfg.title,
        titleIcon: cfg.titleIcon,
        isImageIcon: isImageIcon(cfg.titleIcon),
        countdown: cfg.countdown,
        countdownStyle: cfg.countdownStyle,
        showMore: cfg.showMore,
        moreText: cfg.moreText,
        moreLink: cfg.moreLink,
        layout: cfg.layout,
        cardSurface: cfg.cardSurface,
        themeColor: cfg.themeColor,
        showOriginalPrice: cfg.showOriginalPrice,
        showProgress: cfg.showProgress,
        showBuyButton: cfg.showBuyButton,
        titleStyle: `font-size:${cfg.titleFontSize * 2}rpx;color:${cfg.themeColor}`,
        nameStyle: `font-size:${Math.max(10, cfg.subtitleFontSize) * 2}rpx`,
        metaStyle: `font-size:${Math.max(9, cfg.subtitleFontSize - 1) * 2}rpx`,
        originStyle: `font-size:${Math.max(9, cfg.subtitleFontSize - 1) * 2}rpx`,
        rootStyle: `margin:${cfg.blockMargin * 2}rpx;border-radius:${cfg.blockRadius * 2}rpx;${this._surfaceStyle(cfg)}`,
      })
    },

    _buildItems(cfg) {
      const rd = Array.isArray(this.data.runtimeData) ? this.data.runtimeData : []
      let list = []
      if (cfg.dataMode === 'manual') {
        list = cfg.manualItems.slice()
      } else if (rd.length) {
        // 自动模式：数据源实时取数（价格/库存最新）
        list = rd.map(fromRuntime)
      } else {
        // 旧 items 已由归一化并入 manualItems
        list = cfg.manualItems.slice()
      }
      this.setData({
        displayItems: list.slice(0, cfg.limit).map((it) => this._decorate(it, cfg)),
      })
    },

    _decorate(item, cfg) {
      return {
        ...item,
        badge: resolveBadgeText(item, cfg.badgeMode, cfg.badgeText),
        percent: resolveProgressPercent(item),
      }
    },

    /** 卡片背景形态：白卡 / 主题色淡渐变 / 透明 */
    _surfaceStyle(cfg) {
      if (cfg.cardSurface === 'transparent') return 'background:transparent;border:1rpx dashed #e6ded4;'
      if (cfg.cardSurface === 'gradient') {
        // 主题色淡化：小程序 WXSS 支持 8 位色（#RRGGBBAA）
        const hex = String(cfg.themeColor || '#FF4D4F').replace('#', '')
        return `background:linear-gradient(160deg, ${hex}1f, ${hex}08);border:1rpx solid transparent;`
      }
      return 'background:#fff;border:1rpx solid #f0e6e2;'
    },

    _startCountdown(cfg) {
      this._clearTimer()

      if (!cfg.countdown) {
        this.setData({
          countdownText: '', expired: false,
          // 倒计时关掉时不做「结束即隐藏」判定 —— 没有时间基准就判不了
          hidden: cfg.autoHideWhenDone && !this.data.displayItems.length,
        })
        return
      }

      const endMs = parseTime(cfg.endTime)
      if (endMs === null) {
        this.setData({ countdownText: '未设置结束时间', expired: false })
        return
      }
      const startMs = parseTime(cfg.startTime)

      const update = () => {
        const parts = buildCountdownParts(endMs, startMs)
        const prefix = parts.expired ? '已结束' : (parts.pending ? cfg.pendingText : cfg.runningText)
        const phase = resolveSalePhase(this._cfg.manualItems, parts)
        const dim = isDimPhase(phase)
        const displayItems = this.data.displayItems.map((it) => this._decorate(it, cfg))

        this.setData({
          countdownText: parts.text,
          days: parts.days,
          showDays: parts.showDays,
          hoursText: pad(parts.hours),
          minutesText: pad(parts.minutes),
          secondsText: pad(parts.secondsOfMinute),
          prefix,
          expired: parts.expired,
          buyText: resolveBuyText(phase, cfg),
          dimPhase: dim,
          displayItems,
          priceStyle: `color:${dim ? '#a3aebd' : cfg.themeColor}`,
          btnStyle: (dim || phase === 'pending')
            ? 'background:#e3e8f0;color:#8a94a6'
            : `background:${cfg.themeColor};color:#fff`,
          // 结束/售罄且开了自动隐藏 → 整块不渲染，页面不留空壳
          hidden: cfg.autoHideWhenDone && (parts.expired || dim || !displayItems.length),
        })
      }

      update()
      this.data._timer = setInterval(update, 1000)
    },

    _clearTimer() {
      if (this.data._timer) {
        clearInterval(this.data._timer)
        this.data._timer = null
      }
    },

    onTapItem(e) {
      const link = String((e.currentTarget.dataset && e.currentTarget.dataset.url) || '').trim()
      if (!link) return
      if (/^https?:\/\//i.test(link)) {
        executeAction({ type: 'webview', url: link })
        return
      }
      navigatePage(link)
    },

    onMoreTap() {
      // 优先跳面板配的落地页；没配时回落活动列表
      const link = String(this.data.moreLink || '').trim()
      if (link) {
        navigatePage(link)
        return
      }
      navigatePage('/pkg-extra/activity-list/activity-list')
    },
  },
})
