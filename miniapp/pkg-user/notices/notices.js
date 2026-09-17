const noticeService = require('../../services/notice')
const { AuthUtil } = require('../../utils/auth')

const SCENE_LABEL = {
  order_created: '订单',
  order_paid: '支付',
  order_delivered: '发货',
  order_shipped: '物流',
  planet_reply: '星球',
  member_expire: '会员',
}

function formatTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.replace('T', ' ').slice(0, 16)
}

Page({
  data: { list: [], loading: true },

  onShow() {
    if (!AuthUtil.isLoggedIn()) {
      this.setData({ list: [], loading: false })
      wx.showToast({ title: '请先登录查看通知', icon: 'none' })
      return
    }
    this._load()
  },

  async _load() {
    this.setData({ loading: true })
    try {
      const rows = await noticeService.listNotices()
      const list = (Array.isArray(rows) ? rows : []).map((item) => ({
        ...item,
        isRead: item.isRead === 1 || item.isRead === true,
        timeText: formatTime(item.createdAt),
        sceneLabel: SCENE_LABEL[item.scene] || '通知',
      }))
      this.setData({ list, loading: false })
    } catch (_) {
      this.setData({ list: [], loading: false })
    }
  },

  async onOpen(e) {
    const id = e.currentTarget.dataset.id
    const link = String(e.currentTarget.dataset.link || '').trim()
    try { await noticeService.markRead(id) } catch (_) {}
    if (link) {
      wx.navigateTo({ url: link.startsWith('/') ? link : '/' + link })
      return
    }
    this._load()
  },

  async onReadAll() {
    try { await noticeService.markAllRead() } catch (_) {}
    this._load()
  },
})
