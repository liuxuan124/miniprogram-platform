/**
 * 微信公众号相关 API
 */
import { post } from './request'

const BASE_URL = '/api/v1/admin/wechat/official-account'

export interface WeChatContentSyncRequest {
  categoryId?: number
  publish?: boolean
}

export interface WeChatContentSyncResult {
  totalPublishRecords: number
  totalArticles: number
  created: number
  updated: number
  skipped: number
  failed: number
  articleCount?: number
  noteCount?: number
  message: string
  failures?: Array<{ title: string; reason: string }>
}

/** 全量同步公众号已发布图文 */
export function syncWeChatPublishedContents(data?: WeChatContentSyncRequest) {
  return post<WeChatContentSyncResult>(`${BASE_URL}/sync-published`, data as Record<string, unknown>)
}
