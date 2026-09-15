const SystemService = require('../../services/system')
const { createSharePageConfig } = require('../../utils/share')
const { DEMO_JOIN } = require('../../data/warm-demo')
const { USE_LOCAL_SOURCE, WARM_PAGE_STYLE } = require('../../data/warm-source')

const NAV_TITLE = '加入社群 · 联系我们'

Page({
  ...createSharePageConfig(),
  data: {
    themePageStyle: WARM_PAGE_STYLE,
    // 首屏即用 DEMO，避免空 banner 闪一帧（看起来像「先跳到半成品页再跳完整页」）
    heroTitle: DEMO_JOIN.title,
    desc: DEMO_JOIN.desc,
    memberCount: DEMO_JOIN.memberCount,
    avatars: DEMO_JOIN.avatars,
    groups: DEMO_JOIN.groups,
    faqs: DEMO_JOIN.faqs,
    ownerWay: DEMO_JOIN.ownerWay,
    wecomUrl: '',
    wecomName: '企微客服',
    wecomQr: '',
    sheetVisible: false,
    sheetGroup: {},
    placeholderQr: 'https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=https%3A%2F%2Fnuange.example%2Fgroup&margin=0',
    onlineServiceHint: DEMO_JOIN.desc,
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
    if (USE_LOCAL_SOURCE) return
    this._loadConfig()
  },

  onShow() {
    wx.setNavigationBarTitle({ title: NAV_TITLE })
  },

  _mapGroups(groups) {
    const list = Array.isArray(groups) ? groups : []
    return list.map((g, i) => {
      const fill = Number((g && g.fill) != null ? g.fill : Math.min(100, 40 + i * 25))
      const full = !!(g && (g.full || fill >= 100))
      const members = (g && (g.members || g.memberCount)) || Math.round((fill / 100) * 200)
      return {
        id: String((g && g.id) || i),
        name: (g && (g.name || g.title)) || `交流群 ${i + 1}`,
        desc: (g && (g.desc || g.description)) || (full ? `${members} / 200 人 · 已满` : `${members} / 200 人`),
        icon: (g && g.icon) || ['💡', '📖', '🛍'][i % 3],
        qrcode: (g && (g.qrcode || g.qrCode)) || '',
        wecomUrl: (g && (g.wecom_url || g.wecomUrl)) || '',
        tip: (g && g.tip) || '入群后请修改备注为「城市 + 方向」',
        fill: Math.max(0, Math.min(100, fill)),
        full,
      }
    })
  },

  _loadConfig() {
    SystemService.fetchSystemConfig(true).then((config) => {
      const cfg = (config && (config.joinGroupConfig || config.communityConfig || config.wecomConfig)) || {}
      const owner = cfg.ownerWay || cfg.owner || null
      const groups = this._mapGroups(cfg.groups)
      const faqs = Array.isArray(cfg.faqs) ? cfg.faqs : []
      this.setData({
        heroTitle: cfg.title || DEMO_JOIN.title,
        desc: cfg.desc || cfg.description || DEMO_JOIN.desc,
        memberCount: cfg.memberCount || cfg.member_count || DEMO_JOIN.memberCount,
        avatars: Array.isArray(cfg.avatars) && cfg.avatars.length ? cfg.avatars : DEMO_JOIN.avatars,
        wecomUrl: this.data.wecomUrl || cfg.wecomUrl || cfg.wecom_url || '',
        wecomName: this.data.wecomName || cfg.wecomName || cfg.wecom_name || '企微客服',
        wecomQr: cfg.wecomQr || cfg.wecom_qr || cfg.qrcode || '',
        groups: groups.length ? groups : DEMO_JOIN.groups,
        faqs: faqs.length ? faqs : DEMO_JOIN.faqs,
        ownerWay: owner ? {
          name: owner.name || owner.title || '',
          desc: owner.desc || owner.description || '',
          icon: owner.icon || '✍️',
          qrcode: owner.qrcode || owner.qrCode || '',
        } : DEMO_JOIN.ownerWay,
        onlineServiceHint: cfg.onlineServiceHint || cfg.joinNotice || DEMO_JOIN.desc,
        servicePhone: cfg.servicePhone || '',
      })
    }).catch(() => {
      this.setData({
        heroTitle: DEMO_JOIN.title,
        desc: DEMO_JOIN.desc,
        memberCount: DEMO_JOIN.memberCount,
        avatars: DEMO_JOIN.avatars,
        groups: DEMO_JOIN.groups,
        faqs: DEMO_JOIN.faqs,
        ownerWay: DEMO_JOIN.ownerWay,
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
      itemList: ['复制演示链接', '联系在线客服'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: 'https://work.weixin.qq.com/kfid/demo',
            success: () => wx.showToast({ title: '演示链接已复制', icon: 'none' }),
          })
        } else if (res.tapIndex === 1) {
          this.onService()
        }
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
    this.setData({
      sheetVisible: true,
      sheetGroup: {
        name: owner.name || '主理人',
        desc: owner.desc || '',
        tip: '验证时请备注手机号后四位',
        qrcode: owner.qrcode || this.data.placeholderQr,
      },
    })
  },

  onOpenGroup(e) {
    const id = e.currentTarget.dataset.id
    const group = (this.data.groups || []).find((g) => String(g.id) === String(id))
    if (!group || group.full) return
    if (group.wecomUrl && !group.qrcode) {
      wx.navigateTo({
        url: `/pkg-user/wecom-join/wecom-join?url=${encodeURIComponent(group.wecomUrl)}&name=${encodeURIComponent(group.name)}`,
      })
      return
    }
    this.setData({
      sheetVisible: true,
      sheetGroup: {
        name: group.name,
        desc: group.desc,
        tip: group.tip || '入群后请修改备注为「城市 + 方向」',
        qrcode: group.qrcode || this.data.placeholderQr,
      },
    })
  },

  onCloseSheet() {
    this.setData({ sheetVisible: false })
  },

  onSaveQr() {
    const url = (this.data.sheetGroup && this.data.sheetGroup.qrcode) || this.data.placeholderQr
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
