/**
 * 素材库类型定义
 * 参考微盟素材库系统设计
 */

/** 素材类型枚举 */
export enum MaterialType {
  Image = 'image',
  Video = 'video',
  Audio = 'audio',
  RichText = 'richtext',
}

/** 素材类型标签映射 */
export const MaterialTypeLabels: Record<MaterialType, string> = {
  [MaterialType.Image]: '图片',
  [MaterialType.Video]: '视频',
  [MaterialType.Audio]: '音频',
  [MaterialType.RichText]: '图文',
}

/** 素材类型标签颜色 */
export const MaterialTypeColors: Record<MaterialType, string> = {
  [MaterialType.Image]: '#2469f0',
  [MaterialType.Video]: '#7c3aed',
  [MaterialType.Audio]: '#f59e0b',
  [MaterialType.RichText]: '#10b981',
}

/** 素材类型图标映射 */
export const MaterialTypeIcons: Record<MaterialType, string> = {
  [MaterialType.Image]: 'Picture',
  [MaterialType.Video]: 'VideoCamera',
  [MaterialType.Audio]: 'Headset',
  [MaterialType.RichText]: 'Document',
}

/** 素材同步状态 */
export enum SyncStatus {
  NotSynced = 0,
  Syncing = 1,
  Synced = 2,
  Failed = 3,
}

export const SyncStatusLabels: Record<SyncStatus, string> = {
  [SyncStatus.NotSynced]: '未同步',
  [SyncStatus.Syncing]: '同步中',
  [SyncStatus.Synced]: '已同步',
  [SyncStatus.Failed]: '同步失败',
}

/** 素材分组/分类 */
export interface MaterialGroup {
  id: number
  name: string
  sortOrder?: number
  parentId?: number
  count?: number
  createdAt?: string
  updatedAt?: string
}

/** 图文素材正文结构 */
export interface RichTextContent {
  html?: string
  text?: string
  coverUrl?: string
  summary?: string
  author?: string
}

/** 素材记录 */
export interface MaterialRecord {
  id: number
  name: string
  type: MaterialType
  url: string
  thumbUrl?: string
  size?: number
  width?: number
  height?: number
  duration?: number
  format?: string
  groupId?: number | null
  groupName?: string
  richTextContent?: RichTextContent
  syncStatus?: SyncStatus
  syncedAt?: string
  tags?: string[]
  description?: string
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

/** 创建素材参数 */
export interface CreateMaterialParams {
  name: string
  type: MaterialType
  url: string
  thumbUrl?: string
  size?: number
  width?: number
  height?: number
  duration?: number
  format?: string
  groupId?: number | null
  richTextContent?: RichTextContent
  description?: string
  tags?: string[]
}

/** 更新素材参数 */
export interface UpdateMaterialParams {
  name?: string
  groupId?: number | null
  description?: string
  tags?: string[]
  richTextContent?: RichTextContent
}

/** 素材查询参数 */
export interface MaterialQueryParams {
  current?: number
  size?: number
  type?: MaterialType | ''
  keyword?: string
  groupId?: number | string
  syncStatus?: SyncStatus
  sortBy?: 'createdAt' | 'name' | 'size'
  sortOrder?: 'asc' | 'desc'
}

/** 创建分组参数 */
export interface CreateGroupParams {
  name: string
  sortOrder?: number
  parentId?: number
}

/** 更新分组参数 */
export interface UpdateGroupParams {
  name?: string
  sortOrder?: number
}

/** 批量操作参数 */
export interface BatchOperationParams {
  ids: number[]
  groupId?: number | null
}

/** 微信同步参数 */
export interface SyncToWechatParams {
  ids: number[]
}
