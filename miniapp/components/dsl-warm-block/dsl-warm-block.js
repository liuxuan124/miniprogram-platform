const { executeAction } = require('../../utils/render')
const PlanetService = require('../../services/planet')
const { AuthUtil } = require('../../utils/auth')
const request = require('../../utils/request')

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
 * 作者主页路径：与后台 admin/src/api/author.ts 的 authorHomePath 同一规则。
 * 真实页面是分包子包 author-feed/author-feed，入参 id + author 两个。
 * 手写路径必 404，所以端上不各自拼字符串 —— 后端聚合接口也会回传 homePath。
 */
function buildAuthorHomePath(authorId, name) {
  const n = String(name || '').trim()
  return '/pkg-content/author-feed/author-feed?id=' + authorId + (n ? '&author=' + n : '')
}

/** 从 authors 里剥掉旧招募位条目（apply=true） */
function authorCfgList(config) {
  const cfg = (config && config.authors) || []
  const list = Array.isArray(cfg) ? cfg.filter(Boolean) : []
  return list.filter((a) => a.apply !== true)
}

/** 旧数据里的招募位条目 */
function legacyRecruitItem(config) {
  const cfg = (config && config.authors) || []
  if (!Array.isArray(cfg)) return null
  return cfg.find((a) => a && a.apply === true) || null
}

/**
 * 招募位配置（V121，从「每条作者一个开关」解耦为组件级）。
 * 优先级：新 recruitment_slot 字段 → 旧 authors 里的 apply 条目（向后兼容）。
 * 与后台 DslWarmBlock.recruitSlot 同一规则。
 */
function resolveRecruitSlot(config) {
  const slot = (config && config.recruitment_slot) || {}
  const legacy = legacyRecruitItem(config)
  const enabled = slot.enabled === true || (slot.enabled === undefined && !!legacy)
  if (!enabled) return null
  return {
    iconText: String(slot.icon_text || '＋'),
    label: String(slot.label || '招募中'),
    targetPath: String(slot.target_path || (legacy ? String(legacy.url || '') : '')),
  }
}

/**
 * 作者列表归一化（V121，与后台预览 DslWarmBlock.authorList 同规则）：
 *   1. source_mode = dynamic → dynamicAuthors（聚合接口结果，见 fetchDynamicAuthors）
 *   2. source_mode = manual（或未写该字段）且 authors 非空 → 用配的快照
 *   3. 都没配 → 回落到 warm.authors（warm_home_config.authors），历史页面外观不变
 *
 * 快照模式下 authors 里可能残留 apply=true 的旧招募位条目，这里过滤掉，
 * 由 resolveRecruitSlot 单独渲染成末尾的「＋」卡片。
 * 统一出 key/name/role/avatar/homePath 字段，wxml 不再关心数据来源。
 */
function resolveAuthors(config, warm, dynamicAuthors) {
  const mode = String((config && config.source_mode) || '')
  const isDynamic = mode === 'dynamic'
  const cfgList = authorCfgList(config)
  const warmList = (warm && warm.authors) || []

  let src
  if (isDynamic) {
    src = Array.isArray(dynamicAuthors) ? dynamicAuthors : []
  } else if (cfgList.length) {
    src = cfgList
  } else {
    src = Array.isArray(warmList) ? warmList : []
  }

  return src.filter(Boolean).map((a, i) => {
    const name = String(a.nickname || a.name || '')
    const originTitle = String(a.title || a.role || '')
    // customTitle 只覆盖首页展示，不动作者库档案
    const role = String(a.customTitle || originTitle || '')
    const authorId = a.authorId || a.id || 0
    const homePath = String(a.homePath || a.url || (authorId ? buildAuthorHomePath(authorId, name) : ''))
    return {
      key: String(a.key || a.id || ('author_' + i)),
      id: a.authorId || a.id || '',
      name,
      role,
      avatar: String(a.avatar || a.avatarUrl || ''),
      homePath,
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
    /** 作者条目（V121：source_mode 决定走快照还是 dynamicAuthors，都没配则回落 warm.authors） */
    authors: [],
    /** 动态聚合模式从作者库拉到的结果（source_mode=dynamic 时生效） */
    dynamicAuthors: [],
    /** 招募位（V121 组件级配置，渲染在列表末尾的「＋」卡片） */
    recruitSlot: null,
    /** 作者区块空态文案 */
    authorsEmptyText: '暂无作者',
    /** 品牌专栏（_syncColumnsUi 填充） */
    columnList: [],
    columnLayout: 'scroll',
    columnGap: 10,
    columnRadius: 14,
    autoHideColumns: true,
  },
  observers: {
    'config, warm, shellStyle': function () {
      this._syncGreetUi()
      this._syncPlanetUi()
      this._syncAuthorsUi()
      this._syncColumnsUi()
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
    /**
     * 作者区块归一化（V121：双模式 + 招募位解耦）。
     * 与后台 DslWarmBlock.vue 的 authorList / recruitSlot 完全同规则 ——
     * 改一边必须改另一边，否则画布与真机必分歧。
     */
    _syncAuthorsUi() {
      if (this.data.type !== 'warm_authors') return
      const config = this.data.config || {}
      const emptyText = String(config.empty_text || '').trim() || '暂无作者'
      const mode = String(config.source_mode || '')
      const authors = resolveAuthors(config, this.data.warm, this.data.dynamicAuthors)
      const recruitSlot = resolveRecruitSlot(config)
      // 没有作者也没有招募位才算空态（只有招募位时仍要渲染出「＋」）
      const patch = {
        authors,
        recruitSlot,
        authorsEmptyText: emptyText,
      }
      this.setData(patch)

      // 动态聚合模式：按标签+排序去作者库实时拉取
      if (mode === 'dynamic') {
        this._fetchDynamicAuthors(config)
      }
    },

    /** 动态聚合：GET /api/v1/mp/authors?tags=&sortBy=&limit= */
    _fetchDynamicAuthors(config) {
      const cfg = (config && config.dynamic_config) || {}
      const tags = Array.isArray(cfg.tag_ids) ? cfg.tag_ids : []
      const sortBy = String(cfg.sort_by || 'weight')
      let limit = Number(cfg.limit)
      if (!isFinite(limit) || limit <= 0) limit = 5
      limit = Math.min(8, Math.max(3, Math.round(limit)))

      const self = this
      request
        .get(
          '/api/v1/mp/authors',
          { tags: tags.join(','), sortBy, limit },
          { auth: false, showError: false },
        )
        .then((rows) => {
          const list = Array.isArray(rows) ? rows : []
          self.setData({ dynamicAuthors: list })
          self._syncAuthorsUi()
        })
        .catch(() => {
          // 聚合失败不阻断渲染：作者列表为空即可，真机看到空态文案
          self.setData({ dynamicAuthors: [] })
        })
    },

    /**
     * 品牌专栏（warm_columns）归一化，规则与后台 DslWarmBlock 严格一致。
     *
     * 🔴 与后台的唯一差异：**绝不注入演示卡片**。
     * 后台装修器画布会用 COLUMN_MOCK_ITEMS 填充，让运营看得见排版；
     * 真机出现运营没上架过的假专栏是事故，所以端上只认 warm.columns。
     *
     * config 字段：
     *   limit                 展示数量 1-10（默认 4）
     *   fetch_mode            auto（默认，按聚合顺序）/ manual（按 column_ids）
     *   column_ids            手动指定顺序即展示顺序
     *   layout                single / grid / scroll（默认 scroll，与历史一致）
     *   item_gap / card_radius 间距 4-24 / 圆角 0-20
     *   show_badge/show_host/show_lessons/show_price 显隐（默认全开）
     *   auto_hide_when_empty  无数据时整块隐藏（默认开）
     */
    _syncColumnsUi() {
      if (this.data.type !== 'warm_columns') return
      const cfg = this.data.config || {}
      const warm = this.data.warm || {}

      const limitRaw = Number(cfg.limit)
      const limit = Number.isFinite(limitRaw) ? Math.min(10, Math.max(1, Math.round(limitRaw))) : 4
      const gapRaw = Number(cfg.item_gap)
      const gap = Number.isFinite(gapRaw) ? Math.min(24, Math.max(4, Math.round(gapRaw))) : 10
      const radiusRaw = Number(cfg.card_radius)
      const radius = Number.isFinite(radiusRaw) ? Math.min(20, Math.max(0, Math.round(radiusRaw))) : 14
      const layout = cfg.layout === 'single' || cfg.layout === 'grid' ? cfg.layout : 'scroll'

      const all = Array.isArray(warm.columns) ? warm.columns : []
      let picked = all
      if (cfg.fetch_mode === 'manual' && Array.isArray(cfg.column_ids) && cfg.column_ids.length) {
        const ids = cfg.column_ids.map((x) => String(x))
        const ordered = []
        for (let i = 0; i < ids.length; i += 1) {
          const hit = all.filter((c) => String(c.id) === ids[i])[0]
          if (hit) ordered.push(hit)
        }
        // 指定了一个都没命中（商品下架）→ 回落全部，避免运营看到空块以为操作没生效
        if (ordered.length) picked = ordered
      }

      const showBadge = cfg.show_badge !== false
      const showHost = cfg.show_host !== false
      const showLessons = cfg.show_lessons !== false
      const showPrice = cfg.show_price !== false
      const showDesc = cfg.show_desc !== false

      const columnList = picked.slice(0, limit).map((c) => {
        const item = Object.assign({}, c)
        // wxml 的 <template> 无法跨作用域取外层变量，圆角拼进数据里单一来源。
        // 单位换算成 rpx：面板填的是 px，而 wxss 里卡片尺寸全是 rpx，
        // 直接把 px 写进 inline style 会与相邻 rpx 圆角失真（375 画幅下 2 倍差）。
        item.columnRadius = radius * 2
        if (!showBadge) item.badge = ''
        if (!showHost) item.host = ''
        if (!showLessons) item.lessons = ''
        if (!showPrice) {
          item.price = ''
          item.origin = ''
        }
        if (!showDesc) item.desc = ''
        return item
      })

      this.setData({
        columnList,
        columnLayout: layout,
        columnGap: gap,
        // wxml 里统一用 rpx：面板填的是 px，而 wxss 里卡片尺寸全是 rpx，
        // 直接把 px 写进 style 会与相邻 rpx 间距失真（375 画幅下 2 倍差）
        columnGapRpx: gap * 2,
        columnRadius: radius,
        autoHideColumns: cfg.auto_hide_when_empty !== false,
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
    /**
     * 点作者条目：V121 起路径统一为 homePath（由后端/前端按同一规则生成），
     * 没有 homePath 时按 id 兜底拼作者作品页。
     */
    onAuthor(e) {
      const d = (e.currentTarget && e.currentTarget.dataset) || {}
      const path = String(d.homePath || '').trim()
      if (path) {
        this.triggerEvent('nav', { url: path, tab: '' })
        return
      }
      this.triggerEvent('author', d)
    },

    /**
     * 点招募位（V121）：读组件级 recruitment_slot.target_path。
     * 旧数据里没有该配置时回落作者列表页，与历史行为一致。
     */
    onRecruit(e) {
      const d = (e.currentTarget && e.currentTarget.dataset) || {}
      const path = String(d.path || '').trim() || '/pkg-content/author-list/author-list'
      this.triggerEvent('nav', { url: path, tab: '' })
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
