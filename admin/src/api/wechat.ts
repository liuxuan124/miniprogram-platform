/**
 * 微信公众号相关 API
 */
import { get, post } from './request'

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

export interface ImportTask {
  taskId: string
  type: 'sync' | 'url'
  status: 'pending' | 'running' | 'success' | 'failed'
  total: number
  processed: number
  currentTitle?: string
  startedAt?: string
  finishedAt?: string
  operatorId?: number
  error?: string
  result?: WeChatContentSyncResult
}

/** 全量同步公众号已发布图文（异步：返回 ImportTask；降级同步时直接返回 Result） */
export function syncWeChatPublishedContents(data?: WeChatContentSyncRequest) {
  return post<ImportTask | WeChatContentSyncResult>(`${BASE_URL}/sync-published`, data as Record<string, unknown>)
}

/** 公众号文章链接批量导入（异步） */
export function importWeChatArticleUrls(data: WeChatUrlImportRequest) {
  return post<ImportTask | WeChatContentSyncResult>(`${BASE_URL}/import-urls`, data as unknown as Record<string, unknown>)
}

export function getImportTask(taskId: string) {
  return get<ImportTask>(`${BASE_URL}/import-tasks/${taskId}`)
}

export function getRunningImportTask() {
  return get<ImportTask | null>(`${BASE_URL}/import-tasks/running`)
}
