/**
 * 页面搭建相关 API
 * 严格遵循 api-contract.md 接口契约
 */
import { get, post, put, del } from './request'
import type {
  PageRecord,
  CreatePageParams,
  UpdatePageParams,
  PageListParams,
  VersionRecord,
  PageTemplate,
  PageDSL,
} from '@/types/page'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

/** 获取页面列表 */
export function getPageList(params?: PageListParams) {
  return get<PageResult<PageRecord>>(`${BASE_URL}/pages`, params as Record<string, unknown>)
}

/** 创建页面 */
export function createPage(data: CreatePageParams) {
  return post<PageRecord>(`${BASE_URL}/pages`, data as unknown as Record<string, unknown>)
}

/** 获取页面详情 */
export function getPageDetail(id: number) {
  return get<PageRecord>(`${BASE_URL}/pages/${id}`)
}

/** 更新页面 */
export function updatePage(id: number, data: UpdatePageParams) {
  return put<PageRecord>(`${BASE_URL}/pages/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除页面 */
export function deletePage(id: number) {
  return del<void>(`${BASE_URL}/pages/${id}`)
}

/** 保存草稿
 * @param expectedVersion 客户端最后已知版本号，传入时后端会做并发冲突检测
 */
export function saveDraft(id: number, dsl: PageDSL, expectedVersion?: number) {
  return post<PageRecord>(`${BASE_URL}/pages/${id}/draft`, {
    dslContent: JSON.stringify(dsl),
    ...(expectedVersion !== undefined && { expectedVersion }),
  })
}

/** 发布页面 */
export function publishPage(id: number) {
  return post<PageRecord>(`${BASE_URL}/pages/${id}/publish`)
}

/** 下架页面 */
export function unpublishPage(id: number) {
  return post<PageRecord>(`${BASE_URL}/pages/${id}/unpublish`)
}

/** 获取版本列表 */
export function getVersionList(id: number) {
  return get<VersionRecord[]>(`${BASE_URL}/pages/${id}/versions`)
}

/** 版本回滚 */
export function rollbackVersion(pageId: number, version: number) {
  return post<PageRecord>(`${BASE_URL}/pages/${pageId}/versions/${version}/rollback`)
}

/** 获取页面模板列表 */
export function getPageTemplates(params?: Record<string, unknown>) {
  return get<PageResult<PageTemplate>>(`${BASE_URL}/page-templates`, params)
}

/** 获取模板详情 */
export function getTemplateDetail(id: number) {
  return get<PageTemplate>(`${BASE_URL}/page-templates/${id}`)
}

/** 创建模板 */
export function createTemplate(data: Record<string, unknown>) {
  return post<PageTemplate>(`${BASE_URL}/page-templates`, data)
}

/** 更新模板 */
export function updateTemplate(id: number, data: Record<string, unknown>) {
  return put<PageTemplate>(`${BASE_URL}/page-templates/${id}`, data)
}

/** 删除模板 */
export function deleteTemplate(id: number) {
  return del<void>(`${BASE_URL}/page-templates/${id}`)
}

/** 按行业获取模板列表 */
export function getTemplatesByIndustry(industryCode: string) {
  return get<PageTemplate[]>(`${BASE_URL}/page-templates/industry/${industryCode}`)
}
