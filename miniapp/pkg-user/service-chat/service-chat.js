const { StorageUtil } = require('../../utils/storage')

const HISTORY_KEY = 'service_chat_history'
const MAX_MESSAGES = 80
const WELCOME = {
  id: 1,
  role: 'service',
  text: '你好，这里是出海笔记客服中心。你可以先查看常见问题，也可以直接联系人工客服。',
}

const QUICK_REPLY = {
  '商品咨询': '商品详情页包含规格、交付方式和售后说明。如需确认具体商品信息，请点击下方“联系人工客服”。',
  '订单问题': '你可以在「我的－全部订单」查看订单状态、支付记录和发货通知。',
  '发货进度': '订单发货后会更新状态并发送通知，发货说明会显示在订单详情中。',
  '退款售后': '请先在订单详情查看售后规则。需要人工处理时，点击下方按钮并提供订单号即可。',
}

function loadHistory() {
  const raw = StorageUtil.get(HISTORY_KEY)
  if (!raw || typeof raw !== 'object') return null
  const messages = Array.isArray(raw.messages) ? raw.messages : null
  if (!messages || !messages.length) return null
  return {
    messages: messages.slice(-MAX_MESSAGES),
    nextId: Math.max(2, Number(raw.nextId) || messages.length + 1),
  }
}

function saveHistory(messages, nextId) {
  StorageUtil.set(HISTORY_KEY, {
    messages: (messages || []).slice(-MAX_MESSAGES),
    nextId: nextId || 2,
    updatedAt: Date.now(),
  })
}

Page({
  data: {
    messages: [WELCOME],
    quick: ['商品咨询', '订单问题', '发货进度', '退款售后'],
    scrollInto: 'm1',
    nextId: 2,
  },

  onLoad() {
    this._restore()
  },

  onShow() {
    // 从官方客服会话返回时，保持本页 FAQ 记录
    if (!this._restoredOnce) this._restore()
  },

  _restore() {
    const saved = loadHistory()
    this._restoredOnce = true
    if (!saved) {
      this.setData({ messages: [WELCOME], nextId: 2, scrollInto: 'm1' })
      saveHistory([WELCOME], 2)
      return
    }
    const last = saved.messages[saved.messages.length - 1]
    this.setData({
      messages: saved.messages,
      nextId: saved.nextId,
      scrollInto: last ? ('m' + last.id) : 'm1',
    })
  },

  onQuick(e) {
    const q = e.currentTarget.dataset.q
    if (!q) return
    this._push('me', q)
    setTimeout(() => {
      this._push('service', QUICK_REPLY[q] || '请联系人工客服进一步处理。')
    }, 220)
  },

  onClearHistory() {
    wx.showModal({
      title: '清空记录',
      content: '确定清空本页咨询记录吗？微信官方客服会话不受影响。',
      success: (res) => {
        if (!res.confirm) return
        StorageUtil.remove(HISTORY_KEY)
        this.setData({ messages: [WELCOME], nextId: 2, scrollInto: 'm1' })
        saveHistory([WELCOME], 2)
      },
    })
  },

  _push(role, text) {
    const id = this.data.nextId
    const messages = this.data.messages.concat([{ id, role, text, ts: Date.now() }])
    const nextId = id + 1
    this.setData({ messages, nextId, scrollInto: 'm' + id })
    saveHistory(messages, nextId)
  },
})
