/**
 * 运营中心 › 搜索运营 API
 *
 * 走 `/api/v1/admin/ops/search/**` 而不是 `/api/v1/admin/system/configs`：
 * 后者在 SecurityConfig 的 super_admin 专属前缀内，运营角色（content_ops / biz_ops）会 403。
 * 契约见 backend 的 AdminSearchOpsController。
 */
import { get, put } from './request'

/** 搜索建议位条目 */
export interface SearchSuggestItem {
  icon?: string
  title: string
  desc?: string
  /** 小程序内部路由；会经 render.js 的 navigatePage 做未注册页兜底 */
  path?: string
}

/** 取搜索热词列表 */
export function getSearchHotWords() {
  return get<string[]>('/api/v1/admin/ops/search/hot-words')
}

/** 保存搜索热词列表。传空数组 = 清空（端上回落到本地兜底词） */
export function saveSearchHotWords(words: string[]) {
  return put<string[]>('/api/v1/admin/ops/search/hot-words', words)
}

/** 取搜索建议位 */
export function getSearchSuggests() {
  return get<SearchSuggestItem[]>('/api/v1/admin/ops/search/suggests')
}

/** 保存搜索建议位 */
export function saveSearchSuggests(items: SearchSuggestItem[]) {
  return put<SearchSuggestItem[]>('/api/v1/admin/ops/search/suggests', items)
}
