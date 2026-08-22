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
  groupId?: number
  storageKey: string
  mimeType?: string
  fileType?: string
  size?: number
  status?: string
  qualityTier?: string
  readMode?: string
  previewPercent?: number
  minReadLevelId?: number
  allowDownload?: number
  downloadAudience?: string
  minDownloadLevelId?: number
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
