const { get } = require('../../utils/request')
const { navigatePage } = require('../../utils/render')

Component({
  properties: {
    config: { type: Object, value: {} },
    runtimeData: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    state: 'loading',
    plans: [],
    showBanner: true,
    bannerTitle: '',
    bannerSubtitle: '',
    scrollDirection: 'vertical',
    badgeText: '推荐',
    showAgreement: true,
    agreementText: '',
    iosAlt: '',
  },

  observers: {
    'config, runtimeData': function () {
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
      this.setData({
        showBanner: cfg.show_banner !== false,
        bannerTitle: cfg.banner_title || '选择会员方案',
        bannerSubtitle: cfg.banner_subtitle || '',
        scrollDirection: cfg.scroll_direction || 'vertical',
        badgeText: cfg.badge_text || '推荐',
        showAgreement: cfg.show_agreement !== false,
        agreementText: cfg.agreement_text || '',
        iosAlt: cfg.ios_alt_copy || '',
      })
      const rows = Array.isArray(this.properties.runtimeData) && this.properties.runtimeData.length
        ? this.properties.runtimeData
        : (Array.isArray(cfg.items) ? cfg.items : [])
      if (rows.length) {
        this.setData({ state: 'data', plans: rows })
        return
      }
      this.loadPlans(cfg)
    },

    loadPlans(cfg) {
      this.setData({ state: 'loading' })
      const scope = cfg.scope || 'platform'
      const params = { scope }
      if (scope === 'planet' && cfg.planet_id) params.planetId = cfg.planet_id
      get('/api/v1/mp/membership-plans', params)
        .then((res) => {
          const list = (res && res.data) || []
          if (!list.length) {
            this.setData({ state: 'empty', plans: [] })
            return
          }
          const recommendId = cfg.recommend_plan_id
          const plans = list.map((p) => {
            const display = p.displayPrice != null ? p.displayPrice : p.display_price
            const original = p.originalPrice != null ? p.originalPrice : p.original_price
            let priceText = '见选购页'
            if (display != null && display !== '') {
              priceText = `¥${display}`
              if (original != null && Number(original) > Number(display)) {
                priceText += ` 原价¥${original}`
              }
            }
            return {
              id: p.id,
              productId: p.productId || p.product_id,
              name: p.name,
              description: p.description || '',
              rights: p.rights || [],
              recommend: recommendId != null && String(recommendId) === String(p.id),
              priceText,
            }
          })
          this.setData({ state: 'data', plans })
        })
        .catch(() => this.setData({ state: 'error', plans: [] }))
    },

    onCheckout() {
      navigatePage('/pages/member-center/member-center')
    },

    reload() {
      this.loadPlans(this.properties.config || {})
    },
  },
})
