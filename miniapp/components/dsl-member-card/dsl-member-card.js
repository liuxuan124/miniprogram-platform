// components/dsl-member-card/dsl-member-card.js — 会员卡组件
const { executeAction, navigatePage } = require('../../utils/render')

const DEFAULT_LINK = '/pages/member-center/member-center'

function normalizeBgUrl(url) {
  return String(url || '').trim()
}

function formatBalance(value) {
  if (value === undefined || value === null || value === '') return '¥0'
  const text = String(value)
  if (text.indexOf('¥') === 0 || text.indexOf('￥') === 0) return text
  const num = Number(text)
  if (!Number.isNaN(num)) return `¥${num}`
  return text
}

function buildFontStyle(size, fallback, color) {
  const n = Number(size)
  const px = Number.isFinite(n) && n > 0 ? n : fallback
  const parts = [`font-size:${px * 2}rpx`]
  if (color) parts.push(`color:${color}`)
  return parts.join(';')
}

Component({
  properties: {
    config: { type: Object, value: {} },
    actions: { type: Array, value: [] },
    styleString: { type: String, value: '' },
  },

  data: {
    memberInfo: {
      nickname: '会员权益',
      avatar_url: '',
      level: '点击查看权益',
      points: 1280,
      coupons: 3,
      balance: '268',
      balanceText: '¥268',
    },
    displayTitle: '会员权益',
    displaySubtitle: '点击查看权益',
    themeClass: 'blue',
    cardStyle: '',
    benefitTags: [],
    showLevel: true,
    showPoints: true,
    showBalance: true,
    showCoupons: true,
    showUpgrade: true,
    showStats: true,
    upgradeText: '升级会员',
    titleStyle: '',
    subtitleStyle: '',
    benefitStyle: '',
    statValueStyle: '',
    statLabelStyle: '',
    upgradeStyle: '',
  },

  observers: {
    'config, styleString': function () {
      this._syncFromConfig()
    },
  },

  lifetimes: {
    attached() {
      this._syncFromConfig()
      this._loadMemberInfo()
    },
  },

  methods: {
    _syncFromConfig() {
      const config = this.data.config || {}
      const bgMode = config.bg_mode === 'image' || config.bg_mode === 'gradient'
        ? config.bg_mode
        : (config.background_image ? 'image' : 'gradient')
      const bgImage = normalizeBgUrl(config.background_image)
      const theme = config.theme || 'blue'

      const cardParts = []
      if (bgMode === 'image' && bgImage) {
        cardParts.push(`background-image:url(${bgImage})`)
        cardParts.push('background-size:cover')
        cardParts.push('background-position:center')
      } else if (config._styleBgColor) {
        cardParts.push(`background:${config._styleBgColor}`)
        // 有自定义背景色时不再套主题渐变 class
      }
      const radius = config.border_radius
      if (radius !== undefined && radius !== null && radius !== '') {
        cardParts.push(`border-radius:${Number(radius) * 2}rpx`)
      }

      const textColor = config._styleTextColor || ''
      if (textColor) {
        cardParts.push(`color:${textColor}`)
      }

      const benefits = Array.isArray(config.benefits)
        ? config.benefits.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 6)
        : []

      const showLevel = config.show_level !== false
      const showPoints = config.show_points !== false
      const showBalance = config.show_balance !== false
      const showCoupons = config.show_coupons !== false
      const showUpgrade = config.show_upgrade !== false
      const themeClassFinal = (bgMode === 'image' && bgImage)
        ? 'image'
        : (config._styleBgColor ? 'solid' : theme)

      this.setData({
        displayTitle: config.title || this.data.memberInfo.nickname || '会员权益',
        displaySubtitle: config.subtitle || this.data.memberInfo.level || '点击查看权益',
        themeClass: themeClassFinal,
        cardStyle: cardParts.join(';'),
        benefitTags: benefits,
        showLevel,
        showPoints,
        showBalance,
        showCoupons,
        showUpgrade,
        showStats: showPoints || showBalance || showCoupons,
        upgradeText: config.upgrade_text || '升级会员',
        titleStyle: buildFontStyle(config.title_font_size, 15, textColor),
        subtitleStyle: buildFontStyle(config.subtitle_font_size, 11, textColor),
        benefitStyle: buildFontStyle(config.benefit_font_size, 10, textColor),
        statValueStyle: buildFontStyle(config.stat_value_font_size, 16, textColor),
        statLabelStyle: buildFontStyle(config.stat_label_font_size, 10, textColor),
        upgradeStyle: buildFontStyle(config.upgrade_font_size, 11),
      })
    },

    _loadMemberInfo() {
      const app = getApp()
      if (!(app && app.globalData && app.globalData.userInfo)) return
      const userInfo = app.globalData.userInfo
      const balance = userInfo.balance || '0'
      const nickname = userInfo.nickname || userInfo.nickName || '用户'
      const level = userInfo.levelName || userInfo.level || '点击查看权益'
      this.setData({
        memberInfo: {
          nickname,
          avatar_url: userInfo.avatar_url || userInfo.avatarUrl || '',
          level,
          points: userInfo.points || 0,
          coupons: userInfo.coupons || userInfo.couponCount || 0,
          balance,
          balanceText: formatBalance(balance),
        },
        displayTitle: (this.data.config && this.data.config.title) || nickname,
        displaySubtitle: (this.data.config && this.data.config.subtitle) || level,
      })
    },

    onTapCard() {
      if (this.data.actions && this.data.actions.length > 0) {
        executeAction(this.data.actions[0])
        return
      }
      const link = ((this.data.config && this.data.config.link_url) || DEFAULT_LINK).trim()
      if (link) navigatePage(link)
    },

    onTapUpgrade() {
      const config = this.data.config || {}
      navigatePage(String(config.upgrade_link || DEFAULT_LINK).trim())
    },
  },
})
