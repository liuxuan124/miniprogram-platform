import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/module-versions'

export interface ModuleVersionRecord {
  id: number
  moduleType: string
  targetId: number
  semver: string
  major: number
  minor: number
  patch: number
  versionData: string
  changeSummary: string
  status: number
  publishedAt: string
  publisherId: number
  publisherName: string
  rolledBackAt: string
  rolledBackBy: number
  createTime: string
}

/** 分页查询版本列表 */
export function getModuleVersionList(params?: Record<string, any>) {
  return get(BASE, params)
}

/** 获取目标数据的所有版本（不分页） */
export function getTargetVersions(moduleType: string, targetId: number) {
  return get(`${BASE}/target`, { moduleType, targetId })
}

/** 获取版本详情 */
export function getModuleVersionDetail(id: number) {
  return get(`${BASE}/${id}`)
}

/** 获取最新已发布版本 */
export function getLatestPublishedVersion(moduleType: string, targetId: number) {
  return get(`${BASE}/latest`, { moduleType, targetId })
}

/** 创建版本快照 */
export function createModuleVersion(data: {
  moduleType: string
  targetId: number
  versionData?: string
  changeSummary?: string
}) {
  return post(BASE, data)
}

/** 发布版本 */
export function publishModuleVersion(id: number) {
  return put(`${BASE}/${id}/publish`)
}

/** 回滚版本 */
export function rollbackModuleVersion(id: number, reason?: string) {
  return post(`${BASE}/${id}/rollback`, null, { params: { reason } })
}

/** 删除版本 */
export function deleteModuleVersion(id: number) {
  return del(`${BASE}/${id}`)
}

/** 版本统计 */
export function getModuleVersionStats(moduleType?: string) {
  return get(`${BASE}/stats`, moduleType ? { moduleType } : {})
}
