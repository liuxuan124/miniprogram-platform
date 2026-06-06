// services/ai.js — AI 对话服务
// 封装 AI 对话、对话历史查询、推荐点击记录等接口
// 契约接口:
//   POST /api/v1/mp/ai/chat — AI对话
//   GET  /api/v1/mp/ai/history — 对话历史
//   POST /api/v1/mp/ai/recommendation-logs — 记录推荐点击

const { get, post } = require('../utils/request')
const { StorageUtil } = require('../utils/storage')

const AI_HISTORY_CACHE_KEY = 'ai_chat_history'
const AI_SESSION_KEY = 'ai_session_id'

/**
 * AI 对话服务
 */
const AiService = {
  /**
   * 发送对话消息
   * @param {string} question 用户问题
   * @param {string} [sessionId] 会话 ID（可选，不传则使用上次会话或新建）
   * @returns {Promise<{
   *   answer: string,
   *   recommended_items: Array<{type:string, id:string, title:string, image:string, reason:string}>,
   *   is_transfer_human: boolean,
   *   session_id: string
   * }>}
   */
  chat(question, sessionId) {
    const sid = sessionId || this.getSessionId()
    const data = { question }
    if (sid) {
      data.session_id = sid
    }

    return post('/api/v1/mp/ai/chat', data, { auth: true, loading: false }).then((res) => {
      // 保存会话 ID
      if (res.session_id) {
        this.setSessionId(res.session_id)
      }
      return res
    })
  },

  /**
   * 获取对话历史
   * @param {Object} [params] 查询参数
   * @param {number} [params.page] 页码
   * @param {number} [params.page_size] 每页数量
   * @param {string} [params.session_id] 会话 ID
   * @returns {Promise<{ list: Array, hasMore: boolean, total: number }>}
   */
  getHistory(params = {}) {
    const sessionId = params.session_id || this.getSessionId()
    const queryParams = {
      page: params.page || 1,
      page_size: params.page_size || 20,
    }
    if (sessionId) {
      queryParams.session_id = sessionId
    }

    return get('/api/v1/mp/ai/history', queryParams, { auth: true }).then((res) => {
      const list = res.list || res.items || []
      const total = res.total || 0
      const hasMore = queryParams.page * queryParams.page_size < total
      return { list, hasMore, total }
    })
  },

  /**
   * 记录推荐项点击
   * @param {Object} params
   * @param {string} params.item_type 推荐项类型 (product/content/activity)
   * @param {string} params.item_id 推荐项 ID
   * @param {string} params.session_id 会话 ID
   * @param {string} [params.reason] 推荐理由
   * @returns {Promise}
   */
  logRecommendationClick(params) {
    return post('/api/v1/mp/ai/recommendation-logs', {
      item_type: params.item_type,
      item_id: params.item_id,
      session_id: params.session_id || this.getSessionId(),
      reason: params.reason || '',
    }, { auth: true, loading: false }).catch((err) => {
      // 点击日志失败不影响用户体验，静默处理
      console.warn('[AiService] 推荐点击记录失败:', err)
    })
  },

  /**
   * 获取当前会话 ID
   * @returns {string|null}
   */
  getSessionId() {
    return StorageUtil.get(AI_SESSION_KEY) || null
  },

  /**
   * 保存会话 ID
   * @param {string} sessionId
   */
  setSessionId(sessionId) {
    StorageUtil.set(AI_SESSION_KEY, sessionId)
  },

  /**
   * 清除当前会话（开始新对话）
   */
  clearSession() {
    StorageUtil.remove(AI_SESSION_KEY)
  },

  /**
   * 保存本地对话历史（用于快速恢复页面）
   * @param {Array} messages 消息列表
   */
  saveLocalHistory(messages) {
    StorageUtil.set(AI_HISTORY_CACHE_KEY, messages)
  },

  /**
   * 读取本地对话历史
   * @returns {Array}
   */
  getLocalHistory() {
    return StorageUtil.get(AI_HISTORY_CACHE_KEY) || []
  },

  /**
   * 清除本地对话历史
   */
  clearLocalHistory() {
    StorageUtil.remove(AI_HISTORY_CACHE_KEY)
  },
}

module.exports = { AiService }
