/**
 * 租户 API（超管）
 */
import { get, post } from './request'

export interface TenantInfo {
  id?: number
  tenantId?: number
  code?: string
  name?: string
  industryCode?: string
  status?: number
}

export interface TenantCreatePayload {
  code: string
  name: string
  industryCode?: string
}

export function getCurrentTenant() {
  return get<TenantInfo>('/api/v1/admin/tenants/current')
}

export function listTenants() {
  return get<TenantInfo[]>('/api/v1/admin/tenants')
}

export function createTenant(payload: TenantCreatePayload) {
  return post<TenantInfo>('/api/v1/admin/tenants', payload)
}
