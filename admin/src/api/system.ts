/**
 * 系统设置相关 API
 * 严格遵循接口契约
 */
import { get, put, post } from './request'
import type {
  ConfigGroupData,
  ConfigGroup,
  OperationLog,
  OperationLogParams,
  UploadResult,
} from '@/types/system'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/system'

// ==================== 系统配置 ====================

/** 获取全部配置（后端返回 ConfigVO 数组） */
export function getConfigs() {
  return get<ConfigGroupData[] | SystemConfigRecord[]>(`${BASE_URL}/configs`)
}

/** 静默获取全部配置（页面初始化用） */
export function getConfigsSilent() {
  return get<ConfigGroupData[] | SystemConfigRecord[]>(`${BASE_URL}/configs`, undefined, { showError: false })
}

export interface SystemConfigRecord {
  id?: number
  configKey?: string
  configValue?: string
  configGroup?: string
  description?: string
}

/** 批量更新配置项 */
export interface SystemConfigUpdateItem {
  configKey: string
  configValue: string
  configGroup?: string
  description?: string
}

/** 更新配置 - 后端期望 { configs: ConfigItemDTO[] } */
export function updateConfigs(configs: SystemConfigUpdateItem[]) {
  return put<null>(`${BASE_URL}/configs`, { configs })
}

/** 单独保存代码上传密钥（避免与其它字段批量保存时互相影响） */
export function saveUploadKey(uploadKey: string) {
  return updateConfigs([{
    configKey: 'wx_upload_key',
    configValue: uploadKey.trim(),
    configGroup: 'wechat',
    description: 'uploadKey',
  }])
}

/** 获取指定分组配置 */
export function getConfigByGroup(group: ConfigGroup) {
  return get<ConfigGroupData>(`${BASE_URL}/configs/${group}`)
}

/**
 * 静默获取指定分组配置（不显示错误提示）
 * 用于页面初始化加载，失败时使用默认值
 */
export function getConfigByGroupSilent(group: ConfigGroup) {
  return get<ConfigGroupData>(`${BASE_URL}/configs/${group}`, undefined, { showError: false })
}

// ==================== 文件上传 ====================

/**
 * 修正上传文件 URL。
 * 后端未配置 file.base-url 时会返回 http://localhost:8080/uploads/...，
 * 浏览器无法访问该地址，这里改写为实际后端地址（开发时取 VITE_API_TARGET，线上取当前域名）。
 */
export function normalizeUploadUrl(url: string): string {
  if (!url) return url
  const m = url.match(/^https?:\/\/localhost(?::\d+)?(\/uploads\/.+)$/)
  if (!m) return url
  const origin = (import.meta.env.VITE_API_TARGET as string | undefined) || window.location.origin
  return origin.replace(/\/+$/, '') + m[1]
}

/** 上传文件 */
export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  // 注意：FormData 上传时不要手动设置 Content-Type，交给浏览器自动携带 boundary
  const res = await post<UploadResult>(`${BASE_URL}/upload`, formData)
  if (res.data?.url) res.data.url = normalizeUploadUrl(res.data.url)
  return res
}

export interface WxPayPrivateKeyUploadResult {
  uploaded: boolean
  certSerialNo?: string
}

/** 上传微信支付商户 API 私钥；p12 默认使用商户号作为密码 */
export function uploadWxPayPrivateKey(file: File, password?: string) {
  const formData = new FormData()
  formData.append('file', file)
  if (password) formData.append('password', password)
  return post<WxPayPrivateKeyUploadResult>(`${BASE_URL}/configs/wx-pay-private-key`, formData)
}

export interface WxPayConfigTestResult {
  connected: boolean
  environment: string
  message: string
}

/** 真实连接微信商户平台并验证支付凭据 */
export function testWxPayConfig() {
  return post<WxPayConfigTestResult>(`${BASE_URL}/configs/wx-pay-test`)
}

// ==================== 操作日志 ====================

/** 获取操作日志列表 */
export function getOperationLogs(params: OperationLogParams) {
  return get<PageResult<OperationLog>>(`${BASE_URL}/operation-logs`, params as unknown as Record<string, unknown>)
}
