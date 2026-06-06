/**
 * 内容管理相关类型定义
 */

/** 内容分类 */
export interface ContentCategory {
  id: number
  name: string
  parentId?: number | null
  parent_id?: number | null
  sortOrder?: number
  sort?: number
  icon?: string
  status: CategoryStatus
  children?: ContentCategory[]
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

/** 分类状态 */
export enum CategoryStatus {
  Enabled = 1,
  Disabled = 0,
}

/** 分类状态标签 */
export const CategoryStatusLabels: Record<CategoryStatus, string> = {
  [CategoryStatus.Enabled]: '启用',
  [CategoryStatus.Disabled]: '禁用',
}

/** 分类状态标签类型 */
export const CategoryStatusTagType: Record<CategoryStatus, string> = {
  [CategoryStatus.Enabled]: 'success',
  [CategoryStatus.Disabled]: 'danger',
}

/** 创建分类参数 */
export interface CreateCategoryParams {
  name: string
  parentId?: number | null
  parent_id?: number | null
  sortOrder?: number
  sort?: number
  icon?: string
  status?: CategoryStatus
}

/** 更新分类参数 */
export interface UpdateCategoryParams {
  name?: string
  parentId?: number | null
  parent_id?: number | null
  sortOrder?: number
  sort?: number
  icon?: string
  status?: CategoryStatus
}

/** 内容文章状态 */
export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
  Unpublished = 'unpublished',
}

/** 内容状态标签 */
export const ContentStatusLabels: Record<ContentStatus, string> = {
  [ContentStatus.Draft]: '草稿',
  [ContentStatus.Published]: '已发布',
  [ContentStatus.Unpublished]: '已下架',
}

/** 内容状态标签类型 */
export const ContentStatusTagType: Record<ContentStatus, string> = {
  [ContentStatus.Draft]: 'info',
  [ContentStatus.Published]: 'success',
  [ContentStatus.Unpublished]: 'warning',
}

/** 内容文章 */
export interface ContentArticle {
  id: number
  title: string
  category_id: number
  category_name?: string
  summary?: string
  content: string
  cover_image?: string
  tags: ContentTag[]
  status: ContentStatus
  author?: string
  sort: number
  is_top: boolean
  published_at?: string
  created_at: string
  updated_at: string
}

/** 创建内容参数 */
export interface CreateContentParams {
  title: string
  category_id: number
  summary?: string
  content: string
  cover_image?: string
  tag_ids?: number[]
  status?: ContentStatus
  author?: string
  sort?: number
  is_top?: boolean
}

/** 更新内容参数 */
export interface UpdateContentParams {
  title?: string
  category_id?: number
  summary?: string
  content?: string
  cover_image?: string
  tag_ids?: number[]
  status?: ContentStatus
  author?: string
  sort?: number
  is_top?: boolean
}

/** 内容列表查询参数 */
export interface ContentListParams {
  page?: number
  page_size?: number
  keyword?: string
  category_id?: number
  status?: string
  tag_id?: number
}

/** 内容标签 */
export interface ContentTag {
  id: number
  name: string
  color?: string
  content_count?: number
  created_at: string
}

/** 创建标签参数 */
export interface CreateTagParams {
  name: string
  color?: string
}

/** 更新标签参数 */
export interface UpdateTagParams {
  name?: string
  color?: string
}
