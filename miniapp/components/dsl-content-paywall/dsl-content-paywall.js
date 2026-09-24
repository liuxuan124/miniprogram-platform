const { get } = require('../../utils/request')
const { navigatePage } = require('../../utils/render')
const {
  normalizeUnlockMethods,
  buildUnlockRows,
  interpolatePaywallCopy,
  mapApiUnlockOptions,
} = require('../../utils/dsl-paywall')

Component({
  properties: {
    config: { type: Object, value: {} },
    styleString: { type: String, value: '' },
  },

  data: {
    hidden: false,
    unlockedBanner: false,
    mainTitle: '解锁全文',
    subTitle: '',
    hintText: '',
    primaryText: '立即解锁',
    primaryLink: '/pages/member-center/member-center',
    secondaryRows: [],
    maskStyle: '',
    theme: 'warm',
  },

  observers: {
    config() {
      this.sync()
    },
  },

  lifetimes: {
    attached() {
      this.sync()
    },
  },

  methods: {
    sync() {
      const cfg = this.properties.config || {}
      const theme = cfg.theme || 'warm'
      const methods = normalizeUnlockMethods(cfg.unlock_methods)
      const overrides = cfg.unlock_labels || {}
      const demoPaywall = cfg.paywall || {}
      const maskH = Math.max(Number(cfg.mask_height) || 72, 40)
      let maskStyle = `height:${maskH * 2}rpx;`
      if (cfg.mask_color) {
        maskStyle += `background:${cfg.mask_color};`
      }
      const vars = {
        remainPercent: demoPaywall.remainPercent != null ? `${demoPaywall.remainPercent}%` : '30%',
        price: demoPaywall.price != null ? `¥${demoPaywall.price}` : '¥9.9',
        memberPrice: demoPaywall.memberPrice != null ? `¥${demoPaywall.memberPrice}` : '会员免费',
      }
      this.setData({
        theme,
        maskStyle,
        mainTitle: interpolatePaywallCopy(cfg.title || '解锁全文', vars),
        subTitle: interpolatePaywallCopy(cfg.subtitle || '', vars),
        hintText: String(cfg.hint || '开通后可查看完整内容').trim(),
        primaryText: cfg.button_text || '立即解锁',
        primaryLink: cfg.primary_link || '/pages/member-center/member-center',
        hidden: false,
        unlockedBanner: false,
        secondaryRows: buildUnlockRows(methods, overrides, demoPaywall).slice(1, 4),
      })
      const contentId = cfg.content_id
      if (contentId) {
        this.loadContentPaywall(contentId, methods, overrides, cfg)
      }
    },

    loadContentPaywall(contentId, methods, overrides, cfg) {
      get(`/api/v1/mp/contents/${contentId}`)
        .then((res) => {
          const detail = (res && res.data) || {}
          if (detail.accessGranted === true || detail.locked === false) {
            const behavior = cfg.unlocked_behavior || 'hide'
            if (behavior === 'banner') {
              this.setData({ hidden: false, unlockedBanner: true })
            } else {
              this.setData({ hidden: true, unlockedBanner: false })
            }
            return
          }
          const preview = detail.previewPercent != null ? detail.previewPercent : 30
          const vars = {
            remainPercent: `${preview}%`,
            price: detail.price != null ? `¥${detail.price}` : undefined,
            memberPrice: detail.memberPrice != null ? `¥${detail.memberPrice}` : undefined,
          }
          const rows = mapApiUnlockOptions(detail.unlockOptions, methods, overrides)
          const primary = rows[0]
          this.setData({
            hidden: false,
            unlockedBanner: false,
            mainTitle: interpolatePaywallCopy(cfg.title || '解锁全文', vars),
            subTitle: interpolatePaywallCopy(cfg.subtitle || '', vars),
            primaryText: primary ? primary.button_text : this.data.primaryText,
            primaryLink: primary && primary.link ? primary.link : this.data.primaryLink,
            secondaryRows: rows.slice(1, 4),
          })
        })
        .catch(() => {})
    },

    onPrimaryTap() {
      const link = this.data.primaryLink
      if (link) navigatePage(link)
    },

    onOptionTap(e) {
      const link = e.currentTarget.dataset.link
      if (link) navigatePage(link)
    },
  },
})
