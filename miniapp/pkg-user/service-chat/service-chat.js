const orderService = require('../../services/order')
const SystemService = require('../../services/system')
const supportService = require('../../services/support')
const imService = require('../../services/im')
const { StorageUtil } = require('../../utils/storage')
const { post, upload } = require('../../utils/request')
const { AuthUtil } = require('../../utils/auth')
const { isPersistedMediaUrl, DEFAULT_AVATAR, DEFAULT_PRODUCT } = require('../../utils/image-fallback')
const { resolveMediaUrl } = require('../../utils/media-url')

const HISTORY_KEY_PREFIX = 'service_chat_history_v2'

function historyStorageKey() {
  try {
    const info = AuthUtil.getUserInfo() || {}
    const id = info.id || info.userId
    if (id != null && id !== '') return `${HISTORY_KEY_PREFIX}_${id}`
  } catch (e) { /* ignore */ }
  return `${HISTORY_KEY_PREFIX}_guest`
}
const MAX_MESSAGES = 80
const BOT_AVATAR = DEFAULT_AVATAR
const ME_AVATAR = DEFAULT_AVATAR
const ORDER_COVER = DEFAULT_PRODUCT

const DEMO_ORDER = {
  title: '内容生意手册（EPUB / PDF）',
  orderNo: 'NG202609130847',
  cover: ORDER_COVER,
  priceLabel: '¥39 已支付',
  orderId: '',
}

const WELCOME = {
  id: 1,
  role: 'service',
  type: 'text',
  text: '你好呀 👋 我是暖阁小助手。购买、发票、资料解锁的问题都可以直接问我。',
}

const QUICK = ['电子书打不开', '申请发票', '资料库没解锁', '怎么进读者群', '会员有效期']

const QUICK_FLOWS = {
  '电子书打不开': [
    { delay: 400, role: 'service', type: 'text', text: '收到，我先帮你排查常见原因（网络、格式、阅读权限）。' },
    {
      delay: 900,
      role: 'service',
      type: 'ordcard',
      hideAvatar: true,
    },
    {
      delay: 1400,
      role: 'service',
      type: 'text',
      hideAvatar: true,
      text: '若刚付款看不到内容，可先退出重进「我的 - 已购内容」。仍打不开请发订单号或截图，我会转人工核对（系统不会自动补发）。',
    },
  ],
  '申请发票': [
    {
      delay: 500,
      role: 'service',
      type: 'text',
      text: '可以的。请把订单号、发票抬头、税号发我，或点「＋」发送订单卡片，我帮你登记开票（电子普票，开票时效以财务处理为准）。',
    },
  ],
  '资料库没解锁': [
    {
      delay: 500,
      role: 'service',
      type: 'text',
      text: '资料库需星球会员或对应商品权益。可先到「我的 - 已购内容 / 会员中心」确认有效期；仍看不到的话，把截图发我，我帮你核对权限。',
    },
    {
      delay: 1100,
      role: 'service',
      type: 'actcard',
      act: {
        title: '需要进一步协助？',
        desc: '解锁异常可转人工客服，或先加入读者群由客服协助处理。',
        primary: '立即进群',
        secondary: '转人工',
      },
    },
  ],
  '怎么进读者群': [
    {
      delay: 400,
      role: 'service',
      type: 'actcard',
      act: {
        title: '邀请你进读者群',
        desc: '新书首发、资料更新、线下活动等通知可在读者群获取。点下方进群或加企微客服。',
        primary: '立即进群',
        secondary: '加企微客服',
      },
    },
  ],
  '会员有效期': [
    {
      delay: 500,
      role: 'service',
      type: 'text',
      text: '会员有效期可在「会员中心」查看。到期前会提醒续费。邀请奖励以活动页实际规则为准。如对账期有疑问，把订单号发我。',
    },
  ],
}

function loadHistory() {
  const raw = StorageUtil.get(historyStorageKey())
  if (!raw || typeof raw !== 'object') return null
  const messages = Array.isArray(raw.messages) ? raw.messages : null
  if (!messages || !messages.length) return null
  // 历史里的临时本地图不可恢复，过滤掉以免裂图
  const cleaned = messages
    .map((m) => {
      if (!m || m.type !== 'imgmsg') return m
      const url = m.imageUrl || m.url || ''
      if (isPersistedMediaUrl(url)) return m
      return null
    })
    .filter(Boolean)
  if (!cleaned.length) return null
  return {
    messages: cleaned.slice(-MAX_MESSAGES),
    nextId: Math.max(2, Number(raw.nextId) || cleaned.length + 1),
    sessionId: raw.sessionId || '',
    showQuick: raw.showQuick !== false,
  }
}

function saveHistory(messages, nextId, sessionId, showQuick) {
  const list = (Array.isArray(messages) ? messages : [])
    .map((m) => {
      if (!m || m.type !== 'imgmsg') return m
      const url = m.imageUrl || m.url || ''
      if (isPersistedMediaUrl(url)) return m
      return null
    })
    .filter(Boolean)
    .slice(-MAX_MESSAGES)
  StorageUtil.set(historyStorageKey(), {
    messages: list,
    nextId: nextId || list.length + 1,
    sessionId: sessionId || '',
    showQuick: showQuick !== false,
    updatedAt: Date.now(),
  })
}

Page({
  data: {
    messages: [WELCOME],
    quick: QUICK,
    showQuick: true,
    scrollInto: 'm1',
    nextId: 2,
    inputText: '',
    sending: false,
    typing: false,
    showEmoji: false,
    emojis: ['😊', '👍', '🙏', '🎉', '😅', '❤️', '👌', '😭'],
    sessionId: '',
    orderId: '',
    ticketId: '',
    // 真实 IM 消息（客服侧发的卡片/文本）与 AI 兜底消息分开渲染
    imMessages: [],
    imAgentTyping: false,
    imReady: false,
    deliveryCard: null,
    botAvatar: BOT_AVATAR,
    meAvatar: ME_AVATAR,
  },

  onLoad(q) {
    this._orderId = (q && q.orderId) || ''
    this._customerCorpId = ''
    this._customerServiceUrl = ''
    this._ticketCreated = false
    this._ticketCreating = false
    this.setData({ orderId: this._orderId })
    this._restore()
    if (this._orderId) this._injectOrderDelivery(this._orderId)
    this._prefetchRecentOrder()
    this._loadCustomerServiceConfig()
    // 真实 IM 通道：已登录才开（未登录只有 AI 兜底）
    this._bootIm({ source: 'chat', sourceRef: this._orderId ? String(this._orderId) : '' })
  },

  _loadCustomerServiceConfig() {
    SystemService.fetchSystemConfig(false)
      .then((config) => {
        const join = (config && (config.joinGroupConfig || config.communityConfig || config.community_config)) || {}
        const brand = (config && config.miniappBrandConfig) || {}
        this._customerCorpId = String(
          join.customerServiceCorpId || join.customer_service_corp_id || brand.customerServiceCorpId || '',
        ).trim()
        this._customerServiceUrl = String(
          join.customerServiceUrl || join.customer_service_url || brand.customerServiceUrl || '',
        ).trim()
      })
      .catch(() => {})
  },

  _prefetchRecentOrder() {
    if (!AuthUtil.isLoggedIn || !AuthUtil.isLoggedIn()) return
    orderService.getOrderList({ current: 1, size: 1 })
      .then((page) => {
        const o = ((page && (page.records || page.list || page.items)) || [])[0]
        if (!o) return
        const goods = (o.items && o.items[0]) || {}
        this._recentOrderCard = {
          title: goods.productName || goods.name || o.productName || '订单商品',
          orderNo: o.orderNo || o.order_no || String(o.id || ''),
          cover: goods.productImage || goods.image || ORDER_COVER,
          priceLabel: `¥${o.payAmount != null ? o.payAmount : (o.amount || o.totalAmount || '--')} ${o.statusText || o.status || ''}`.trim(),
          orderId: o.id || '',
        }
      })
      .catch(() => {})
  },

  _orderCardForQuick() {
    if (this._recentOrderCard && this._recentOrderCard.orderNo) return this._recentOrderCard
    if (this.data.orderId) {
      return {
        title: '当前订单',
        orderNo: String(this.data.orderId),
        cover: ORDER_COVER,
        priceLabel: '请核对订单详情',
        orderId: this.data.orderId,
      }
    }
    return null
  },

  onJoin() {
    wx.navigateTo({ url: '/pkg-content/join/join' })
  },

  onShow() {
    if (!this._restoredOnce) this._restore()
    // 回到前台：立刻补拉一次再开轮询（切后台期间的消息不能漏）
    if (this.data.imReady) {
      imService.pullMessages().then((d) => this._applyIm(d, true)).catch(() => {})
      imService.startPolling((rows, typing) => this._applyIm({ messages: rows, agentTyping: typing }, false))
    }
  },

  onHide() {
    // 切后台停轮询：后台定时器会被系统节流到分钟级，反而浪费请求
    imService.stopPolling()
  },

  onUnload() {
    imService.stopPolling()
  },

  // ---------- 真实 IM（人工客服通道）----------
  _bootIm(options) {
    const opts = options || {}
    if (!AuthUtil.isLoggedIn()) {
      // 未登录：AI 兜底照常工作，只是没有人工客服通道
      this.setData({ imReady: false })
      return
    }
    imService
      .openConversation({ source: opts.source || 'chat', sourceRef: opts.sourceRef || '' })
      .then((d) => {
        const rows = (d && d.messages) || []
        this.setData({ imReady: true, imMessages: rows, imAgentTyping: false })
        imService.startPolling((incoming, typing) =>
          this._applyIm({ messages: incoming, agentTyping: typing }, false),
        )
      })
      .catch(() => {
        // IM 不可用不影响 AI 兜底对话
        this.setData({ imReady: false })
      })
  },

  _applyIm(payload, immediate) {
    const rows = (payload && payload.messages) || []
    const typing = !!(payload && payload.agentTyping)
    const patch = { imAgentTyping: typing }
    if (rows.length) {
      const known = {}
      this.data.imMessages.forEach((m) => {
        known[m.id] = true
      })
      const fresh = rows.filter((m) => !known[m.id])
      if (fresh.length) {
        patch.imMessages = this.data.imMessages.concat(fresh)
      }
    }
    this.setData(patch)
    if (immediate || rows.length) this._scrollImToBottom()
  },

  _scrollImToBottom() {
    setTimeout(() => this.setData({ scrollInto: 'mbot' }), 60)
  },

  onOpenLink(e) {
    const link = String((e.currentTarget.dataset && e.currentTarget.dataset.link) || '').trim()
    if (!link) {
      wx.showToast({ title: '该卡片未配置跳转', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: link,
      fail: () => wx.showToast({ title: '页面暂不可用', icon: 'none' }),
    })
  },

  onCopyTracking(e) {
    const no = String((e.currentTarget.dataset && e.currentTarget.dataset.no) || '').trim()
    if (!no) return
    wx.setClipboardData({
      data: no,
      success: () => wx.showToast({ title: '运单号已复制', icon: 'none' }),
    })
  },

  onPreviewImage(e) {
    const url = String((e.currentTarget.dataset && e.currentTarget.dataset.url) || '').trim()
    if (!url) return
    wx.previewImage({ urls: [url], current: url })
  },

  /** 商品卡「咨询同款」：直接跳该商品详情页，让买家问得更具体。 */
  onAskSame(e) {
    const pid = String((e.currentTarget.dataset && e.currentTarget.dataset.pid) || '').trim()
    if (!pid) return
    wx.navigateTo({
      url: `/pkg-content/product-detail/product-detail?id=${pid}`,
      fail: () => wx.showToast({ title: '商品页暂不可用', icon: 'none' }),
    })
  },

  /** 物流卡 → 订单详情：买家最想看的就是订单进度。 */
  onOpenOrder(e) {
    const oid = String((e.currentTarget.dataset && e.currentTarget.dataset.oid) || '').trim()
    if (!oid) return
    wx.navigateTo({
      url: `/pkg-trade/order-detail/order-detail?id=${oid}`,
      fail: () => wx.showToast({ title: '订单页暂不可用', icon: 'none' }),
    })
  },

  _restore() {
    const saved = loadHistory()
    this._restoredOnce = true
    if (!saved) {
      this.setData({ messages: [WELCOME], nextId: 2, scrollInto: 'm1', sessionId: '', showQuick: true })
      saveHistory([WELCOME], 2, '', true)
      return
    }
    const last = saved.messages[saved.messages.length - 1]
    this.setData({
      messages: saved.messages,
      nextId: saved.nextId,
      sessionId: saved.sessionId || '',
      showQuick: saved.showQuick !== false && saved.messages.length <= 2,
      scrollInto: last ? ('m' + last.id) : 'm1',
    })
  },

  async _injectOrderDelivery(orderId) {
    try {
      const order = await orderService.getOrderDetail(orderId)
      const items = order.items || order.orderItems || []
      const name = (items[0] && (items[0].productName || items[0].name))
        || order.productName
        || '你购买的商品'
      const content = String(order.virtualDeliveryContent || order.virtual_delivery_content || '').trim()
      // 履约方式：manual = 人工开通，文案不能说「已自动发货」
      const deliveryMode = String(order.deliveryMode || order.delivery_mode || '').trim()
      const isManualGuide = deliveryMode === 'manual'
      this.setData({ deliveryCard: { name, content, orderId, isManualGuide } })
      const marker = 'orderDelivered:' + orderId
      if ((this.data.messages || []).some((m) => m.marker === marker)) return
      let text
      if (isManualGuide) {
        text = content
          ? ('「' + name + '」已支付成功，开通指引见上方。稍后客服会单独联系你完成开通，有问题可以直接问我。')
          : ('「' + name + '」已支付成功。我们正在为你安排开通，稍后客服会联系你；急需使用可直接在下方留言。')
      } else {
        text = content
          ? ('已为你自动发货「' + name + '」。发货内容已固定在上方，可直接复制。有问题在下方继续问我。')
          : ('「' + name + '」已支付成功。如需查询发货或使用说明，直接在下方回复即可。')
      }
      this._push({ role: 'service', type: 'text', text, marker })
    } catch (_) { /* ignore */ }
  },

  onCopyDelivery() {
    const content = this.data.deliveryCard && this.data.deliveryCard.content
    if (!content) return
    wx.setClipboardData({
      data: content,
      success: () => wx.showToast({ title: '已复制发货内容', icon: 'none' }),
    })
  },

  onInput(e) {
    this.setData({ inputText: (e.detail && e.detail.value) || '' })
  },

  onToggleEmoji() {
    this.setData({ showEmoji: !this.data.showEmoji })
  },

  onPickEmoji(e) {
    const emoji = e.currentTarget.dataset.e
    if (!emoji) return
    this.setData({
      inputText: (this.data.inputText || '') + emoji,
      showEmoji: false,
    })
  },

  onTransferHuman() {
    const corpId = this._customerCorpId || ''
    const csUrl = this._customerServiceUrl || ''
    // 用户主动转人工 = 最明确的咨询意图，先落库再跳企微，
    // 否则企微对话与后台工单两套数据对不上，运营只能看到一半
    this._createTicket('用户在小程序内点击「转人工」')
    if (typeof wx.openCustomerServiceChat === 'function' && corpId) {
      wx.openCustomerServiceChat({
        extInfo: { url: csUrl },
        corpId,
        success: () => {},
        fail: () => {
          wx.showModal({
            title: '人工客服',
            content: '在线客服暂时不可用。已为你登记咨询，客服会在工作时间内回复；也可在工作日 9:00–18:00 添加企业微信「暖阁小助手」。',
            showCancel: false,
          })
        },
      })
      return
    }
    const missingHint = corpId
      ? ''
      : '后台尚未配置企业微信 corpId（可在客服中心配置 customerServiceCorpId）。'
    wx.showModal({
      title: '人工客服',
      content: `${missingHint}已为你登记咨询，客服会在工作时间内回复；也可在工作日 9:00–18:00 添加企业微信「暖阁小助手」。`.trim(),
      showCancel: false,
    })
  },

  onQuick(e) {
    const q = e.currentTarget.dataset.q
    if (!q) return
    this.setData({ showQuick: false })
    this._push({ role: 'me', type: 'text', text: q })
    const flow = QUICK_FLOWS[q]
    if (flow) {
      this._runFlow(flow)
      return
    }
    this._ask(q)
  },

  onSend() {
    const q = (this.data.inputText || '').trim()
    if (!q || this.data.sending) return
    this.setData({ inputText: '', showQuick: false, showEmoji: false })
    this._ask(q)
    // 同步发到真实 IM：AI 答得再好，人工客服也要能看到买家诉求
    if (this.data.imReady) {
      imService
        .sendText(q)
        .then(() => imService.pullMessages().then((d) => this._applyIm(d, true)))
        .catch(() => {})
    }
  },

  _runFlow(steps) {
    this.setData({ typing: true })
    steps.forEach((step) => {
      setTimeout(() => {
        const { delay, ...msg } = step
        if (msg.type === 'ordcard') {
          msg.order = this._orderCardForQuick()
          if (!msg.order) {
            this._push({
              role: 'service',
              type: 'text',
              hideAvatar: !!msg.hideAvatar,
              text: '未找到你的近期订单。可点「＋」发送订单卡片，或把订单号发我核对。',
            })
            if (step === steps[steps.length - 1]) this.setData({ typing: false })
            return
          }
        }
        this._push(msg)
        if (step === steps[steps.length - 1]) {
          this.setData({ typing: false })
        }
      }, step.delay || 400)
    })
  },

  async _ask(question) {
    this._push({ role: 'me', type: 'text', text: question })
    this.setData({ sending: true, typing: true })
    try {
      if (!AuthUtil.isLoggedIn()) {
        throw new Error('need_login')
      }
      const res = await post('/api/v1/mp/ai/chat', {
        question,
        sessionId: this.data.sessionId || undefined,
        orderId: this.data.orderId || undefined,
      }, { showError: false })
      const answer = (res && res.answer) || ''
      const sessionId = (res && res.sessionId) || this.data.sessionId
      if (sessionId) this.setData({ sessionId })
      let text = answer || '已收到，如需进一步帮助可联系人工客服。'
      if (res && res.action && res.action.type) {
        text += res.action.confirmRequired
          ? '\n\n（该操作需你自行确认，系统不会自动执行）'
          : ''
      }
      this._push({ role: 'service', type: 'text', text }, sessionId)
      this.setData({ sending: false, typing: false })
      // AI 明确判定要转人工，或压根没答上来，才落库建工单 ——
      // 后端 AiChatVO 已有 isTransferHuman 字段，不要靠匹配答案文案猜
      this._maybeCreateTicket(question, answer, res)
    } catch (e) {
      const flow = QUICK_FLOWS[question]
      if (flow) {
        this.setData({ sending: false })
        this._runFlow(flow)
        return
      }
      this._push({
        role: 'service',
        type: 'text',
        text: '暂时无法连接智能客服。你可以点下方「转人工」，或先试试上方常见问题。',
      })
      this.setData({ sending: false, typing: false })
      // AI 接口整体不可用 = 用户完全没被服务到，这是最该建单的情况
      this._createTicket(question)
    }
  },

  /**
   * 判定是否需要建工单。
   * 判据（按优先级）：① 后端 isTransferHuman=true 明确要求转人工；
   *   ② 答案为空 —— AI 没产出任何内容。
   * ⚠️ 不要用「答案里包含『无法连接』等字样」这类文案匹配：
   *   AI 正常回答里也可能出现「未找到」这种词，会把正常问答误判成需转人工。
   */
  _maybeCreateTicket(question, answer, res) {
    if (this._ticketCreated) return
    const q = String(question || '').trim()
    if (!q || !AuthUtil.isLoggedIn()) return
    const transferFlag = !!(res && (res.isTransferHuman === true || res.is_transfer_human === true))
    const blank = !String(answer || '').trim()
    if (!transferFlag && !blank) return
    this._createTicket(q)
  },

  _createTicket(content) {
    if (this._ticketCreating) return
    this._ticketCreating = true
    supportService
      .createTicket(content, { source: 'chat', orderId: this._orderId || this.data.orderId || '' })
      .then((res) => {
        this._ticketCreated = true
        if (res && res.ticketId) this.setData({ ticketId: res.ticketId })
        this._push({
          role: 'service',
          type: 'text',
          text: '已为你转接人工，客服会在工作时间内回复，也可在「我的 - 通知」里看到进度。',
        })
      })
      .catch(() => {
        // 建单失败不打扰用户：AI 已经答过了，静默降级
      })
      .finally(() => {
        this._ticketCreating = false
      })
  },

  onPickOrder() {
    this.setData({ showQuick: false, showEmoji: false })
    if (!AuthUtil.requireLoginForAction('发送订单')) return
    orderService.getOrderList({ current: 1, size: 5 })
      .then((page) => {
        const records = (page && (page.records || page.list || page.items)) || []
        if (!records.length) {
          wx.showToast({ title: '暂无订单可发送', icon: 'none' })
          return
        }
        const labels = records.map((o) => {
          const name = (o.items && o.items[0] && (o.items[0].productName || o.items[0].name))
            || o.productName || o.name || '订单'
          const no = o.orderNo || o.order_no || o.id || ''
          return `${name} · ${no}`.slice(0, 36)
        })
        wx.showActionSheet({
          itemList: labels,
          success: (res) => {
            const o = records[res.tapIndex]
            if (!o) return
            const goods = (o.items && o.items[0]) || {}
            const card = {
              title: goods.productName || goods.name || o.productName || '订单商品',
              orderNo: o.orderNo || o.order_no || String(o.id || ''),
              cover: goods.productImage || goods.image || ORDER_COVER,
              priceLabel: `¥${o.payAmount != null ? o.payAmount : (o.amount || o.totalAmount || '--')} ${o.statusText || o.status || ''}`.trim(),
              orderId: o.id || '',
            }
            this.setData({ orderId: o.id || this.data.orderId })
            this._push({ role: 'me', type: 'ordcard', order: card })
            setTimeout(() => {
              this._push({
                role: 'service',
                type: 'text',
                text: '收到订单卡片了。请问是要查询发货、申请发票，还是其他问题？',
              })
            }, 500)
          },
        })
      })
      .catch(() => {
        wx.showToast({ title: '暂无订单可发送', icon: 'none' })
      })
  },

  onPickImage() {
    this.setData({ showEmoji: false })
    if (!AuthUtil.requireLoginForAction('发送图片')) return
    const choose = wx.chooseMedia
      ? () => new Promise((resolve, reject) => {
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          success: resolve,
          fail: reject,
        })
      })
      : () => new Promise((resolve, reject) => {
        wx.chooseImage({
          count: 1,
          success: (res) => resolve({ tempFiles: [{ tempFilePath: res.tempFilePaths[0] }] }),
          fail: reject,
        })
      })
    choose()
      .then((res) => {
        const path = res.tempFiles && res.tempFiles[0] && res.tempFiles[0].tempFilePath
        if (!path) return
        this.setData({ showQuick: false })
        wx.showLoading({ title: '发送中', mask: true })
        return upload(path, { name: 'file', url: '/api/v1/mp/upload' })
          .then((uploaded) => {
            const raw = (uploaded && (uploaded.url || uploaded.fileUrl)) || ''
            const url = resolveMediaUrl(raw) || raw
            if (!url || !isPersistedMediaUrl(url)) {
              throw new Error('图片上传失败')
            }
            wx.hideLoading()
            this._push({ role: 'me', type: 'imgmsg', imageUrl: url })
            setTimeout(() => {
              this._push({
                role: 'service',
                type: 'text',
                text: '图片已收到，我这边看一下。如需更快处理，也可点下方「转人工」。',
              })
            }, 500)
          })
          .catch((err) => {
            wx.hideLoading()
            wx.showToast({
              title: String((err && err.message) || '图片发送失败').slice(0, 20),
              icon: 'none',
            })
          })
      })
      .catch((err) => {
        const msg = String((err && (err.errMsg || err.message)) || '')
        if (/cancel/i.test(msg)) return
        wx.showToast({ title: '选图失败', icon: 'none' })
      })
  },

  onPreviewImg(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.previewImage({ current: url, urls: [url] })
  },

  onViewOrder(e) {
    const id = e.currentTarget.dataset.id || this.data.orderId
    if (id) {
      wx.navigateTo({ url: '/pkg-trade/order-detail/order-detail?id=' + id })
      return
    }
    wx.showToast({ title: '可在「我的-订单」查看', icon: 'none' })
  },

  _push(msg, sessionId) {
    const id = this.data.nextId
    const row = Object.assign({ id, ts: Date.now(), type: 'text' }, msg)
    const messages = this.data.messages.concat([row])
    const nextId = id + 1
    const sid = sessionId != null ? sessionId : this.data.sessionId
    this.setData({
      messages,
      nextId,
      scrollInto: 'm' + id,
      sessionId: sid,
      showQuick: false,
    })
    saveHistory(messages, nextId, sid, false)
  },
})
