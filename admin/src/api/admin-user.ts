/**
 * 管理员账号与角色管理 API
 */
import { get, post, put, del } from './request'
import type { PaginatedResponse } from '@/types/global'

const BASE = '/api/v1/admin'

/** 管理员账号 */
export interface AdminUserRecord {
  id: number
  username: string
  realName?: string
  phone?: string
  avatarUrl?: string
  roleId?: number
  roleCode?: string
  roleName?: string
  status: number
  lastLoginAt?: string
  createTime?: string
}

export interface AdminUserParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: number
  roleId?: number
}

export interface AdminUserPayload {
  username: string
  password?: string
  realName?: string
  phone?: string
  avatarUrl?: string
  roleId?: number
  status?: number
}

/** 角色 */
export interface RoleRecord {
  id: number
  code: string
  name: string
  description?: string
}

export function getAdminUserList(params?: AdminUserParams) {
  return get<PaginatedResponse<AdminUserRecord>>(`${BASE}/admin-users`, { params })
}

export function createAdminUser(data: AdminUserPayload) {
  return post<AdminUserRecord>(`${BASE}/admin-users`, data)
}

export function updateAdminUser(id: number, data: AdminUserPayload) {
  return put<AdminUserRecord>(`${BASE}/admin-users/${id}`, data)
}

export function deleteAdminUser(id: number) {
  return del(`${BASE}/admin-users/${id}`)
}

export function getRoleList() {
  return get<RoleRecord[]>(`${BASE}/roles`)
}
