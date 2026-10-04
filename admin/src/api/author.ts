/**
 * 作者档案管理 API（/api/v1/admin/authors）
 * 发布内容时下拉选作者，自动带出头像和身份；
 * 后端按 authorId 把档案的 name/avatar/role 回填到 mp_content 三字段（小程序渲染链路不变）
 */
import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/authors'

export type AuthorRole = 'owner' | 'editor' | 'contributor' | 'user'

export interface AuthorRecord {
  id?: number
  name?: string
  avatarUrl?: string
  role?: AuthorRole
  title?: string
  intro?: string
  contact?: string
  sortOrder?: number
  status?: number
  /** 关联内容数（mp_content.author_id = 本档案） */
  contentCount?: number
  /** 关联商品/专栏数（mp_product.author_id = 本档案） */
  productCount?: number
  createTime?: string
  updateTime?: string
}

/** 作者列表（status 不传=全部） */
export function listAuthors(status?: number) {
  return get<AuthorRecord[]>(BASE, status === undefined ? undefined : { status })
}

/** 新增作者 */
export function createAuthor(data: Partial<AuthorRecord>) {
  return post<AuthorRecord>(BASE, data as Record<string, unknown>)
}

/** 更新作者 */
export function updateAuthor(id: number, data: Partial<AuthorRecord>) {
  return put<AuthorRecord>(`${BASE}/${id}`, data as Record<string, unknown>)
}

/** 删除作者（被内容引用时后端会拒绝） */
export function deleteAuthor(id: number) {
  return del<void>(`${BASE}/${id}`)
}

/** 新增或更新（有 id 为更新） */
export function saveAuthor(data: Partial<AuthorRecord>) {
  return data.id ? updateAuthor(data.id, data) : createAuthor(data)
}

/**
 * 批量关联历史内容：把 author_id 为空且 author 名字匹配该作者昵称的内容
 * 全部关联到该档案。返回关联条数。
 */
export function linkContents(id: number) {
  return post<number>(`${BASE}/${id}/link-contents`, {})
}