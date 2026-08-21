import { resolveMediaUrl } from '@/utils/media-url'

export type ContentPreviewType = 'article' | 'note' | 'moment'

export interface ContentPreviewAttachment {
  id?: string
  name?: string
  url?: string
  size?: number
  mimeType?: string
  fileType?: string
}

export interface ContentPreviewModel {
  title?: string
  contentType?: ContentPreviewType
  contentHtml?: string
  noteBody?: string
  coverImage?: string
  images?: string[]
  attachments?: ContentPreviewAttachment[]
  attachmentCount?: number
  author?: string
  authorAvatar?: string
  categoryLabel?: string
}

export function getPlainTextFromHtml(html: string): string {
  if (typeof document === 'undefined') return String(html || '').replace(/<[^>]+>/g, '').trim()
  const div = document.createElement('div')
  div.innerHTML = html || ''
  return (div.innerText || '').trim()
}

export function normalizePreviewMediaUrl(raw?: string): string {
  const value = String(raw || '').trim()
  return value ? resolveMediaUrl(value) : ''
}

export function buildPreviewFromDetail(data: Record<string, unknown>, categoryLabel = ''): ContentPreviewModel {
  const rawType = String(data.contentType || data.content_type || 'article')
  const contentType: ContentPreviewType = rawType === 'note' ? 'note' : rawType === 'moment' ? 'moment' : 'article'
  const coverImage = String(data.coverImage || data.cover_image || '')
  const images = Array.isArray(data.images) ? data.images.map(String) : coverImage ? [coverImage] : []
  const contentHtml = String(data.content || '')
  const attachments = Array.isArray(data.attachments)
    ? data.attachments.map((item, idx) => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id || ''),
          name: String(row.name || ''),
          url: String(row.url || ''),
          size: Number(row.size || 0),
          mimeType: String(row.mimeType || ''),
          fileType: String(row.fileType || 'other'),
          sortOrder: Number(row.sortOrder ?? idx),
        }
      })
    : []
  const attachmentCount = Number(data.attachmentCount ?? data.attachment_count ?? attachments.length)
  return {
    title: String(data.title || ''),
    contentType,
    contentHtml,
    noteBody: contentType === 'note' || contentType === 'moment' ? getPlainTextFromHtml(contentHtml) : '',
    coverImage,
    images,
    attachments,
    attachmentCount,
    author: String(data.author || ''),
    authorAvatar: String(data.authorAvatar || data.author_avatar || ''),
    categoryLabel,
  }
}

export function formatPreviewDateLabel(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${m}-${day}`
}
