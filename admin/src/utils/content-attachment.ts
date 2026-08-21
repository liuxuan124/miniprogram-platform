import { uploadFile } from '@/api/system'
import { normalizeUploadUrl } from '@/api/system'

export interface ContentAttachment {
  id: string
  name: string
  url: string
  size: number
  mimeType: string
  fileType: string
  sortOrder: number
}

const FILE_TYPE_MAP: Record<string, string> = {
  pdf: 'pdf',
  doc: 'doc',
  docx: 'doc',
  xls: 'xls',
  xlsx: 'xls',
  ppt: 'ppt',
  pptx: 'ppt',
  zip: 'zip',
  rar: 'zip',
  txt: 'txt',
  md: 'txt',
  csv: 'xls',
}

export function detectFileType(filename: string, mimeType = ''): string {
  const ext = String(filename || '').split('.').pop()?.toLowerCase() || ''
  if (FILE_TYPE_MAP[ext]) return FILE_TYPE_MAP[ext]
  if (mimeType.includes('pdf')) return 'pdf'
  if (mimeType.includes('word')) return 'doc'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'xls'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'ppt'
  if (mimeType.includes('zip')) return 'zip'
  return 'other'
}

export function formatFileSize(size: number): string {
  const n = Number(size) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function fileTypeIcon(fileType: string): string {
  const map: Record<string, string> = {
    pdf: '📄',
    doc: '📝',
    xls: '📊',
    ppt: '📽️',
    zip: '🗂️',
    txt: '📃',
    other: '📎',
  }
  return map[fileType] || map.other
}

export function createAttachmentId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeAttachment(raw: Record<string, unknown>, index = 0): ContentAttachment {
  const name = String(raw.name || raw.fileName || '未命名文件')
  const url = normalizeUploadUrl(String(raw.url || ''))
  const mimeType = String(raw.mimeType || raw.contentType || '')
  return {
    id: String(raw.id || createAttachmentId()),
    name,
    url,
    size: Number(raw.size || raw.fileSize || 0),
    mimeType,
    fileType: String(raw.fileType || detectFileType(name, mimeType)),
    sortOrder: Number(raw.sortOrder ?? index),
  }
}

export async function uploadAttachmentFile(file: File, maxSizeMB = 20): Promise<ContentAttachment | null> {
  const maxSize = maxSizeMB * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error(`文件大小不能超过 ${maxSizeMB}MB`)
  }
  const res = await uploadFile(file)
  const data = (res as any).data || {}
  const url = normalizeUploadUrl(String(data.url || ''))
  if (!url) return null
  return {
    id: createAttachmentId(),
    name: file.name,
    url,
    size: file.size,
    mimeType: file.type || String(data.contentType || ''),
    fileType: detectFileType(file.name, file.type),
    sortOrder: 0,
  }
}
