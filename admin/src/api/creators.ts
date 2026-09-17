/**
 * 创作者申请 API
 */
import { get, put } from './request'

const BASE = '/api/v1/admin/creators'

export function listCreatorApplications(params?: {
  status?: string
  current?: number
  size?: number
}) {
  return get(`${BASE}/applications`, params as Record<string, unknown>)
}

export function updateCreatorApplicationStatus(
  id: number,
  data: { status: string; rejectReason?: string },
) {
  return put(`${BASE}/applications/${id}/status`, data as unknown as Record<string, unknown>)
}
