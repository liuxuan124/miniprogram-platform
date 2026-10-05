/**
 * 作者档案管理 API（/api/v1/admin/authors）
 * 发布内容时下拉选作者，自动带出头像和身份；
 * 后端按 authorId 把档案的 name/avatar/role 回填到 mp_content 三字段（小程序渲染链路不变）
 */
import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/authors'

export type AuthorRole = 'owner' | 'editor' | 'contributor' | 'user'

/** 角色枚举 → 后台展示文案。装修器/作者管理/选择器三处共用，避免各写一套 */
export const AUTHOR_ROLE_LABELS: Record<string, string> = {
  owner: '主理人',
  host: '星球主理人',
  editor: '编辑',
  contributor: '供稿人',
  user: '用户',
}

export function authorRoleLabel(r?: string) {
  return AUTHOR_ROLE_LABELS[r || ''] || r || '—'
}

/**
 * V121：作者主页路径统一出口（后台与小程序端必须同规则）。
 * 真实页面是分包子包 pkg-content/author-feed/author-feed，入参 id + author 两个。
 * 之前运营在装修器里手写 /pkg-content/author/detail?id= 这类路径，
 * 该页面根本不存在 → 必404。这里由代码统一拼，端上手输的旧路径做兼容映射。
 */
export function authorHomePath(authorId?: number | string | null, name?: string) {
  if (authorId === null || authorId === undefined || authorId === '') return ''
  const n = String(name || '').trim()
  return `/pkg-content/author-feed/author-feed?id=${authorId}${n ? `&author=${n}` : ''}`
}

export interface AuthorRecord {
  id?: number
  name?: string
  avatarUrl?: string
  role?: AuthorRole
  title?: string
  /** V121：逗号分隔标签，如「官方主理人,S级创作者」 */
  tags?: string
  intro?: string
  contact?: string
  sortOrder?: number
  status?: number
  /** 关联内容数（mp_content.author_id = 本档案） */
  contentCount?: number
  /** 关联商品/专栏数（mp_product.author_id = 本档案） */
  productCount?: number
  /** V114：关联的小程序用户ID；纯内容作者为 null */
  userId?: number | null
  /** V114：关联用户的昵称（后端联表回填） */
  userNickname?: string | null
  /** V114：该作者在用户池里挂的角色标签名（逗号分隔） */
  roleTags?: string | null
  createTime?: string
  updateTime?: string
}

export interface AuthorQuery {
  status?: number
  role?: string
  userId?: number
  keyword?: string
}

/** 小程序端作者聚合列表返回项（GET /api/v1/mp/authors） */
export interface AuthorAggregateItem {
  id: number
  name: string
  avatarUrl: string
  title: string
  tags: string[]
  /** 后端统一拼好的作者主页路径，端上不要再自己拼 */
  homePath: string
}

/** 作者列表（所有筛选条件都可选；不传=全部） */
export function listAuthors(query: AuthorQuery = {}) {
  const params: Record<string, string | number> = {}
  if (query.status !== undefined) params.status = query.status
  if (query.role) params.role = query.role
  if (query.userId !== undefined) params.userId = query.userId
  if (query.keyword) params.keyword = query.keyword
  return get<AuthorRecord[]>(BASE, params)
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