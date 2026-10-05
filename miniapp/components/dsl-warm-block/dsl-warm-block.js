const { executeAction } = require('../../utils/render')
const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')

function pickBrandName() {
  try {
    const app = getApp()
    const brand = (app && app.globalData && app.globalData.miniappBrandConfig) || {}
    return String(brand.appName || brand.name || '').trim()
  } catch (e) {
    return ''
  }
}

function resolveBrandInitial(config, warm) {
  const fromProp = String((config && config.brand_initial) || '').trim()
  if (fromProp) return fromProp.slice(0, 1)
  const fromWarm = String((warm && warm.brandName) || '').trim()
  if (fromWarm) return fromWarm.slice(0, 1)
  const appName = pickBrandName()
  if (appName) return appName.slice(0, 1)
  return '暖'
}

/** 金刚区图标是「素材库图片」还是「emoji」：图片= /uploads/ 相对路径或 http 链接 */
function isImageIcon(icon) {
  const v = String(icon || '').trim()
  if (!v) return false
  return v.indexOf('/uploads/') === 0 || v.indexOf('http://') === 0 || v.indexOf('https://') === 0
}

function resolveNavs(warm) {
  const navs = (warm && warm.navs) || []
  return navs.map((n) => {
    const item = Object.assign({}, n)
    item.isImg = isImageIcon(n && n.icon)
    return item
  })
}

function resolveMemberBadgeLabel(config, warm) {
  const cfg = config || {}
  const w = warm || {}
  if (w.memberBadgeLabel) return String(w.memberBadgeLabel)
  if (w.isPlatformMember) {
    return String(w.memberLevelName || cfg.member_active_label || '年度会员').trim() || '年度会员'
  }
  return String(cfg.member_cta_label || '开通会员 ›').trim() || '开通会员 ›'
}

function resolveTopBg(shellStyle, config) {
  const s = shellStyle || {}
  const fromStyle = String(s.background_color || s.background || '').trim()
  if (fromStyle) return fromStyle
  const fromProp = String((config && config.top_background) || '').trim()
  return fromProp
}

function isMotaiPlainSkin(config, bg) {
  const cfg = config || {}
  if (String(cfg.greet_skin || '').trim() === 'plain') return true
  if (cfg.show_member_badge === true) return true
  if (String(cfg.brand_initial || '').trim()) return true
  if (bg) return true
  const titleSize = Number(cfg.greet_title_font_size)
  const subSize = Number(cfg.greet_sub_font_size)
  if (Number.isFinite(titleSize) && titleSize > 0 && titleSize !== 20) return true
  if (Number.isFinite(subSize) && subSize > 0 && subSize !== 11) return true
  return false
}

function hasRealAvatar(url) {
  const u = String(url || '').trim()
  if (!u) return false
  if (u.indexOf('default-avatar') >= 0) return false
  return true
}

/**
 * 作者列表归一化（改自 2026-10-04，与后台预览 DslWarmBlock.authorList 同规则）：
 *   1. config.authors 配了 → 用配的（运营可覆盖接口数据，支持自定义头像/名称/身份/跳转与末尾「＋」招募位）
 *   2. 没配 → 回落到 warm.authors（首页聚合接口 warm_home_config.authors），历史页面外观不变
 * 统一出key/name/role/avatar/url/apply/initial 七个字段，wxml 不再关心数据来源。
 */
function resolveAuthors(config, warm) {
  const cfg = (config && config.authors) || []
  const src = (Array.isArray(cfg) && cfg.length) ? cfg : ((warm && warm.authors) || [])
  const list = Array.isArray(src) ? src : []
  return list.map(function (a, i) {
    const item = a || {}
    const name = String(item.name || '')
    return {
      key: String(item.key || item.id || ('author_' + i)),
      id: item.id != null ? item.id : '',
      name: name,
      role: String(item.role || ''),
      avatar: String(item.avatar || ''),
      url: String(item.url || ''),
      apply: item.apply === true,
      initial: name ? name.slice(0, 1) : '作',
    }
  })
}

Component({
  properties: {
    type: { type: String, value: '' },
    config: { type: Object, value: {} },
    warm: { type: Object, value: {} },
    shellStyle: { type: Object, value: {} },
  },
  data: {
    avatarBroken: false,
    showAvatarImage: false,
    brandInitial: '暖',
    memberBadgeLabel: '开通会员 ›',
    useDefaultTopBg: true,
    topBgInline: '',
    greetTitleStyle: '',
    greetSubStyle: '',
    usePlainSearch: false,
    /** 金刚区入口（_syncGreetUi 里会补isImg 标记），先给空数组避免首帧 undefined */
    navs: [],
    /** 多星球卡（_syncPlanetUi 填充） */
    planetCards: [],
    /** 单卡展示用（多星球时取 primary那一张） */
    mainPlanet: { planetId: '', title: '', members: '', items: [], cta: '', emoji: '🪐', joined: false, primary: false },
    /** 未设主星球时给「设为主星球」入口 */
    showSetMain: false,
    /** 作者条目（config.authors 优先，否则回落 warm.authors） */
    authors: [],
    /** 作者区块空态文案 */
    authorsEmptyText: '暂无作者',
  },
  observers: {
    'config, warm, shellStyle': function () {
      this._syncGreetUi()
      this._syncPlanetUi()
      this._syncAuthorsUi()
    },
    'warm.userAvatar': function () {
      this.setData({ avatarBroken: false })
      this._syncGreetUi()
    },
    'warm.authors': function () {
      this._syncAuthorsUi()
    },
  },
  lifetimes: {
    attached() {
      this._syncGreetUi()
      this._syncPlanetUi()
      this._syncAuthorsUi()
    },
  },
  methods: {
    /** 作者条目归一化：DSL 配置优先，留空回落首页聚合接口 */
    _syncAuthorsUi() {
      if (this.data.type !== 'warm_authors') return
      const config = this.data.config || {}
      const emptyText = String(config.empty_text || '').trim() || '暂无作者'
      this.setData({
        authors: resolveAuthors(config, this.data.warm),
        authorsEmptyText: emptyText,
      })
    },
    /**
     * 星球卡归一化。config.planet_mode：
     *   multi（默认）= 横滑多卡，primaryOnly 时收成单卡
     *   single       = 永远单卡（只展示主星球）
     * config.planet_ids 非空 = 只展示这几颗（装修器勾选的星球）
     * config.planet_limit = 最多几张
     */
    _syncPlanetUi() {
      if (this.data.type !== 'warm_planet_rec') return
      const config = this.data.config || {}
      const warm = this.data.warm || {}
      const all = Array.isArray(warm.planets) && warm.planets.length
        ? warm.planets
        : [warm.planet || { planetId: 'warm-main', title: '', members: '', items: [], cta: '', emoji: '🪐' }]

      const wantIds = Array.isArray(config.planet_ids)
        ? config.planet_ids.map((x) => String(x || '').trim()).filter(Boolean)
        : []
      let cards = wantIds.length
        ? wantIds.map((id) => all.find((p) => String(p.planetId) === id)).filter(Boolean)
        : all.slice()

      const limit = Number(config.planet_limit)
      if (Number.isFinite(limit) && limit > 0 && cards.length > limit) {
        cards = cards.slice(0, limit)
      }

      const primaryId = String(warm.primaryPlanetId || '')
      const single = String(config.planet_mode || 'multi') === 'single'
      const only = single || warm.primaryOnly === true || cards.length <= 1

      // 单卡时优先挑主星球；挑不到退回第一张，避免出现空白卡
      const main = only
        ? (cards.find((p) => String(p.planetId) === primaryId) || cards[0] || warm.planet || null)
        : null

      this.setData({
        planetCards: only ? [] : cards,
        mainPlanet: main || { planetId: '', title: '', members: '', items: [], cta: '', emoji: '🪐', joined: false, primary: false },
        // 已设主星球（primaryOnly）或已登录时不再打扰；只对「有卡且这张不是主星球」的用户给入口
        showSetMain: !!main && !!main.planetId && main.primary !== true && warm.primaryOnly !== true,
      })
    },
    _syncGreetUi() {
      const config = this.data.config || {}
      const warm = this.data.warm || {}
      const bg = resolveTopBg(this.data.shellStyle, config)
      const titleSize = Number(config.greet_title_font_size)
      const subSize = Number(config.greet_sub_font_size)
      const titlePx = Number.isFinite(titleSize) && titleSize > 0 ? titleSize : 20
      const subPx = Number.isFinite(subSize) && subSize > 0 ? subSize : 11
      const showAvatarImage = hasRealAvatar(warm.userAvatar) && !this.data.avatarBroken
      const usePlainSearch = isMotaiPlainSkin(config, bg)
      this.setData({
        usePlainSearch,
        useDefaultTopBg: !bg,
        topBgInline: bg ? ('background:' + bg + ';') : '',
        brandInitial: resolveBrandInitial(config, warm),
        memberBadgeLabel: resolveMemberBadgeLabel(config, warm),
        showAvatarImage,
        navs: resolveNavs(warm),
        greetTitleStyle: 'font-size:' + (titlePx * 2) + 'rpx;font-weight:700;',
        greetSubStyle: 'font-size:' + (subPx * 2) + 'rpx;',
      })
    },
    onAvatarError() {
      if (this.data.avatarBroken) return
      this.setData({ avatarBroken: true, showAvatarImage: false })
    },
    onGreetTap() { this.triggerEvent('greettap') },
    onNotice() { this.triggerEvent('notice') },
    onMemberBadge() {
      const cfg = this.data.config || {}
      const link = String(cfg.member_link || '/pages/member-center/member-center').trim()
        || '/pages/member-center/member-center'
      executeAction({ type: 'page', path: link })
      this.triggerEvent('memberbadge', { url: link })
    },
    goSearch() { this.triggerEvent('search') },
    onNav(e) { this.triggerEvent('nav', e.currentTarget.dataset || {}) },
    onAuthor(e) {
      const d = (e.currentTarget && e.currentTarget.dataset) || {}
      // 配了自定义跳转的作者条目优先走自己的链接
      const custom = String(d.url || '').trim()
      if (custom) {
        this.triggerEvent('nav', { url: custom, tab: '' })
        return
      }
      this.triggerEvent('author', d)
    },
    onFeature() { this.triggerEvent('feature') },
    onColumn(e) { this.triggerEvent('column', e.currentTarget.dataset || {}) },
    /**
     * 点星球卡：默认进介绍页（可加入/可设主星球）。
     * config.planet_action = feed 时直接进动态流。
     * 已加入的星球直接进动态流更省一步，运营可再用 planet_action=always_feed 关掉这个捷径。
     */
    onPlanetTap(e) {
      const idx = Number((e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || 0)
      const card = this.data.planetCards && this.data.planetCards.length
        ? this.data.planetCards[idx]
        : this.data.mainPlanet
      if (!card || !card.planetId) {
        wx.showToast({ title: '星球未配置', icon: 'none' })
        return
      }
      const cfg = this.data.config || {}
      const action = String(cfg.planet_action || '')
      const joined = !!card.joined
      const goFeed = action === 'feed' || action === 'always_feed'
        || (action !== 'intro' && joined)
      const url = goFeed ? card.feedUrl : card.introUrl
      this.triggerEvent('planet', { url })
    },

    /** 卡片上「设为主星球」 */
    onSetMainTap(e) {
      const id = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.planetId)
        || (this.data.mainPlanet && this.data.mainPlanet.planetId) || ''
      if (!id) return
      this._setMainPlanet(id)
    },

    /** 底部「选一个主星球」：开半屏弹层就地切，不跳页（跳页会丢首页滚动位置） */
    onPickMainTap() {
      const sheet = this.selectComponent('#planet-switch-sheet')
      if (sheet && typeof sheet.open === 'function') {
        sheet.open()
        return
      }
      // 兜底：组件未挂载时退回列表页
      this.triggerEvent('nav', { url: '/pkg-content/planet-list/planet-list', tab: '' })
    },

    /** 半屏切换成功后同步首页卡片形态（primaryOnly 决定单卡还是多卡） */
    onSwitchMainTap(e) {
      const id = (e && e.detail && e.detail.planetId) || ''
      if (!id) return
      this.setData({
        'warm.primaryOnly': true,
        'warm.primaryPlanetId': id,
      })
      this._syncPlanetUi()
      // 通知外层页面重拉聚合，让整页（不只是这一块）跟着切
      this.triggerEvent('mainplanet', { planetId: id })
    },

    onSwitchMainIntro(e) {
      const id = (e && e.detail && e.detail.planetId) || ''
      if (!id) return
      this.triggerEvent('planetintro', { planetId: id })
    },

    _setMainPlanet(planetId) {
      if (!AuthUtil.requireLoginForAction('设为主星球', { silent: true })) return
      wx.showLoading({ title: '设置中', mask: true })
      PlanetService.setMainPlanet(planetId).then((res) => {
        const newId = (res && res.planetId) || planetId
        //本地同步主星球，避免下次进首页还要等接口
        this.setData({
          'warm.primaryOnly': true,
          'warm.primaryPlanetId': newId,
        })
        this._syncPlanetUi()
        wx.showToast({ title: '已设为主星球', icon: 'success' })
        this.triggerEvent('mainplanet', { planetId: newId })
      }).catch(() => {
        // request 层已toast
      }).finally(() => {
        wx.hideLoading()
      })
    },
    onSeg(e) { this.triggerEvent('seg', e.currentTarget.dataset || {}) },
    onRetry() { this.triggerEvent('retry') },
    onMore(e) {
      const cfg = this.data.config || {}
      let url = cfg.more_url || cfg.moreUrl
        || (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.url)
        || ''
      let tab = cfg.more_tab ? '1' : ''
      if (this.data.type === 'warm_planet_rec') {
        if (!url || /\/pages\/planet\/planet\/?$/.test(String(url))) {
          url = '/pkg-content/planet-list/planet-list'
        }
        tab = ''
      }
      if (this.data.type === 'warm_authors') {
        if (!url || /\/pages\/content-list\/content-list\/?$/.test(String(url))) {
          url = '/pkg-content/author-list/author-list'
        }
        tab = ''
      }
      this.triggerEvent('nav', { url, tab })
    },
  },
})
