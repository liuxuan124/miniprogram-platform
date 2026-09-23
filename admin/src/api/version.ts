import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/miniapp-releases'

/** 获取版本列表（分页） */
export function getReleaseList(params?: Record<string, any>) {
  return get(`${BASE}`, params)
}

/** 获取所有版本（不分页，用于发布中心） */
export function getAllReleases(status?: number) {
  return get(`${BASE}/list`, status !== undefined ? { status } : {})
}

/** 仅正整数才可作为发布/模板详情 id，避免 GET .../templates、NaN、undefined */
export function toReleaseId(id: unknown): number | null {
  const raw = Array.isArray(id) ? id[0] : id
  if (raw == null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isInteger(n) || n <= 0) return null
  return n
}

export function isValidReleaseId(id: unknown): id is number {
  return toReleaseId(id) != null
}

/** 上线到小程序（导航草稿 + 脏页），不是微信代码包 */
export function publishContentToMiniapp() {
  return post(`${BASE}/publish-content`)
}

/** 整店模板列表（内容/版式，不是微信代码包） */
export async function getStoreTemplates() {
  try {
    return await get(`${BASE}/store-templates`, undefined, { showError: false })
  } catch {
    // 旧后端把 /store-templates 当成 {id}，改走已有列表接口
    const res = await get(`${BASE}/list`, undefined, { showError: false })
    const data = (res as any)?.data || res
    const list = Array.isArray(data)
      ? data.filter((r: any) => r?.mode === 'template' || r?.isSystem === 1 || r?.is_system === 1)
      : []
    return { ...(res as object), data: list } as any
  }
}

export type CreateStoreTemplatePayload = {
  templateName?: string
  scene?: string
  description?: string
  coverUrl?: string
}

export function createStoreTemplate(payload?: string | CreateStoreTemplatePayload) {
  const body: CreateStoreTemplatePayload =
    typeof payload === 'string' ? { templateName: payload } : payload || {}
  return post(`${BASE}/store-templates`, body)
}

export function duplicateStoreTemplate(id: number, templateName?: string) {
  return post(`${BASE}/${id}/duplicate`, { templateName })
}

export function renameStoreTemplate(id: number, templateName: string) {
  return put(`${BASE}/${id}/rename`, { templateName })
}

export function activateStoreTemplate(id: number) {
  return put(`${BASE}/${id}/activate`)
}

export function captureStoreTemplate(id: number) {
  return post(`${BASE}/${id}/capture`)
}

/** 获取版本详情（含快照，体积较大） */
export function getReleaseDetail(id: number) {
  const rid = toReleaseId(id)
  if (rid == null) {
    return Promise.resolve({ code: 200, data: null } as any)
  }
  return get(`${BASE}/${rid}`, undefined, { timeout: 60000, showError: false })
}

/** 获取最新版本 */
export function getLatestRelease() {
  return get(`${BASE}/latest`)
}

export interface PublishPreflightPage {
  id: number
  name: string
  path: string
  status: number
  action: 'publish' | 'already_live' | 'empty' | 'builtin'
}

export interface PublishPreflight {
  canPublish: boolean
  blocking: string[]
  warnings: string[]
  pages: PublishPreflightPage[]
  latestSemver?: string
}

/** 整包发布前检查 */
export function getPublishPreflight() {
  return get<PublishPreflight>(`${BASE}/preflight`)
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
  offlineExtraPages?: boolean
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
  targetId?: number
  appId?: string
}) {
  return post(`${BASE}/${id}/push-preview`, data || {}, { timeout: 120000, showError: false })
}

/** 获取最近体验版推送状态 */
export function getPushPreviewStatus() {
  return get(`${BASE}/push-preview/status`)
}

const PUSH_TARGET_BASE = '/api/v1/admin/wx-push-targets'

export interface WxPushTarget {
  id: number
  name: string
  appId: string
  uploadKeyPath?: string
  isDefault?: number | boolean
  status?: number
  remark?: string
  hasUploadKey?: boolean
}

export function listWxPushTargets() {
  return get(`${PUSH_TARGET_BASE}`)
}

export function listAllWxPushTargets() {
  return get(`${PUSH_TARGET_BASE}/all`)
}

export function getWxPushKeyPathHint() {
  return get(`${PUSH_TARGET_BASE}/key-path-hint`)
}

export function createWxPushTarget(data: {
  name: string
  appId: string
  uploadKey?: string
  uploadKeyPath?: string
  isDefault?: boolean
  status?: number
  remark?: string
}) {
  return post(`${PUSH_TARGET_BASE}`, data)
}

export function updateWxPushTarget(id: number, data: Record<string, unknown>) {
  return put(`${PUSH_TARGET_BASE}/${id}`, data)
}

export function setDefaultWxPushTarget(id: number) {
  return put(`${PUSH_TARGET_BASE}/${id}/default`)
}

export function deleteWxPushTarget(id: number) {
  return del(`${PUSH_TARGET_BASE}/${id}`)
}
