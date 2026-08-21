import { resolveMediaUrl } from '@/utils/media-url'

export type ContentPreviewType = 'article' | 'note'

export interface ContentPreviewModel {
  title?: string
  contentType?: ContentPreviewType
  contentHtml?: string
  noteBody?: string
  coverImage?: string
  images?: string[]
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
  const contentType = (data.contentType || data.content_type || 'article') === 'note' ? 'note' : 'article'
  const coverImage = String(data.coverImage || data.cover_image || '')
  const images = Array.isArray(data.images) ? data.images.map(String) : coverImage ? [coverImage] : []
  const contentHtml = String(data.content || '')
  return {
    title: String(data.title || ''),
    contentType,
    contentHtml,
    noteBody: contentType === 'note' ? getPlainTextFromHtml(contentHtml) : '',
    coverImage,
    images,
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
