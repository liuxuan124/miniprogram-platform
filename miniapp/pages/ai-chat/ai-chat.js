// pages/ai-chat/ai-chat.js — AI 对话页面
// 功能：AI对话（输入问题→获取推荐）、推荐项展示与跳转、对话历史、转人工提示

const { AiService } = require('../../services/ai')

// 消息类型常量
const MSG_TYPE = {
  USER: 'user',
  AI: 'ai',
  SYSTEM: 'system',
}

// 推荐项类型与跳转路径映射
const ITEM_TYPE_ROUTE = {
  product: '/pages/detail/detail',
  content: '/pages/detail/detail',
  activity: '/pages/detail/detail',
}

Page({
  data: {
    messages: [],           // 消息列表 [{ id, type, content, items, time }]
    inputValue: '',         // 输入框内容
    isSending: false,       // 是否正在发送
    sessionId: '',          // 当前会话 ID
    scrollToView: '',       // 滚动到指定消息
    showTransferModal: false, // 转人工弹窗
    inputFocus: false,      // 输入框焦点
    keyboardHeight: 0,      // 键盘高度
  },

  /** 页面加载 */
  onLoad(options) {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }
    // 恢复会话 ID
    const sessionId = AiService.getSessionId()
    if (sessionId) {
      this.setData({ sessionId })
    }

    // 尝试恢复本地历史
    const localHistory = AiService.getLocalHistory()
    if (localHistory.length > 0) {
      this.setData({ messages: localHistory })
      this._scrollToBottom()
    } else {
      // 欢迎语
      this._addSystemMessage('你好！我是 AI 智能助手，可以帮你推荐商品、内容和活动，有什么想了解的吗？')
    }
  },

  /** 页面卸载时保存历史 */
  onUnload() {
    AiService.saveLocalHistory(this.data.messages)
  },

  /** 输入框内容变化 */
  onInputChange(e) {
    this.setData({ inputValue: e.detail.value })
  },

  /** 输入框聚焦 */
  onInputFocus(e) {
    this.setData({
      inputFocus: true,
      keyboardHeight: e.detail.height || 0,
    })
    this._scrollToBottom()
  },

  /** 输入框失焦 */
  onInputBlur() {
    this.setData({
      inputFocus: false,
      keyboardHeight: 0,
    })
  },

  /** 发送消息 */
  onSend() {
    const question = this.data.inputValue.trim()
    if (!question || this.data.isSending) return

    // 添加用户消息
    this._addUserMessage(question)

    // 清空输入框
    this.setData({ inputValue: '' })

    // 发送到后端
    this._sendChat(question)
  },

  /** 点击推荐项 */
  onRecommendationTap(e) {
    const { type, id, title, reason } = e.currentTarget.dataset

    // 记录推荐点击
    AiService.logRecommendationClick({
      item_type: type,
      item_id: id,
      reason: reason,
    })

    // 跳转到详情页
    const route = ITEM_TYPE_ROUTE[type]
    if (route) {
      wx.navigateTo({
        url: `${route}?type=${type}&id=${id}`,
      })
    }
  },

  /** 点击转人工 */
  onTransferHuman() {
    this.setData({ showTransferModal: true })
  },

  /** 关闭转人工弹窗 */
  onCloseTransferModal() {
    this.setData({ showTransferModal: false })
  },

  /** 确认联系客服 */
  onConfirmTransfer() {
    this.setData({ showTransferModal: false })
    // 添加系统提示
    this._addSystemMessage('已为您转接人工客服，请稍候...')

    // 尝试打开客服会话
    // 注意：需要在小程序后台配置客服功能
    // 如果无法打开客服，则提示用户
  },

  /** 新建对话 */
  onNewChat() {
    wx.showModal({
      title: '新建对话',
      content: '确定要开始新的对话吗？当前对话记录将被清除。',
      success: (res) => {
        if (res.confirm) {
          AiService.clearSession()
          AiService.clearLocalHistory()
          this.setData({
            messages: [],
            sessionId: '',
          })
          this._addSystemMessage('你好！我是 AI 智能助手，可以帮你推荐商品、内容和活动，有什么想了解的吗？')
        }
      },
    })
  },

  /** 查看对话历史 */
  onViewHistory() {
    // 跳转到对话历史页面（复用当前页面，从后端加载历史）
    this._loadHistory()
  },

  // ========== 内部方法 ==========

  /**
   * 发送对话请求
   * @param {string} question 用户问题
   */
  async _sendChat(question) {
    this.setData({ isSending: true })

    // 添加 AI 加载占位消息
    const loadingMsgId = this._addAiLoadingMessage()

    try {
      const res = await AiService.chat(question, this.data.sessionId)

      // 更新会话 ID
      if (res.session_id) {
        this.setData({ sessionId: res.session_id })
      }

      // 移除加载占位消息，添加 AI 回复
      this._removeMessage(loadingMsgId)
      this._addAiMessage(res.answer || '抱歉，我暂时无法回答这个问题。', res.recommended_items || [])

      // 检查是否需要转人工
      if (res.is_transfer_human) {
        setTimeout(() => {
          this._addSystemMessage('根据您的需求，建议转接人工客服获取更专业的帮助。')
        }, 500)
      }
    } catch (err) {
      console.error('[AiChat] 对话请求失败:', err)
      this._removeMessage(loadingMsgId)
      this._addSystemMessage('网络异常，请稍后重试')
    } finally {
      this.setData({ isSending: false })
    }
  },

  /**
   * 从后端加载对话历史
   */
  async _loadHistory() {
    try {
      const res = await AiService.getHistory({ page: 1, page_size: 50 })
      if (res.list.length > 0) {
        const historyMessages = []
        res.list.forEach((item) => {
          // 用户消息
          historyMessages.push({
            id: this._genId(),
            type: MSG_TYPE.USER,
            content: item.question || item.content,
            items: [],
            time: item.created_at || '',
          })
          // AI 回复
          historyMessages.push({
            id: this._genId(),
            type: MSG_TYPE.AI,
            content: item.answer || '',
            items: item.recommended_items || [],
            time: item.created_at || '',
          })
        })
        this.setData({ messages: historyMessages })
        this._scrollToBottom()
      } else {
        wx.showToast({ title: '暂无历史记录', icon: 'none' })
      }
    } catch (err) {
      console.error('[AiChat] 加载历史失败:', err)
      wx.showToast({ title: '加载历史失败', icon: 'none' })
    }
  },

  /**
   * 添加用户消息
   * @param {string} content 消息内容
   */
  _addUserMessage(content) {
    const msg = {
      id: this._genId(),
      type: MSG_TYPE.USER,
      content,
      items: [],
      time: this._formatTime(new Date()),
    }
    const messages = this.data.messages.concat([msg])
    this.setData({ messages })
    this._scrollToBottom()
  },

  /**
   * 添加 AI 消息
   * @param {string} content 回复内容
   * @param {Array} items 推荐项列表
   */
  _addAiMessage(content, items = []) {
    const msg = {
      id: this._genId(),
      type: MSG_TYPE.AI,
      content,
      items,
      time: this._formatTime(new Date()),
    }
    const messages = this.data.messages.concat([msg])
    this.setData({ messages })
    this._scrollToBottom()
  },

  /**
   * 添加系统消息
   * @param {string} content 消息内容
   */
  _addSystemMessage(content) {
    const msg = {
      id: this._genId(),
      type: MSG_TYPE.SYSTEM,
      content,
      items: [],
      time: this._formatTime(new Date()),
    }
    const messages = this.data.messages.concat([msg])
    this.setData({ messages })
    this._scrollToBottom()
  },

  /**
   * 添加 AI 加载占位消息
   * @returns {string} 消息 ID
   */
  _addAiLoadingMessage() {
    const id = this._genId()
    const msg = {
      id,
      type: MSG_TYPE.AI,
      content: '',
      items: [],
      isLoading: true,
      time: this._formatTime(new Date()),
    }
    const messages = this.data.messages.concat([msg])
    this.setData({ messages })
    this._scrollToBottom()
    return id
  },

  /**
   * 移除指定消息
   * @param {string} msgId 消息 ID
   */
  _removeMessage(msgId) {
    const messages = this.data.messages.filter((m) => m.id !== msgId)
    this.setData({ messages })
  },

  /**
   * 滚动到底部
   */
  _scrollToBottom() {
    setTimeout(() => {
      const messages = this.data.messages
      if (messages.length > 0) {
        this.setData({
          scrollToView: 'msg-' + messages[messages.length - 1].id,
        })
      }
    }, 100)
  },

  /**
   * 生成唯一 ID
   * @returns {string}
   */
  _genId() {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
  },

  /**
   * 格式化时间
   * @param {Date} date
   * @returns {string}
   */
  _formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  },
})
