/**
 * AI 相关 API
 * 严格遵循接口契约
 */
import { get } from './request'
import type {
  AiConversation,
  AiConversationMessage,
  AiConversationParams,
  AiRecommendationLog,
  AiRecommendationLogParams,
  AiStats,
} from '@/types/ai'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/ai'

// ==================== AI 对话记录 ====================

/** 获取对话记录列表 */
export function getAiConversations(params?: AiConversationParams) {
  return get<PageResult<AiConversation>>(`${BASE_URL}/conversations`, params as Record<string, unknown>)
}

/** 获取对话详情（含消息列表） */
export function getAiConversationDetail(id: number) {
  return get<AiConversationMessage[]>(`${BASE_URL}/conversations/${id}`)
}

// ==================== 推荐日志 ====================

/** 获取推荐日志列表 */
export function getAiRecommendationLogs(params?: AiRecommendationLogParams) {
  return get<PageResult<AiRecommendationLog>>(`${BASE_URL}/recommendation-logs`, params as Record<string, unknown>)
}

// ==================== 推荐统计 ====================

/** 获取 AI 统计概览 */
export function getAiStats() {
  return get<AiStats>(`${BASE_URL}/stats`)
}
