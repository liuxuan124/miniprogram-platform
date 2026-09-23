const SystemService = require('../../services/system')
const { createSharePageConfig } = require('../../utils/share')
const { DEMO_JOIN } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, FORCE_LOCAL_DEMO } = require('../../data/warm-source')

const NAV_TITLE = '加入社群 · 联系我们'

function parseExpireAt(raw) {
  if (!raw) return null
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw
  const s = String(raw).trim()
  if (!s) return null
  const ts = Date.parse(s.replace(/-/g, '/'))
  return Number.isFinite(ts) ? ts : null
}

function isExpired(g) {
  if (!g) return true
  if (g.expired === true || g.expired === 1 || g.expired === '1') return true
  const ts = parseExpireAt(g.qrExpireAt || g.qr_expire_at || g.expireAt || g.expire_at)
  if (ts != null && ts < Date.now()) return true
  return false
}

function expireTip(g) {
  const ts = parseExpireAt(g && (g.qrExpireAt || g.qr_expire_at || g.expireAt || g.expire_at))
  if (!ts) return '二维码可能定期更新 · 扫不出请回本页重试或联系客服'
  const d = new Date(ts)
  const pad = (n) => (n < 10 ? '0' + n : '' + n)
  return `二维码有效期至 ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

Page({
  ...createSharePageConfig(),
  data: {
    loading: true,
    loadError: false,
    heroTitle: '',
    desc: '',
    memberCount: '',
    avatars: [],
    groups: [],
    faqs: [],
    ownerWay: null,
    wecomUrl: '',
    wecomName: '企微客服',
    wecomQr: '',
    sheetVisible: false,
    sheetGroup: {},
    sheetExpireTip: '',
    onlineServiceHint: '',
    servicePhone: '',
  },

  onLoad(options) {
    wx.setNavigationBarTitle({ title: NAV_TITLE })
    if (options && options.url) {
      try {
        this.setData({
          wecomUrl: decodeURIComponent(options.url),
          wecomName: options.name ? decodeURIComponent(options.name) : '企微客服',
        })
      } catch (e) {
        this.setData({ wecomUrl: options.url || '' })
      }
    }
    if (USE_LOCAL_SOURCE || FORCE_LOCAL_DEMO) {
      this._applyDemo()
      return
    }
    this._loadConfig()
  },

  onShow() {
    wx.setNavigationBarTitle({ title: NAV_TITLE })
  },

  onRetry() {
    this._loadConfig()
  },

  _applyDemo() {
    this.setData({
      loading: false,
      loadError: false,
      heroTitle: DEMO_JOIN.title,
      desc: DEMO_JOIN.desc,
      memberCount: DEMO_JOIN.memberCount,
      avatars: DEMO_JOIN.avatars,
      groups: this._mapGroups(DEMO_JOIN.groups),
      faqs: DEMO_JOIN.faqs,
      ownerWay: DEMO_JOIN.ownerWay,
      onlineServiceHint: DEMO_JOIN.desc,
    })
  },

  _mapGroups(groups) {
    const list = Array.isArray(groups) ? groups : []
    return list.map((g, i) => {
      const fillRaw = g && g.fill
      const fill = fillRaw != null ? Math.max(0, Math.min(100, Number(fillRaw) || 0)) : null
      const full = !!(g && (g.full || (fill != null && fill >= 100)))
      const expired = isExpired(g)
      const hasQr = !!(g && (g.qrcode || g.qrCode))
      const hasWecom = !!(g && (g.wecom_url || g.wecomUrl))
      const members = g && (g.members || g.memberCount)
      let desc = (g && (g.desc || g.description || g.direction)) || ''
      if (!desc && members != null) desc = `${members} 人`
      if (expired && !full) desc = desc ? `${desc} · 二维码已失效` : '二维码已失效，请联系客服'
      else if (!hasQr && !hasWecom && !full) desc = desc ? `${desc} · 暂未开放` : '暂未开放入群'
      return {
        id: String((g && g.id) || i),
        name: (g && (g.name || g.title)) || `交流群 ${i + 1}`,
        desc,
        icon: (g && g.icon) || '👥',
        qrcode: (g && (g.qrcode || g.qrCode)) || '',
        wecomUrl: (g && (g.wecom_url || g.wecomUrl)) || '',
        tip: (g && g.tip) || '入群后请修改备注为「城市 + 方向」',
        fill,
        full,
        expired,
        hasEntry: hasQr || hasWecom,
        expireTip: expireTip(g),
        qrExpireAt: (g && (g.qrExpireAt || g.qr_expire_at || g.expireAt || g.expire_at)) || '',
      }
    })
  },

  _loadConfig() {
    this.setData({ loading: true, loadError: false })
    SystemService.fetchSystemConfig(true).then((config) => {
      const cfg = (config && (config.joinGroupConfig || config.communityConfig || config.wecomConfig)) || {}
      const owner = cfg.ownerWay || cfg.owner || null
      const groups = this._mapGroups(cfg.groups)
      const faqs = Array.isArray(cfg.faqs) ? cfg.faqs : []
      const avatars = Array.isArray(cfg.avatars) ? cfg.avatars.filter(Boolean) : []
      const memberCount = cfg.memberCount || cfg.member_count || ''
      this.setData({
        loading: false,
        loadError: false,
        heroTitle: cfg.title || '加入读者群',
        desc: cfg.desc || cfg.description || cfg.joinNotice || '有问题可先找在线客服；进群后可收到更新通知。',
        memberCount: memberCount || '',
        avatars,
        wecomUrl: this.data.wecomUrl || cfg.wecomUrl || cfg.wecom_url || '',
        wecomName: this.data.wecomName || cfg.wecomName || cfg.wecom_name || '企微客服',
        wecomQr: cfg.wecomQr || cfg.wecom_qr || cfg.qrcode || '',
        groups,
        faqs,
        ownerWay: owner ? {
          name: owner.name || owner.title || '',
          desc: owner.desc || owner.description || '',
          icon: owner.icon || '✍️',
          qrcode: owner.qrcode || owner.qrCode || '',
          expired: isExpired(owner),
          expireTip: expireTip(owner),
        } : null,
        onlineServiceHint: cfg.onlineServiceHint || cfg.joinNotice || '',
        servicePhone: cfg.servicePhone || '',
      })
    }).catch(() => {
      this.setData({
        loading: false,
        loadError: true,
        heroTitle: '加入读者群',
        desc: '配置加载失败，请稍后重试',
        memberCount: '',
        avatars: [],
        groups: [],
        faqs: [],
        ownerWay: null,
      })
    })
  },

  onService() {
    this.setData({ sheetVisible: false })
    wx.navigateTo({ url: '/pkg-user/service-chat/service-chat' })
  },

  onOpenWecom() {
    const url = this.data.wecomUrl
    const qr = this.data.wecomQr
    if (url) {
      wx.navigateTo({
        url: `/pkg-user/wecom-join/wecom-join?url=${encodeURIComponent(url)}&name=${encodeURIComponent(this.data.wecomName)}`,
      })
      return
    }
    if (qr) {
      this.setData({
        sheetVisible: true,
        sheetExpireTip: '请使用最新二维码添加',
        sheetGroup: {
          name: this.data.wecomName || '企微客服',
          desc: '扫码添加企业微信好友',
          tip: '换设备也不会丢失聊天记录',
          qrcode: qr,
        },
      })
      return
    }
    wx.showActionSheet({
      itemList: ['联系在线客服'],
      success: (res) => {
        if (res.tapIndex === 0) this.onService()
      },
    })
  },

  onCopyWecom() {
    if (!this.data.wecomUrl) {
      wx.showToast({ title: '暂未配置企微链接', icon: 'none' })
      return
    }
    wx.setClipboardData({
      data: this.data.wecomUrl,
      success: () => wx.showToast({ title: '链接已复制', icon: 'success' }),
    })
  },

  onShowOwnerQr() {
    const owner = this.data.ownerWay || {}
    if (owner.expired || !owner.qrcode) {
      wx.showToast({ title: owner.expired ? '二维码已失效，请联系客服' : '暂未配置主理人二维码', icon: 'none' })
      return
    }
    this.setData({
      sheetVisible: true,
      sheetExpireTip: owner.expireTip || '',
      sheetGroup: {
        name: owner.name || '主理人',
        desc: owner.desc || '',
        tip: '验证时请备注手机号后四位',
        qrcode: owner.qrcode,
      },
    })
  },

  onOpenGroup(e) {
    const id = e.currentTarget.dataset.id
    const group = (this.data.groups || []).find((g) => String(g.id) === String(id))
    if (!group || group.full) return
    if (group.expired || !group.hasEntry) {
      wx.showToast({ title: '二维码已失效或未配置，请联系客服', icon: 'none' })
      return
    }
    if (group.wecomUrl && !group.qrcode) {
      wx.navigateTo({
        url: `/pkg-user/wecom-join/wecom-join?url=${encodeURIComponent(group.wecomUrl)}&name=${encodeURIComponent(group.name)}`,
      })
      return
    }
    this.setData({
      sheetVisible: true,
      sheetExpireTip: group.expireTip || '',
      sheetGroup: {
        name: group.name,
        desc: group.desc,
        tip: group.tip || '入群后请修改备注为「城市 + 方向」',
        qrcode: group.qrcode,
      },
    })
  },

  onCloseSheet() {
    this.setData({ sheetVisible: false })
  },

  onSaveQr() {
    const url = this.data.sheetGroup && this.data.sheetGroup.qrcode
    if (!url) {
      wx.showToast({ title: '暂无二维码', icon: 'none' })
      return
    }
    wx.showLoading({ title: '保存中' })
    wx.downloadFile({
      url,
      success: (res) => {
        if (res.statusCode !== 200 || !res.tempFilePath) {
          wx.hideLoading()
          wx.previewImage({ urls: [url], current: url })
          return
        }
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            wx.hideLoading()
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: () => {
            wx.hideLoading()
            wx.previewImage({ urls: [url], current: url })
          },
        })
      },
      fail: () => {
        wx.hideLoading()
        wx.previewImage({ urls: [url], current: url })
      },
    })
  },
})
