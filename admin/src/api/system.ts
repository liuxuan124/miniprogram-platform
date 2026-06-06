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

/** 上传文件 */
export function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  // 注意：FormData 上传时不要手动设置 Content-Type，交给浏览器自动携带 boundary
  return post<UploadResult>(`${BASE_URL}/upload`, formData)
}

// ==================== 操作日志 ====================

/** 获取操作日志列表 */
export function getOperationLogs(params: OperationLogParams) {
  return get<PageResult<OperationLog>>(`${BASE_URL}/operation-logs`, params as unknown as Record<string, unknown>)
}
