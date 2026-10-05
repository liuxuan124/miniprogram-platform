import { del, get, post, put } from './request'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/files'

export interface FileGroupItem {
  id: number
  name: string
  sortOrder?: number
  count?: number
}

export interface FileItemRecord {
  id: number
  name: string
  summary?: string
  iconUrl?: string
  groupId?: number
  groupName?: string
  storageKey?: string
  mimeType?: string
  fileType?: string
  size?: number
  status?: string
  qualityTier?: string
  readMode?: string
  previewPercent?: number
  previewMode?: string
  previewValue?: number
  pageCount?: number
  allowForward?: number
  watermark?: number
  minReadLevelId?: number
  minReadLevelName?: string
  allowDownload?: number
  downloadAudience?: string
  minDownloadLevelId?: number
  minDownloadLevelName?: string
  createTime?: string
  updateTime?: string
}

export interface FileItemPayload {
  name: string
  summary?: string
  iconUrl?: string
  groupId?: number
  storageKey: string
  mimeType?: string
  fileType?: string
  size?: number
  status?: string
  qualityTier?: string
  readMode?: string
  previewPercent?: number
  previewMode?: string
  previewValue?: number
  pageCount?: number
  allowForward?: number
  watermark?: number
  minReadLevelId?: number
  allowDownload?: number
  downloadAudience?: string
  minDownloadLevelId?: number
  boundProductId?: number | null
}

export function getFileList(params?: Record<string, unknown>) {
  return get<PageResult<FileItemRecord>>(BASE_URL, params)
}

export function getFileDetail(id: number) {
  return get<FileItemRecord>(`${BASE_URL}/${id}`)
}

export function createFile(data: FileItemPayload) {
  return post<FileItemRecord>(BASE_URL, data)
}

export function updateFile(id: number, data: FileItemPayload) {
  return put<FileItemRecord>(`${BASE_URL}/${id}`, data)
}

export function deleteFile(id: number) {
  return del<void>(`${BASE_URL}/${id}`)
}

/** 回收站列表（后端软删 deleted=1 的文件） */
export function getDeletedFileList(params?: Record<string, unknown>) {
  return get<PageResult<FileItemRecord>>(`${BASE_URL}/deleted`, params)
}

/** 从回收站恢复 */
export function restoreFile(id: number) {
  return post<FileItemRecord>(`${BASE_URL}/${id}/restore`)
}

export function uploadFileItem(file: File, data: Partial<FileItemPayload> = {}) {
  const form = new FormData()
  form.append('file', file)
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      form.append(key, String(value))
    }
  })
  return post<FileItemRecord>(`${BASE_URL}/upload`, form)
}

export function getFileGroups() {
  return get<FileGroupItem[]>(`${BASE_URL}/groups`)
}

export function createFileGroup(data: { name: string; sortOrder?: number }) {
  return post<FileGroupItem>(`${BASE_URL}/groups`, data)
}

export function updateFileGroup(id: number, data: { name: string; sortOrder?: number }) {
  return put<FileGroupItem>(`${BASE_URL}/groups/${id}`, data)
}

export function deleteFileGroup(id: number) {
  return del<void>(`${BASE_URL}/groups/${id}`)
}

/** 端上效果预览·单页位图（服务端真实渲染，带「试读」水印） */
export interface FilePreviewPage {
  pageNo: number
  totalPages: number
  pageLabel: string
  imageUrl: string
  width: number
  height: number
}

/**
 * 端上效果实时预览：按 freePages（非会员可见页数）渲染真实页面位图。
 * 非 PDF / 文件不存在时后端返回空数组或错误。
 */
export function getFilePreviewImages(id: number, freePages?: number) {
  return get<FilePreviewPage[]>(`${BASE_URL}/${id}/preview-images`, freePages != null ? { freePages } : undefined)
}
