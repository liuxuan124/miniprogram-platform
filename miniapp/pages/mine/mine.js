const { AuthService } = require('../../services/auth')
const { AuthUtil } = require('../../utils/auth')
const { get } = require('../../utils/request')
const { createSharePageConfig } = require('../../utils/share')
const { showTabBarForRoute } = require('../../utils/tab-bar-route')
const { blockTradeNavigation } = require('../../utils/product-module-gate')
const noticeService = require('../../services/notice')
const { loadTabBoundDslPage, TAB_DSL_INITIAL } = require('../../utils/dsl-tab-page')
const {
  DEFAULT_AVATAR,
  pickDisplayAvatarUrl,
  isTempLocalAvatar,
} = require('../../utils/image-fallback')
const { getWindowInfo } = require('../../utils/system-info')

const EMPTY_STATS = [
  { value: '—', label: '收藏' },
  { value: '—', label: '笔记' },
  { value: '—', label: '关注' },
  { value: '—', label: '暖豆' },
]

/**
 * 6 个内容模块的兜底显隐。
 * 🔴 全部 true —— 与线上 mine.wxml 的无条件渲染一致。
 * 拉到后台配置后由 _buildMinePatch 覆盖。
 */
const DEFAULT_MODULES = {
  userHeader: true,
  stats: true,
  memberCard: true,
  quickAccess: true,
  continueLearn: true,
  myPlanet: true,
}

/**
 * 后台菜单图标（line:* 线条标）→ 小程序可用的 emoji。
 * 后台存的是 line:xxx 标识，这里做一次降级映射；未收录的走 emoji 兜底。
 */
const MENU_ICON_EMOJI = {
  'line:package': '📦',
  'line:wallet': '💰',
  'line:coupon': '🎫',
  'line:heart': '❤️',
  'line:star': '⭐️',
  'line:pin': '📍',
  'line:chat': '💬',
  'line:check': '✅',
  'line:share': '🤝',
  'line:bookmark': '🔖',
  'line:link': '🔗',
  'line:camera': '📷',
  'line:chart': '📊',
  'line:phone': '📞',
  'line:sun': '🪐',
  'line:gear': '⚙️',
  'line:feedback': '📮',
  'line:crown': '👑',
  'line:calendar': '📅',
  'line:pencil': '✍️',
  'line:idcard': '🪪',
  'line:document': '🧾',
  'line:check': '✅',
  'line:list': '🕘',
  'line:bag': '🛍',
  'line:gift': '🎁',
  'line:bell': '🔔',
  'line:search': '🔍',
  'line:user': '👥',
  'line:clipboard': '🧾',
  'line:truck': '🚚',
  'line:home': '🏠',
  'line:tag': '🏷',
  'line:shield': '🛡',
  'line:grid': '🧩',
  'line:books': '🗂',
  'line:mail': '📮',
  'line:ticket': '🎟',
}

const MENU_ICON_FALLBACK = '📄'

/**
 * 菜单条件显示归一化：非法/缺省 → always。
 * 与 services/system.js 的 normalizeMineVisibleOn、管理端 types/miniapp.ts 同口径。
 */
function normalizeVisibleOn(raw) {
  const s = String(raw == null ? '' : raw).trim().toLowerCase()
  if (s === 'login' || s === 'loggedin' || s === 'logged_in') return 'login'
  if (s === 'member' || s === 'vip') return 'member'
  return 'always'
}

function resolveMenuIconText(icon) {
  const raw = String(icon || '')
  if (!raw) return MENU_ICON_FALLBACK
  if (raw.indexOf('line:') === 0) return MENU_ICON_EMOJI[raw] || MENU_ICON_FALLBACK
  return raw
}

/**
 * 兜底菜单：后台未配置 menuItems（或全部禁用）时渲染，
 * 内容与管理端 types/miniapp.ts 的 DEFAULT_MINE_MENU 保持一致。
 */
const DEFAULT_MENU_GROUPS = [
  {
    name: '内容与订单',
    items: [
      { id: 'fb-1', icon: 'line:check', title: '我的提问与打卡', url: '/pkg-content/question-ask/question-ask', needLogin: true },
      { id: 'fb-2', icon: 'line:pencil', title: '成为创作者', url: '/pkg-content/contribute/contribute', needLogin: false },
      { id: 'fb-3', icon: 'line:document', title: '我的订单', url: '/pkg-trade/order-list/order-list', needLogin: true },
      // 资料库入口暂不开放：后台 minePageConfig.menuItems 里已 enabled=false，
      // 这里同步关掉兜底项，避免配置读取失败时又露出来。星球页「资料库」分段仍可进入。
      { id: 'fb-4', icon: 'line:books', title: '我的资料库', url: '/pkg-content/resources/resources', needLogin: false, enabled: false },
      { id: 'fb-5', icon: 'line:clipboard', title: '发票管理', url: '/pkg-trade/order-list/order-list', needLogin: true },
      { id: 'fb-6', icon: 'line:coupon', title: '优惠券', url: '/pkg-user/coupon-list/coupon-list', needLogin: true },
      { id: 'fb-7', icon: 'line:share', title: '邀请好友', url: '/pkg-content/share/share', needLogin: false },
    ],
  },
  {
    name: '会员与服务',
    items: [
      { id: 'fb-8', icon: 'line:grid', title: '整店模版', url: '/pkg-templates/list/list', needLogin: false },
      { id: 'fb-9', icon: 'line:user', title: '加入读者群', url: '/pkg-content/join/join', needLogin: false },
      { id: 'fb-10', icon: 'line:mail', title: '意见反馈', url: '/pkg-user/feedback/feedback', needLogin: false },
      { id: 'fb-11', icon: 'line:gear', title: '设置', url: '/pkg-user/settings/settings', needLogin: false },
    ],
  },
]

function fmtCount(n) {
  const x = Number(n)
  if (!Number.isFinite(x) || x <= 0) return '0'
  return x.toLocaleString('en-US')
}

function withDisplayAvatar(userInfo) {
  const info = userInfo && typeof userInfo === 'object' ? userInfo : null
  const displayAvatarUrl = pickDisplayAvatarUrl(
    info && info.avatarUrl,
    info && info.avatar,
  )
  return {
    userInfo: info,
    displayAvatarUrl,
    avatarBroken: false,
  }
}

function guestState() {
  return {
    isLoggedIn: false,
    userInfo: null,
    displayAvatarUrl: DEFAULT_AVATAR,
    avatarBroken: false,
    memberInfo: null,
    continuousDays: 0,
    joinDays: 0,
    noticeUnread: 0,
    vipDesc: '登录后查看会员与学习记录',
    vipCta: '去登录',
    memberActive: false,
    planetMemberActive: false,
    stats: EMPTY_STATS,
    learnItem: null,
    planetItem: null,
    questionCount: 0,
    inviteCount: 0,
    pendingOrderCount: 0,
    unusedCouponCount: 0,
  }
}

Page({
  ...createSharePageConfig(),
  data: {
    ...TAB_DSL_INITIAL,
    statusBarHeight: 20,
    styleKey: 'warm',
    displayAvatarUrl: DEFAULT_AVATAR,
    avatarBroken: false,
    vipTitle: '暖阁年度会员',
    planetTitle: '暖阁星球',
    // 后台可改文案（minePageConfig）；此处仅作首屏兜底，拉到配置后覆盖
    mineText: {
      loginTitle: '点击登录',
      loginSubtitle: '登录后同步收藏、会员与学习记录',
    },
    // 后台开关（固定模板 + 开关模式，开放菜单编排后菜单结构由 menuGroups 决定）
    mineToggles: {
      showMemberCard: true,
      showMenuIcons: true,
      showAvatar: true,
      showMemberLevel: true,
    },
    // 6 个内容模块的显隐（1.30）；缺省全显示 = 线上现状
    modules: { ...DEFAULT_MODULES },
    // 头部配色 gradient | solid（1.30）
    headerStyle: 'gradient',
    // 卡片样式 shadow | flat | outline（1.30）
    cardStyle: 'shadow',
    // 页面级背景色；空串 = 跟随全局
    minePageBg: '',
    // 生效主题色的 inline CSS 变量（--brand/--brand-2/--brand-dark/--accent）。
    // 空串 = 用 mine.wxss 里各皮肤自带的默认变量（= 线上现状）。
    mineThemeStyle: '',
    // 功能菜单分组（来源于 minePageConfig.menuItems，未配置时用 DEFAULT_MENU_GROUPS 兜底）
    // 两处都按 enabled 过滤：后台关掉的项在兜底路径下也不该露出来
    menuGroups: DEFAULT_MENU_GROUPS.map((g) => ({
      name: g.name,
      items: g.items
        .filter((it) => it.enabled !== false)
        .map((it) => Object.assign({}, it, { iconText: resolveMenuIconText(it.icon), hint: '' })),
    })).filter((g) => g.items.length),
    ...guestState(),
  },

  onLoad() {
    try {
      const win = getWindowInfo()
      this.setData({ statusBarHeight: win.statusBarHeight || 20 })
    } catch (e) { /* ignore */ }
    loadTabBoundDslPage(this, '/pages/mine/mine').then(() => {})
    const SystemService = require('../../services/system')
    SystemService.fetchMinePageConfig(true).then((mine) => {
      if (!mine) return
      this.setData(this._buildMinePatch(mine))
    }).catch(() => {})
    SystemService.fetchSystemConfig(true).then((config) => {
      const planet = config && (config.planet_config || config.planetConfig)
      const title = planet && (planet.title || planet.name)
      if (title) this.setData({ planetTitle: title })
    }).catch(() => {})
  },

  /**
   * 把后台 minePageConfig 映射成页面可用的文案与开关。
   * 设计口径：「我的」是固定模板 + 开关，不开放 menuItems 自由编排，
   * 因此这里只接文案与显隐，菜单结构仍由本页模板决定。
   */
  /** 把后台配置合并进未登录态，避免 guestState 的写死文案覆盖配置 */
  _withMineConfig(state) {
    const cfg = this._mineCfg || {}
    const next = { ...state }
    if (cfg.memberCardDesc) next.vipDesc = cfg.memberCardDesc
    if (cfg.loginButtonText) next.vipCta = cfg.loginButtonText
    return next
  },

  _buildMinePatch(mine) {
    const cfg = mine || {}
    this._mineCfg = cfg
    const profile = cfg.userProfile || {}
    // 1.30：模块显隐直接下发整块，wxml 用 modules.xxx 做 wx:if 整块包裹，
    // 隐藏时不留任何 margin/padding 空位。缺字段由 system.js 归一化成 true。
    const modules = cfg.modules && typeof cfg.modules === 'object'
      ? Object.assign({}, DEFAULT_MODULES, cfg.modules)
      : { ...DEFAULT_MODULES }
    const patch = {
      mineText: {
        loginTitle: cfg.loginTitle || '点击登录',
        loginSubtitle: cfg.loginSubtitle || '登录后同步收藏、会员与学习记录',
      },
      modules,
      mineToggles: {
        // 会员卡显隐 = modules.memberCard && 老字段 showMemberCard（双口径兼容）
        showMemberCard: modules.memberCard !== false && cfg.showMemberCard !== false,
        showMenuIcons: cfg.showMenuIcons !== false,
        showAvatar: profile.showAvatar !== false,
        showMemberLevel: profile.showMemberLevel !== false,
      },
    }
    if (cfg.styleKey) patch.styleKey = cfg.styleKey
    if (cfg.headerStyle) patch.headerStyle = cfg.headerStyle
    if (cfg.cardStyle) patch.cardStyle = cfg.cardStyle
    if (cfg.memberCardTitle) patch.vipTitle = cfg.memberCardTitle
    if (cfg.pageBackgroundColor) patch.minePageBg = cfg.pageBackgroundColor
    // 主题色：system.js 已算好最终生效值（inherit→全局色 / page→页面色）。
    // 这里转成 inline style 变量注入，mine.wxss 里的 --brand* 就靠它覆盖。
    const theme = cfg.theme
    if (theme && theme.primary) {
      patch.mineThemeStyle = [
        `--brand:${theme.primary}`,
        `--brand-2:${theme.secondary || theme.primary}`,
        `--brand-dark:${theme.primary}`,
        `--accent:${theme.secondary || theme.primary}`,
      ].join(';') + ';'
    }
    // memberCardDesc 只用于未登录态；已登录时 vipDesc 由会员概览接口决定
    if (cfg.memberCardDesc && !AuthUtil.isLoggedIn()) {
      patch.vipDesc = cfg.memberCardDesc
    }
    if (cfg.loginButtonText && !AuthUtil.isLoggedIn()) {
      patch.vipCta = cfg.loginButtonText
    }
    const menuGroups = this._menuGroupsFromConfig(cfg)
    if (menuGroups.length) patch.menuGroups = menuGroups
    return patch
  },

  /**
   * 后台菜单配置 → 分组渲染数据。
   * 口径：后台若配了至少一项启用菜单就完全听后台的（标题/顺序/分组/图标/跳转），
   * 没有配置时才回退到本页内置菜单，避免过去「后台配了不生效」的错觉。
   *
   * 1.30 起额外按 `visibleOn` 做**条件显示**（always / login / member）。
   * 🔴 这只是界面隐藏，不是权限控制：needLogin 的登录校验仍在 onMenuRowTap 里，
   * 不要因为配了 visibleOn 就把 needLogin 删掉。
   */
  _menuGroupsFromConfig(cfg) {
    const raw = Array.isArray(cfg && cfg.menuItems) ? cfg.menuItems : []
    const isMember = !!this.data.memberActive || !!this.data.planetMemberActive
    const isLoggedIn = !!this.data.isLoggedIn
    const enabled = raw.filter((m) => {
      if (!m || m.enabled === false || !String(m.url || '').trim()) return false
      // 条件显示：会员可见 / 登录后显示
      const rule = normalizeVisibleOn(m.visibleOn)
      if (rule === 'login' && !isLoggedIn) return false
      if (rule === 'member' && !(isLoggedIn && isMember)) return false
      return true
    })
    if (!enabled.length) return []
    const order = []
    const map = {}
    enabled.forEach((m, i) => {
      const name = String(m.group || '').trim() || '更多'
      if (!map[name]) {
        map[name] = { name, items: [] }
        order.push(name)
      }
      map[name].items.push({
        id: String(m.id || `cfg-${i}`),
        title: String(m.title || '未命名'),
        url: String(m.url),
        needLogin: m.needLogin === true,
        iconText: resolveMenuIconText(m.icon),
        hint: this._menuHintFor(m.title),
      })
    })
    return order.map((name) => map[name])
  },

  /**
   * 登录态/会员态变化后，条件显示的菜单项可能需要增减 → 重算 menuGroups。
   * 在 _loadMineOverview / _refreshUserInfo 之后调用。
   */
  _syncConditionalMenus() {
    if (!this._mineCfg) return
    const groups = this._menuGroupsFromConfig(this._mineCfg)
    if (!groups.length) return
    this.setData({ menuGroups: groups })
  },

  /** 菜单右侧的数值角标；匹配不到返回空串，由 wxml 回退显示 › */
  _menuHintFor(title) {
    const d = this.data
    const t = String(title || '')
    if (!d.isLoggedIn) return ''
    if (t.indexOf('优惠券') >= 0 && d.unusedCouponCount) return `${d.unusedCouponCount} 张可用`
    if (t.indexOf('提问') >= 0 && d.questionCount) return `${d.questionCount} 个提问`
    if (t.indexOf('邀请') >= 0 && d.inviteCount) return `已邀 ${d.inviteCount} 人`
    if (t.indexOf('订单') >= 0 && d.pendingOrderCount) return `${d.pendingOrderCount} 笔待支付`
    return ''
  },

  /** 登录态/计数值变化后刷新菜单角标 */
  _syncMenuHints() {
    const groups = this.data.menuGroups || []
    if (!groups.length) return
    const next = groups.map((g) => ({
      name: g.name,
      items: (g.items || []).map((it) => Object.assign({}, it, { hint: this._menuHintFor(it.title) })),
    }))
    this.setData({ menuGroups: next })
  },

  onMenuRowTap(e) {
    const ds = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset : {}
    const url = String(ds.url || '')
    if (!url) return
    const needLogin = ds.login === 1 || ds.login === '1'
    this._nav(url, needLogin, '查看' + (ds.title || '详情'))
  },

  onReady() {
    if (typeof wx.showShareMenu === 'function') {
      wx.showShareMenu({
        withShareTicket: true,
        menus: ['shareAppMessage', 'shareTimeline'],
        fail() {},
      })
    }
    this._loginSheet = this.selectComponent('#global-login-sheet')
  },

  onShow() {
    wx.hideTabBar({ animation: false, fail() {} })
    showTabBarForRoute(this, '/pages/mine/mine')
    const { onTabPageShow } = require('../../utils/content-release-sync')
    onTabPageShow(this, '/pages/mine/mine', () => {
      this._refreshUserInfo()
      if (AuthUtil.isLoggedIn()) this._loadMineOverview()
    })
    this._resetStuckLoginSheet()
    try {
      const SystemService = require('../../services/system')
      SystemService.fetchMinePageConfig(false).then((mine) => {
        if (mine) this.setData(this._buildMinePatch(mine))
      }).catch(() => {})
    } catch (e) { /* ignore */ }
    AuthService.silentLogin()
      .then((loggedIn) => {
        this._refreshUserInfo()
        if (loggedIn) this._loadMineOverview()
      })
      .catch(() => this._refreshUserInfo())
  },

  _refreshUserInfo() {
    const app = getApp()
    const isLoggedIn = AuthUtil.isLoggedIn()
    const userInfo = isLoggedIn
      ? (AuthUtil.getUserInfo() || (app && app.globalData.userInfo) || null)
      : null
    if (app) {
      app.globalData.isLoggedIn = isLoggedIn
      app.globalData.token = isLoggedIn ? AuthUtil.getToken() : null
      app.globalData.userInfo = userInfo
    }
    if (!isLoggedIn) {
      // guestState() 带写死的会员卡文案，直接 setData 会覆盖刚拉到的后台配置
      // （两者是异步竞态，谁后到谁赢）。这里把配置合并回去。
      this.setData(this._withMineConfig(guestState()), () => {
        this._syncMenuHints()
        // 未登录态下「登录后显示 / 会员可见」的菜单项要收起来
        this._syncConditionalMenus()
      })
      return
    }
    const patched = withDisplayAvatar(userInfo)
    // 本地缓存若仍是 localhost/临时路径，写回已解析后的可展示 URL（或清空等 overview）
    if (patched.userInfo && patched.displayAvatarUrl !== DEFAULT_AVATAR) {
      const next = Object.assign({}, patched.userInfo, { avatarUrl: patched.displayAvatarUrl })
      AuthUtil.setUserInfo(next)
      if (app) app.globalData.userInfo = next
      this.setData({ isLoggedIn: true, userInfo: next, displayAvatarUrl: patched.displayAvatarUrl, avatarBroken: false })
      return
    }
    this.setData({
      isLoggedIn: true,
      userInfo: patched.userInfo,
      displayAvatarUrl: patched.displayAvatarUrl,
      avatarBroken: false,
    })
  },

  onAvatarError() {
    // 临时头像偶发加载失败时不要立刻清空，留给上传完成后刷新
    if (isTempLocalAvatar(this.data.displayAvatarUrl)) return
    if (this.data.displayAvatarUrl === DEFAULT_AVATAR) return
    this.setData({ displayAvatarUrl: DEFAULT_AVATAR, avatarBroken: true })
  },

  _loadMineOverview() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData(guestState())
      return
    }
    get('/api/v1/mp/mine/overview', {}, { auth: true, showError: false })
      .then((data) => {
        if (!AuthUtil.isLoggedIn()) {
          this.setData(guestState())
          return
        }
        const local = AuthUtil.getUserInfo() || {}
        const nickName = data.nickname || local.nickName || local.nickname || '微信用户'
        // 优先本地（含刚选的微信临时头像），避免被 overview 旧坏链盖掉
        const displayAvatarUrl = pickDisplayAvatarUrl(
          local.avatarUrl,
          local.avatar,
          data.avatarUrl,
        )
        const userInfo = Object.assign({}, local, { nickName, nickname: nickName })
        if (displayAvatarUrl && displayAvatarUrl !== DEFAULT_AVATAR) {
          userInfo.avatarUrl = displayAvatarUrl
        }
        AuthUtil.setUserInfo(userInfo)
        const expire = data.memberExpireAt || ''
        const memberActive = !!(data.platformMemberActive != null
          ? data.platformMemberActive
          : data.memberActive)
        const planetActive = !!data.planetMemberActive
        let vipDesc = '尚未开通平台会员'
        let vipCta = '去开通'
        if (data.platformExpireText) {
          vipDesc = data.platformExpireText
          vipCta = memberActive ? '去续费' : '去开通'
        } else if (memberActive && expire) {
          vipDesc = `平台会员至 ${expire}`
          vipCta = '去续费'
        } else if (memberActive) {
          vipDesc = '平台会员有效'
          vipCta = '去查看'
        }
        const planetItem = data.planet || null
        if (planetItem && data.planetExpireText && !planetItem.remainDays && planetActive) {
          planetItem._expireHint = data.planetExpireText
        }
        this.setData({
          isLoggedIn: true,
          userInfo,
          displayAvatarUrl,
          avatarBroken: false,
          memberInfo: { level_name: data.levelName || '' },
          continuousDays: Number(data.continuousSignDays) || 0,
          joinDays: Number(data.joinDays) || 0,
          memberActive,
          planetMemberActive: planetActive,
          vipDesc,
          vipCta,
          stats: [
            { value: fmtCount(data.favoriteCount), label: '收藏' },
            { value: fmtCount(data.noteCount), label: '笔记' },
            { value: fmtCount(data.followCount), label: '关注' },
            { value: fmtCount(data.points), label: '暖豆' },
          ],
          learnItem: data.learn || null,
          planetItem,
          planetTitle: (data.planet && data.planet.title) || this.data.planetTitle,
          questionCount: Number(data.questionCount) || 0,
          inviteCount: Number(data.inviteCount) || 0,
          pendingOrderCount: Number(data.pendingOrderCount) || 0,
          unusedCouponCount: Number(data.unusedCouponCount) || 0,
        }, () => {
          this._syncMenuHints()
          // 登录态/会员态已确定，按 visibleOn 重算菜单可见性
          this._syncConditionalMenus()
        })
      })
      .catch(() => {
        if (!AuthUtil.isLoggedIn()) {
          this.setData(guestState(), () => this._syncMenuHints())
        }
      })
    this._loadNoticeUnread()
  },

  _loadNoticeUnread() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData({ noticeUnread: 0 })
      return
    }
    noticeService.unreadCount()
      .then((data) => {
        const count = Number((data && (data.count || data.unread)) || 0)
        this.setData({ noticeUnread: Number.isFinite(count) ? count : 0 })
        const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null
        if (tabBar && tabBar.setNoticeUnread) tabBar.setNoticeUnread(this.data.noticeUnread)
      })
      .catch(() => this.setData({ noticeUnread: 0 }))
  },

  _resetStuckLoginSheet() {
    const sheet = this._loginSheet || this.selectComponent('#global-login-sheet')
    if (!sheet || !sheet.data) return
    if (sheet.data.mounted && !sheet.data.visible && !sheet.data.loading) {
      sheet.setData({ mounted: false, visible: false })
    }
  },

  _openLoginSheet(action) {
    const options = {
      action: action || '',
      onSuccess: () => {
        this._refreshUserInfo()
        this._loadMineOverview()
      },
    }
    const tryShow = () => {
      const sheet = this._loginSheet || this.selectComponent('#global-login-sheet')
      if (sheet && typeof sheet.show === 'function') {
        sheet.show(options)
        return true
      }
      return false
    }
    if (tryShow()) return true
    wx.nextTick(() => {
      if (tryShow()) return
      setTimeout(() => {
        if (tryShow()) return
        AuthUtil.openLoginSheet(options)
      }, 100)
    })
    return false
  },

  _ensureLogin(desc) {
    if (AuthUtil.isLoggedIn()) return true
    this._openLoginSheet(desc)
    return false
  },

  _nav(url, needLogin, loginDesc) {
    if (needLogin && !this._ensureLogin(loginDesc || '继续操作')) return
    if (blockTradeNavigation(url)) return
    if (url.indexOf('/pages/planet/planet') === 0
      || url.indexOf('/pages/shop/shop') === 0
      || url.indexOf('/pages/discover/discover') === 0
      || url.indexOf('/pages/mine/mine') === 0
      || url.indexOf('/pages/index/index') === 0) {
      wx.switchTab({ url })
      return
    }
    wx.navigateTo({
      url,
      fail: () => wx.showToast({ title: '页面打开失败', icon: 'none' }),
    })
  },

  onUserAreaTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('同步收藏与阅读记录')
      return
    }
    this._nav('/pkg-user/settings/settings')
  },

  onSettingsTap() {
    wx.navigateTo({
      url: '/pkg-user/settings/settings',
      fail: (err) => {
        console.warn('[mine] open settings failed', err)
        wx.showToast({ title: '设置页打开失败', icon: 'none' })
      },
    })
  },

  onMemberCardTap() {
    if (!this.data.isLoggedIn) {
      this._openLoginSheet('开通会员')
      return
    }
    this._nav('/pkg-user/member-center/member-center')
  },

  onNoticeTap() {
    this._nav('/pkg-user/notices/notices', true, '查看消息')
  },

  onGoFavorites() {
    this._nav('/pkg-user/favorites/favorites', true, '查看收藏')
  },

  onGoHistory() {
    this._nav('/pkg-content/content-list/content-list')
  },

  onGoOrders() {
    this._nav('/pkg-trade/order-list/order-list', true, '查看订单')
  },

  onGoLibrary() {
    this._nav('/pkg-user/my-library/my-library', true, '查看已购')
  },

  onGoLearnMore() {
    if (!this._ensureLogin('同步学习进度')) return
    const item = this.data.learnItem
    if (item && item.productId) {
      this._nav(`/pkg-content/product-detail/product-detail?id=${item.productId}`)
      return
    }
    this._nav('/pages/shop/shop')
  },

  onGoPlanet() {
    this._nav('/pages/planet/planet')
  },

  onGoAsk() {
    this._nav('/pkg-content/question-ask/question-ask', true, '提问打卡')
  },

  onGoContribute() {
    this._nav('/pkg-content/contribute/contribute')
  },

  onGoResources() {
    this._nav('/pkg-content/resources/resources')
  },

  onGoCoupons() {
    this._nav('/pkg-user/coupon-list/coupon-list', true, '查看优惠券')
  },

  onGoShare() {
    this._nav('/pkg-content/share/share')
  },

  onGoJoin() {
    this._nav('/pkg-content/join/join')
  },

  onGoTemplates() {
    this._nav('/pkg-templates/list/list')
  },

  onGoService() {
    this._nav('/pkg-user/service-chat/service-chat')
  },

  onGoFeedback() {
    this._nav('/pkg-user/feedback/feedback')
  },

  onLogoutTap() {
    if (!this.data.isLoggedIn) return
    wx.showModal({
      title: '退出登录',
      content: '退出后将清除本机登录信息，不会删除账号',
      success: (res) => {
        if (!res.confirm) return
        AuthService.logout({ manual: true, redirectToLogin: false })
        this.setData(guestState())
        wx.showToast({ title: '已退出登录', icon: 'success' })
      },
    })
  },
})
