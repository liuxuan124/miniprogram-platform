/**
 * 内容管理相关 API
 * 严格遵循接口契约
 */
import { get, post, put, del } from './request'
import type {
  ContentCategory,
  CreateCategoryParams,
  UpdateCategoryParams,
  ContentArticle,
  CreateContentParams,
  UpdateContentParams,
  ContentListParams,
  ContentTag,
  CreateTagParams,
  UpdateTagParams,
} from '@/types/content'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

// ==================== 内容分类 ====================

/** 获取分类列表（树形） */
export function getCategoryList(params?: { status?: string }) {
  return get<ContentCategory[]>(`${BASE_URL}/content-categories`, params as Record<string, unknown>)
}

/** 创建分类 */
export function createCategory(data: CreateCategoryParams) {
  return post<ContentCategory>(`${BASE_URL}/content-categories`, data as unknown as Record<string, unknown>)
}

/** 更新分类 */
export function updateCategory(id: number, data: UpdateCategoryParams) {
  return put<ContentCategory>(`${BASE_URL}/content-categories/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除分类 */
export function deleteCategory(id: number) {
  return del<void>(`${BASE_URL}/content-categories/${id}`)
}

// ==================== 内容文章 ====================

/** 获取内容列表 */
export function getContentList(params?: ContentListParams) {
  return get<PageResult<ContentArticle>>(`${BASE_URL}/contents`, params as Record<string, unknown>)
}

/** 创建内容 */
export function createContent(data: CreateContentParams) {
  return post<ContentArticle>(`${BASE_URL}/contents`, data as unknown as Record<string, unknown>)
}

/** 获取内容详情 */
export function getContentDetail(id: number) {
  return get<ContentArticle>(`${BASE_URL}/contents/${id}`)
}

/** 更新内容 */
export function updateContent(id: number, data: UpdateContentParams) {
  return put<ContentArticle>(`${BASE_URL}/contents/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除内容 */
export function deleteContent(id: number) {
  return del<void>(`${BASE_URL}/contents/${id}`)
}

/** 发布内容 */
export function publishContent(id: number) {
  return put<ContentArticle>(`${BASE_URL}/contents/${id}/publish`)
}

/** 下架内容 */
export function unpublishContent(id: number) {
  return put<ContentArticle>(`${BASE_URL}/contents/${id}/unpublish`)
}

// ==================== 内容标签 ====================

/** 获取标签列表 */
export function getTagList(params?: { keyword?: string }) {
  return get<ContentTag[]>(`${BASE_URL}/content-tags`, params as Record<string, unknown>)
}

/** 创建标签 */
export function createTag(data: CreateTagParams) {
  return post<ContentTag>(`${BASE_URL}/content-tags`, data as unknown as Record<string, unknown>)
}

/** 更新标签 */
export function updateTag(id: number, data: UpdateTagParams) {
  return put<ContentTag>(`${BASE_URL}/content-tags/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除标签 */
export function deleteTag(id: number) {
  return del<void>(`${BASE_URL}/content-tags/${id}`)
}
