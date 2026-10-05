const { getNavLayout } = require('../../utils/nav-layout')
const PlanetService = require('../../services/planet')
const { get } = require('../../utils/request')
const warmPlanet = require('../../data/warm-planet')
const JOIN_ROW_DEFAULT = '👥 加入球友微信群，第一时间收到更新通知'

/** 有效期模板变量替换 —— 与后台 planetHeroConfig.renderExpireTemplate 同规则 */
const EXPIRE_VARS = { expire_date: '2027-03-18', days_left: 185, renew: '续费 8 折' }
function renderExpireTemplate(tpl, vars) {
  const v = Object.assign({}, EXPIRE_VARS, vars || {})
  return String(tpl || '')
    .replace(/\{expire_date\}/g, v.expire_date)
    .replace(/\{days_left\}/g, String(v.days_left))
    .replace(/\{renew\}/g, v.renew)
}

/** logo 值以 / 或 http 开头才当图片，否则按 emoji 文本渲染 */
function isImageLogo(value) {
  const s = String(value || '').trim()
  return s.startsWith('/uploads/') || /^https?:\/\//i.test(s)
}

Component({
  properties: {
    config: { type: Object, value: {} },
  },
  data: {
    padTop: (getNavLayout().statusBarHeight || 20) + 12,
    padX: 18,
    padBottom: 18,
    logoEmoji: '🪐',
    isImageLogo: false,
    title: warmPlanet.HOME.title,
    subtitle: warmPlanet.HOME.subtitle,
    /** 🔴 会员态：与「加入按钮」业务互斥，由星球接口的 planetActive 决定 */
    isMember: false,
    showJoinBtn: true,
    visibleKpis: [],
    joinText: '加入',
    joinLink: '/pages/member-center/member-center',
    showSwitchBtn: false,
    switchBtnText: '切换',
    switchAction: 'sheet',
    switchBtnLink: '',
    showExpireNotice: false,
    expireText: warmPlanet.EXPIRE_TEXT,
    showRenewBtn: false,
    renewText: '续费 8 折',
    renewLink: '',
    showGroupNotice: true,
    joinRowText: JOIN_ROW_DEFAULT,
    joinRowGo: '去加入 ›',
    groupActionType: 'link',
    groupLink: '/pkg-content/join/join',
    groupQrImage: '',
    groupModalTitle: '',
    groupModalDesc: '',
    groupModalOpen: false,
    kpiStyle: 'glass',
    kpis: warmPlanet.KPIS,
  },
  lifetimes: {
    attached() {
      const layout = getNavLayout()
      this.setData({
        padTop: (layout.statusBarHeight || 20) + 12,
      })
      this._apply()
    },
  },
  observers: {
    config() { this._apply() },
  },
  methods: {
    _apply() {
      const c = this.data.config || {}
      const manual = String(c.source_mode || 'auto') === 'manual'
      const padX = Number(c.padding)
      const padBottom = Number(c.padding)
      const logo = c.logo_value != null && c.logo_value !== '' ? c.logo_value : (c.logo_emoji || '🪐')
      const seed = {
        logoEmoji: logo,
        isImageLogo: isImageLogo(logo),
        title: c.title || warmPlanet.HOME.title,
        subtitle: c.subtitle || warmPlanet.HOME.subtitle,
        padX: Number.isFinite(padX) ? Math.min(24, Math.max(12, padX)) : 18,
        padBottom: Number.isFinite(padBottom) ? Math.min(24, Math.max(12, padBottom)) : 18,

        // 加入按钮
        showJoinBtn: c.show_join_btn !== false,
        joinText: c.join_text || '加入',
        joinLink: c.join_link || '/pkg-user/member-center/member-center',

        // 切换按钮（此前写死，现由后台开关控制）
        showSwitchBtn: c.show_switch_btn === true,
        switchBtnText: c.switch_btn_text || '切换',
        switchAction: c.switch_action === 'link' ? 'link' : 'sheet',
        switchBtnLink: c.switch_btn_link || '',

        // 有效期：老 DSL 只有 expire_text 文本、无开关 → 文本非空即视为开启
        showExpireNotice: c.show_expire_notice !== undefined
          ? c.show_expire_notice === true
          : String(c.expire_text || '').trim() !== '',
        expireText: renderExpireTemplate(c.expire_text || warmPlanet.EXPIRE_TEXT),
        showRenewBtn: c.show_renew_btn === true,
        renewText: c.renew_text || '续费 8 折',
        renewLink: c.renew_link || '',

        // 社群引导条
        showGroupNotice: c.show_group_notice !== false,
        joinRowText: c.join_row_text || JOIN_ROW_DEFAULT,
        joinRowGo: c.join_row_go || '去加入 ›',
        groupActionType: c.group_action_type === 'qrcode' ? 'qrcode' : 'link',
        groupLink: c.group_link || '/pkg-content/join/join',
        groupQrImage: c.group_qr_image || '',
        groupModalTitle: c.group_modal_title || '',
        groupModalDesc: c.group_modal_desc || '',

        kpiStyle: c.kpi_style === 'plain' ? 'plain' : 'glass',
        kpis: Array.isArray(c.kpis) && c.kpis.length ? c.kpis : warmPlanet.KPIS,
        // 只渲染有内容的项：空项在真机上是块空卡片，比不显示更糟。
        // 与后台 PlanetHeroRenderer.visibleKpis 同规则。
        visibleKpis: (Array.isArray(c.kpis) && c.kpis.length ? c.kpis : warmPlanet.KPIS)
          .filter((k) => k && (String((k && k.value) || '').trim() || String((k && k.label) || '').trim())),
      }
      // 同步落 DEMO，避免 hero 空 KPI 塌陷后再跳
      this.setData(seed)
      const commercePlanetId = String(c.planet_commerce_id || c.planet_id || '').trim()
      if (commercePlanetId) {
        get(`/api/v1/mp/commerce/planet/${encodeURIComponent(commercePlanetId)}/landing`, {}, { auth: false, showError: false })
          .then((res) => {
            const landing = (res && res.data) || {}
            if (!landing.configured) return
            const pid = landing.joinProductId
            const patch = {}
            if (pid) {
              patch.joinLink = `/pkg-content/product-detail/product-detail?id=${encodeURIComponent(pid)}`
              if (landing.joinProductPrice != null) {
                patch.joinText = `¥${landing.joinProductPrice} 加入`
              }
            }
            if (landing.refundWindowDays != null) {
              patch.expireText = `加入后 ${landing.refundWindowDays} 天内可申请退款（以星球说明为准）`
            }
            if (Object.keys(patch).length) this.setData(patch)
          })
          .catch(() => {})
      }
      if (manual) return
      // ⚠️ 必须带上当前主星球 id：getPlanetHome() 不传参会拿配置 primary，
      // 切换主星球后 hero 会显示回旧那颗，表现为「Tab 已切、hero 没切」
      const homePlanetId = this._homePlanetId
        || PlanetService.getCachedMainPlanetId()
        || ''
      PlanetService.getPlanetHome(homePlanetId).then((home) => {
        if (!home) return
        const planetActive = !!(home.planetMemberActive != null
          ? home.planetMemberActive
          : (home.memberActive || home.isMember))
        const packages = Array.isArray(home.packages) ? home.packages : []
        const firstPkg = packages[0]
        const pkgId = firstPkg && (firstPkg.productId || firstPkg.id)
        const patch = {
          title: home.title || seed.title,
          subtitle: home.subtitle || seed.subtitle,
          // 🔴 会员态落在这里：wxml 据此把「加入」换成续费、把有效期条显示出来
          isMember: planetActive,
          logoEmoji: seed.logoEmoji,
          isImageLogo: seed.isImageLogo,
          joinText: planetActive ? '已加入' : seed.joinText,
          joinLink: pkgId
            ? `/pkg-content/product-detail/product-detail?id=${encodeURIComponent(pkgId)}`
            : seed.joinLink,
        }
        if (planetActive && home.planetExpireText) {
          patch.expireText = home.planetExpireText
        } else if (planetActive && home.expireText) {
          patch.expireText = home.expireText
        } else if (!planetActive) {
          patch.expireText = ''
          // 游客态不该看到有效期条 —— 开关是后台配的，但内容为空时也别占位
          patch.showExpireNotice = false
        }
        if (Array.isArray(home.kpis) && home.kpis.length) patch.kpis = home.kpis
        this.setData(patch)
      }).catch(() => {})
    },
    onSwitch() {
      // switch_action=link：直接跳页，不再开半屏
      if (this.data.switchAction === 'link' && this.data.switchBtnLink) {
        wx.navigateTo({ url: this.data.switchBtnLink, fail: () => {} })
        return
      }
      this._openSwitch()
    },
    /** 打开切换半屏（组件内自取数据，不走跳页） */
    _openSwitch() {
      const sheet = this.selectComponent('#planet-switch-sheet')
      if (sheet && typeof sheet.open === 'function') {
        sheet.open()
        return
      }
      // 兜底：组件未挂载时退回列表页
      wx.navigateTo({ url: '/pkg-content/planet-list/planet-list', fail: () => {} })
    },
    /** 半屏切换成功后刷新 hero 自身（标题/副标/加入态都随主星球变） */
    onSwitchChange(e) {
      const id = (e && e.detail && e.detail.planetId) || ''
      if (id) this._homePlanetId = id
      this._apply()
    },
    /** 半屏里点了未加入的星球 → 进介绍页 */
    onSwitchIntro(e) {
      const id = (e && e.detail && e.detail.planetId) || ''
      if (!id) return
      wx.navigateTo({ url: `/pkg-content/planet-intro/planet-intro?planetId=${encodeURIComponent(id)}` })
    },
    onJoin() {
      // 会员态点了「已加入」：走续费（和有效期条同一入口）
      if (this.data.isMember) {
        this.onRenew()
        return
      }
      this.onRenew()
    },
    onRenew() {
      const url = this.data.joinLink || '/pkg-user/member-center/member-center'
      wx.navigateTo({
        url,
        fail: () => {
          if (url.indexOf('product-detail') >= 0) {
            wx.navigateTo({
              url: '/pkg-user/member-center/member-center',
              fail: () => wx.navigateTo({
                url: '/pages/member-center/member-center',
                fail: () => wx.showToast({ title: '暂时打不开', icon: 'none' }),
              }),
            })
            return
          }
          wx.navigateTo({
            url: '/pages/member-center/member-center',
            fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
          })
        },
      })
    },
    /** 加群动作：跳转链接 or 弹群活码 */
    onJoinRow() {
      if (this.data.groupActionType === 'qrcode') {
        this.setData({ groupModalOpen: true })
        return
      }
      const url = this.data.groupLink || '/pkg-content/join/join'
      wx.navigateTo({
        url,
        fail: () => wx.navigateTo({ url: this.data.joinLink || '/pkg-user/member-center/member-center' }),
      })
    },
    onGroupModalClose() {
      this.setData({ groupModalOpen: false })
    },
    noop() {},
  },
})
