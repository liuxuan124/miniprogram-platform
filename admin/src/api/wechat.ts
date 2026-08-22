/**
 * 微信公众号相关 API
 */
import { post } from './request'

const BASE_URL = '/api/v1/admin/wechat/official-account'

export type WeChatSyncScope = 'all' | 'newspic' | 'news'

export interface WeChatContentSyncRequest {
  categoryId?: number
  publish?: boolean
  syncScope?: WeChatSyncScope
}

export interface WeChatContentSyncResult {
  totalPublishRecords: number
  totalArticles: number
  created: number
  updated: number
  skipped: number
  typeFiltered?: number
  failed: number
  articleCount?: number
  noteCount?: number
  message: string
  failures?: Array<{ title: string; reason: string }>
}

export interface WeChatUrlImportRequest {
  urls: string[]
  categoryId?: number
  publish?: boolean
}

/** 全量同步公众号已发布图文 */
export function syncWeChatPublishedContents(data?: WeChatContentSyncRequest) {
  return post<WeChatContentSyncResult>(`${BASE_URL}/sync-published`, data as Record<string, unknown>)
}

/** 公众号文章链接批量导入 */
export function importWeChatArticleUrls(data: WeChatUrlImportRequest) {
  return post<WeChatContentSyncResult>(`${BASE_URL}/import-urls`, data as unknown as Record<string, unknown>)
}
