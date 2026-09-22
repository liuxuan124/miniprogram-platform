import { ContentStatus, CONTENT_FORMAT_META, type ContentFormatType } from '@/types/content'
import { inferContentFormat } from '@/utils/content-format'

export type UiContentType = 'article' | 'note' | 'video' | 'file'

export function formatReads(n?: number | null): string {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  const v = Number(n)
  if (v >= 10000) return `${(v / 10000).toFixed(v >= 100000 ? 0 : 1)}万`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(Math.round(v))
}

export function statusTagClass(status?: string): string {
  const s = String(status || '').toLowerCase()
  if (s === ContentStatus.Published || s === 'published') return 't-live'
  if (s === ContentStatus.Draft || s === 'draft') return 't-draft'
  if (s === ContentStatus.Unpublished || s === 'unpublished') return 't-offline'
  return 't-draft'
}

export function statusLabel(status?: string): string {
  const s = String(status || '').toLowerCase()
  if (s === ContentStatus.Published || s === 'published') return '已发布'
  if (s === ContentStatus.Draft || s === 'draft') return '草稿'
  if (s === ContentStatus.Unpublished || s === 'unpublished') return '已下架'
  return s || '草稿'
}

export function typeLabel(fmt?: string): string {
  const key = String(fmt || 'article')
  if (key === 'file') return '资料'
  return CONTENT_FORMAT_META[key as ContentFormatType]?.label || '长文'
}

function attachmentCountOf(data: Record<string, unknown>): number {
  const n = Number(data.attachmentCount ?? data.attachment_count ?? 0)
  if (Number.isFinite(n) && n > 0) return n
  const list = data.attachments
  return Array.isArray(list) ? list.length : 0
}

/** Map API contentType / inferred format → UI type (长文/笔记/视频/资料) */
export function mapFormatToUi(raw: unknown): UiContentType {
  const data = (raw && typeof raw === 'object' ? raw : { contentType: raw }) as Record<string, unknown>
  const explicit = String(data.contentType || data.content_type || data.type || '').toLowerCase()
  if (explicit === 'file') return 'file'
  const fmt = inferContentFormat(data)
  if (fmt === 'video') return 'video'
  // 有附件且非长文时标为资料（动态带附件也归资料列表）
  if (attachmentCountOf(data) > 0 && fmt !== 'article' && fmt !== 'rich') return 'file'
  if (fmt === 'note') return 'note'
  if (fmt === 'moment') return 'note'
  return 'article'
}

export function readCountOf(item: Record<string, unknown>): number {
  const raw = item.viewCount ?? item.view_count ?? item.readCount ?? item.read_count ?? item.reads
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

export function unwrapList<T = Record<string, unknown>>(res: unknown): { records: T[]; total: number } {
  const data = (res as { data?: unknown })?.data ?? res ?? {}
  if (Array.isArray(data)) return { records: data as T[], total: data.length }
  const page = data as { records?: T[]; list?: T[]; total?: number }
  const records = page.records || page.list || []
  return { records, total: Number(page.total ?? records.length) }
}

export function typeIcon(ui: UiContentType): string {
  if (ui === 'note') return 'note'
  if (ui === 'video') return 'video'
  if (ui === 'file') return 'file'
  return 'doc'
}

export const TYPE_TONES = ['#f3e7d8', '#e8efe6', '#ebe4f0', '#e4eef5', '#f5e8e4', '#efe9df']

export function toneForId(id: number | string): string {
  const n = Number(id) || 0
  return TYPE_TONES[Math.abs(n) % TYPE_TONES.length]
}
