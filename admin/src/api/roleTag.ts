/**
 * 角色标签 API（/api/v1/admin/ops/role-tags）
 *
 * 为什么走 /ops 而不是 /system：
 * `/api/v1/admin/system/**` 在 SecurityConfig 的 super_admin 专属前缀里，
 * 运营角色（content_ops / biz_ops）调会 403；/ops 前缀只需登录。
 *
 * 数据落在既有表 mp_member_tag（V114 加的 is_role / role_code 两列），无新表。
 */
import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/ops/role-tags'

export interface RoleTag {
  id: number
  name: string
  color: string
  /** 角色稳定代码（owner/host/editor/contributor/operator）；可为空 */
  roleCode?: string | null
  description?: string | null
  sortOrder?: number | null
  status?: number | null
  /** 已挂该角色的用户数 */
  userCount: number
}

export interface RoleTagForm {
  name: string
  color?: string
  roleCode?: string
  description?: string
  sortOrder?: number
  status?: number
}

/** 角色标签列表（附已挂人数） */
export function listRoleTags() {
  return get<RoleTag[]>(BASE)
}

/** 新建角色标签 */
export function createRoleTag(data: RoleTagForm) {
  return post<RoleTag>(BASE, data as unknown as Record<string, unknown>)
}

/** 编辑角色标签（roleCode 不可改） */
export function updateRoleTag(id: number, data: Partial<RoleTagForm>) {
  return put<RoleTag>(`${BASE}/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除角色标签（会先解绑所有用户） */
export function deleteRoleTag(id: number) {
  return del<void>(`${BASE}/${id}`)
}

/** 给一批用户打角色标签，返回实际新增条数 */
export function assignRoleTag(tagId: number, userIds: number[]) {
  return post<number>(`${BASE}/assign`, { tagId, userIds })
}

/** 移除某个用户的某个角色标签 */
export function unassignRoleTag(tagId: number, userId: number) {
  return del<void>(`${BASE}/assign`, { tagId, userId })
}

/** 取一批用户已挂的角色标签名，返回 { userId: '主理人,编辑' } */
export function getUserRoleTags(userIds: number[]) {
  return get<Record<string, string>>(`${BASE}/of-users`, { userIds: userIds.join(',') })
}
