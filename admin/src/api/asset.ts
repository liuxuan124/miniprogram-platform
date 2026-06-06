/**
 * 素材库 API
 * 参考微盟素材库系统设计，支持图片、视频、音频、图文素材管理
 */
import { get, post, put, del } from './request'
import type { ApiResponse } from '@/types/global'
import type {
  MaterialRecord,
  MaterialQueryParams,
  CreateMaterialParams,
  UpdateMaterialParams,
  MaterialGroup,
  CreateGroupParams,
  UpdateGroupParams,
  BatchOperationParams,
  SyncToWechatParams,
} from '@/types/asset'

const BASE = '/api/v1/admin/assets'

// ==================== 素材 CRUD ====================

/** 获取素材列表 */
export function getMaterialList(params?: MaterialQueryParams) {
  return get<ApiResponse<{ records: MaterialRecord[]; total: number }>>(BASE, params as Record<string, any>)
}

/** 获取素材详情 */
export function getMaterialDetail(id: number) {
  return get<ApiResponse<MaterialRecord>>(`${BASE}/${id}`)
}

/** 创建素材 */
export function createMaterial(data: CreateMaterialParams) {
  return post<ApiResponse<MaterialRecord>>(BASE, data)
}

/** 更新素材 */
export function updateMaterial(id: number, data: UpdateMaterialParams) {
  return put<ApiResponse<null>>(`${BASE}/${id}`, data as Record<string, any>)
}

/** 删除素材 */
export function deleteMaterial(id: number) {
  return del<ApiResponse<null>>(`${BASE}/${id}`)
}

/** 批量删除素材 */
export function batchDeleteMaterials(data: BatchOperationParams) {
  return post<ApiResponse<null>>(`${BASE}/batch-delete`, data)
}

/** 批量移动素材 */
export function batchMoveMaterials(data: BatchOperationParams) {
  return post<ApiResponse<null>>(`${BASE}/batch-move`, data)
}

// ==================== 素材分组 CRUD ====================

/** 获取素材分组列表 */
export function getGroupList() {
  return get<ApiResponse<MaterialGroup[]>>(`${BASE}/groups`)
}

/** 创建素材分组 */
export function createGroup(data: CreateGroupParams) {
  return post<ApiResponse<MaterialGroup>>(`${BASE}/groups`, data)
}

/** 更新素材分组 */
export function updateGroup(id: number, data: UpdateGroupParams) {
  return put<ApiResponse<null>>(`${BASE}/groups/${id}`, data as Record<string, any>)
}

/** 删除素材分组 */
export function deleteGroup(id: number) {
  return del<ApiResponse<null>>(`${BASE}/groups/${id}`)
}

// ==================== 微信同步 ====================

/** 同步素材到微信后台 */
export function syncToWechat(data: SyncToWechatParams) {
  return post<ApiResponse<null>>(`${BASE}/sync-to-wechat`, data)
}

/** 从微信后台同步素材 */
export function syncFromWechat(params?: { type?: string }) {
  return post<ApiResponse<{ synced: number }>>(`${BASE}/sync-from-wechat`, params || {})
}

// ==================== 兼容旧 API（保留原有导出别名） ====================

/** @deprecated 使用 getMaterialList 替代 */
export const getAssetList = getMaterialList
/** @deprecated 使用 createMaterial 替代 */
export const createAsset = createMaterial
/** @deprecated 使用 updateMaterial 替代 */
export const updateAsset = updateMaterial
/** @deprecated 使用 deleteMaterial 替代 */
export const deleteAsset = deleteMaterial
/** @deprecated 使用 getGroupList 替代 */
export const getAssetGroupList = getGroupList
/** @deprecated 使用 createGroup 替代 */
export const createAssetGroup = createGroup
/** @deprecated 使用 updateGroup 替代 */
export const updateAssetGroup = updateGroup
/** @deprecated 使用 deleteGroup 替代 */
export const deleteAssetGroup = deleteGroup
