/**
 * AI 相关类型定义
 */

/** AI 对话记录 */
export interface AiConversation {
  id: number
  user_id: number
  user_nickname: string
  user_avatar?: string
  miniapp_name?: string
  message_count: number
  first_message: string
  last_message_at: string
  created_at: string
  updated_at: string
}

/** AI 对话消息 */
export interface AiConversationMessage {
  id: number
  conversation_id: number
  role: AiMessageRole
  content: string
  tokens?: number
  created_at: string
}

/** AI 消息角色 */
export enum AiMessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

/** AI 消息角色标签 */
export const AiMessageRoleLabels: Record<AiMessageRole, string> = {
  [AiMessageRole.User]: '用户',
  [AiMessageRole.Assistant]: 'AI',
  [AiMessageRole.System]: '系统',
}

/** AI 消息角色标签类型 */
export const AiMessageRoleTagType: Record<AiMessageRole, string> = {
  [AiMessageRole.User]: '',
  [AiMessageRole.Assistant]: 'success',
  [AiMessageRole.System]: 'warning',
}

/** AI 对话查询参数 */
export interface AiConversationParams {
  page?: number
  page_size?: number
  keyword?: string
  user_id?: number
  start_date?: string
  end_date?: string
}

/** 推荐日志 */
export interface AiRecommendationLog {
  id: number
  user_id: number
  user_nickname: string
  user_avatar?: string
  miniapp_id?: number
  miniapp_name?: string
  input_context: string
  recommendation_type: RecommendationType
  recommendation_content: string
  is_adopted: boolean
  feedback?: string
  created_at: string
}

/** 推荐类型 */
export enum RecommendationType {
  Template = 'template',
  Component = 'component',
  Style = 'style',
  Content = 'content',
  Layout = 'layout',
}

/** 推荐类型标签 */
export const RecommendationTypeLabels: Record<RecommendationType, string> = {
  [RecommendationType.Template]: '模板推荐',
  [RecommendationType.Component]: '组件推荐',
  [RecommendationType.Style]: '样式推荐',
  [RecommendationType.Content]: '内容推荐',
  [RecommendationType.Layout]: '布局推荐',
}

/** 推荐类型标签颜色 */
export const RecommendationTypeTagType: Record<RecommendationType, string> = {
  [RecommendationType.Template]: '',
  [RecommendationType.Component]: 'success',
  [RecommendationType.Style]: 'warning',
  [RecommendationType.Content]: 'danger',
  [RecommendationType.Layout]: 'info',
}

/** 推荐日志查询参数 */
export interface AiRecommendationLogParams {
  page?: number
  page_size?: number
  keyword?: string
  recommendation_type?: string
  is_adopted?: boolean
  user_id?: number
  start_date?: string
  end_date?: string
}

/** AI 统计概览 */
export interface AiStats {
  total_conversations: number
  total_messages: number
  total_recommendations: number
  adoption_rate: number
  avg_messages_per_conversation: number
  daily_conversations: DailyStat[]
  recommendation_by_type: RecommendationTypeStat[]
  top_users: TopUserStat[]
}

/** 每日统计 */
export interface DailyStat {
  date: string
  conversations: number
  messages: number
  recommendations: number
}

/** 推荐类型统计 */
export interface RecommendationTypeStat {
  type: string
  count: number
  adoption_count: number
  adoption_rate: number
}

/** 活跃用户统计 */
export interface TopUserStat {
  user_id: number
  user_nickname: string
  user_avatar?: string
  conversation_count: number
  message_count: number
}
