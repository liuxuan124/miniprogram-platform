import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/miniapp-releases'

/** 获取版本列表（分页） */
export function getReleaseList(params?: Record<string, any>) {
  return get(`${BASE}`, params)
}

/** 获取所有版本（不分页，用于模板中心） */
export function getAllReleases(status?: number) {
  return get(`${BASE}/list`, status !== undefined ? { status } : {})
}

/** 获取版本详情 */
export function getReleaseDetail(id: number) {
  return get(`${BASE}/${id}`)
}

/** 获取最新版本 */
export function getLatestRelease() {
  return get(`${BASE}/latest`)
}

/** 创建版本（双模式：template=保存为模板, publish=发布上线） */
export function createRelease(data: {
  mode: 'template' | 'publish'
  baseReleaseId?: number
  releaseNotes?: string
}) {
  return post(`${BASE}`, data)
}

/** 发布版本（从草稿/模板状态发布） */
export function publishRelease(id: number) {
  return post(`${BASE}/${id}/publish`)
}

/** 模板提升为已发布（promote） */
export function promoteRelease(id: number) {
  return put(`${BASE}/${id}/promote`)
}

/** 删除模板 */
export function deleteRelease(id: number) {
  return del(`${BASE}/${id}`)
}

/** 回滚版本 */
export function rollbackRelease(data: {
  targetSemver: string
  reason?: string
}) {
  return post(`${BASE}/rollback`, data)
}

/** 获取版本历史（用于版本选择器） */
export function getReleaseHistory() {
  return get(`${BASE}/history`)
}

/** 获取下一个语义化版本号 */
export function getNextSemver(changeType: string) {
  return get(`${BASE}/next-semver`, { changeType })
}

/** 获取操作日志 */
export function getVersionOperationLogs(params?: Record<string, any>) {
  return get(`${BASE}/operation-logs`, params)
}

/** 推送微信小程序体验版 */
export function pushPreviewRelease(id: number, data?: {
  versionDesc?: string
  confirmCodeChange?: boolean
}) {
  return post(`${BASE}/${id}/push-preview`, data || {}, { timeout: 120000 })
}

/** 获取最近体验版推送状态 */
export function getPushPreviewStatus() {
  return get(`${BASE}/push-preview/status`)
}
