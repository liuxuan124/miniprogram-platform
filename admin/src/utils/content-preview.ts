import { resolveMediaUrl } from '@/utils/media-url'
import { inferPreviewType } from '@/utils/content-format'
import {
  buildNoteGalleryUrls,
  extractImagesFromHtml,
  extractNoteParagraphs,
  filterNoteDisplayTags,
  noteHashTags,
} from '@/utils/note-content'

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
  tags?: string[]
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
  const contentType = inferPreviewType(data)
  const coverImage = String(data.coverImage || data.cover_image || '')
  const contentHtml = String(data.content || '')
  const rawImages = Array.isArray(data.images) ? data.images.map(String) : []
  const htmlImages =
    (contentType === 'note' || contentType === 'moment') && rawImages.length === 0
      ? extractImagesFromHtml(contentHtml)
      : []
  const images = rawImages.length > 0
    ? buildNoteGalleryUrls('', rawImages)
    : buildNoteGalleryUrls(coverImage, htmlImages)
  const tags = Array.isArray(data.tags) ? data.tags.map(String) : []
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
    noteBody: contentType === 'note' || contentType === 'moment' ? extractNoteParagraphs(contentHtml).join('\n\n') : '',
    coverImage: images[0] || coverImage,
    images,
    tags,
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
