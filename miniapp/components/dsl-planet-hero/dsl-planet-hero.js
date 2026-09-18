const { getNavLayout } = require('../../utils/nav-layout')
const PlanetService = require('../../services/planet')
const warmPlanet = require('../../data/warm-planet')

const JOIN_ROW_DEFAULT = '👥 加入球友微信群，第一时间收到更新通知'

Component({
  properties: {
    config: { type: Object, value: {} },
  },
  data: {
    padTop: (getNavLayout().statusBarHeight || 20) + 12,
    logoEmoji: '🪐',
    title: warmPlanet.HOME.title,
    subtitle: warmPlanet.HOME.subtitle,
    joinText: '加入',
    expireText: warmPlanet.EXPIRE_TEXT,
    joinRowText: JOIN_ROW_DEFAULT,
    joinRowGo: '去加入 ›',
    joinLink: '/pages/member-center/member-center',
    joinRowLink: '/pages/join/join',
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
      const seed = {
        logoEmoji: c.logo_emoji || '🪐',
        title: c.title || warmPlanet.HOME.title,
        subtitle: c.subtitle || warmPlanet.HOME.subtitle,
        joinText: c.join_text || '加入',
        expireText: c.expire_text || warmPlanet.EXPIRE_TEXT,
        joinRowText: c.join_row_text || JOIN_ROW_DEFAULT,
        joinRowGo: c.join_row_go || '去加入 ›',
        joinLink: c.join_link || '/pkg-user/member-center/member-center',
        joinRowLink: c.join_row_link || '/pages/join/join',
        kpis: Array.isArray(c.kpis) && c.kpis.length ? c.kpis : warmPlanet.KPIS,
      }
      // 同步落 DEMO，避免 hero 空 KPI 塌陷后再跳
      this.setData(seed)
      if (manual) return
      PlanetService.getPlanetHome().then((home) => {
        if (!home) return
        const patch = {
          title: home.title || seed.title,
          subtitle: home.subtitle || seed.subtitle,
          joinText: (home.memberActive || home.isMember) ? '已加入' : seed.joinText,
          logoEmoji: seed.logoEmoji,
          joinLink: seed.joinLink,
          joinRowLink: seed.joinRowLink,
          joinRowGo: seed.joinRowGo,
          joinRowText: seed.joinRowText,
        }
        if (home.expireText) patch.expireText = home.expireText
        if (Array.isArray(home.kpis) && home.kpis.length) patch.kpis = home.kpis
        this.setData(patch)
      }).catch(() => {})
    },
    onSwitch() {
      wx.navigateTo({ url: '/pages/planet-list/planet-list' })
    },
    onJoin() {
      if (this.data.joinText === '已加入') {
        wx.showToast({ title: '你已是球友', icon: 'none' })
        return
      }
      this.onRenew()
    },
    onRenew() {
      const url = this.data.joinLink || '/pkg-user/member-center/member-center'
      wx.navigateTo({
        url,
        fail: () => wx.navigateTo({
          url: '/pages/member-center/member-center',
          fail: () => wx.showToast({ title: '暂时打不开会员中心', icon: 'none' }),
        }),
      })
    },
    onJoinRow() {
      const url = this.data.joinRowLink || '/pages/join/join'
      wx.navigateTo({
        url,
        fail: () => wx.navigateTo({ url: this.data.joinLink || '/pkg-user/member-center/member-center' }),
      })
    },
  },
})
