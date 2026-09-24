/** 资料列表 DSL：文件类型、访问标签、列表映射（admin 预览 + vitest） */

export type MaterialAccessTag = {
  type: 'free' | 'vip' | 'planet' | 'price' | 'points'
  label: string
  price?: string
}

export type MaterialListItem = {
  id: number | string
  title: string
  fileType: string
  fileIcon: string
  fileColor: string
  metaLine: string
  sizeText: string
  downloadCount: number
  access: MaterialAccessTag
  link_url: string
}

const FILE_STYLE: Record<string, { icon: string; color: string }> = {
  pdf: { icon: 'PDF', color: '#E74C3C' },
  doc: { icon: 'W', color: '#2980B9' },
  docx: { icon: 'W', color: '#2980B9' },
  word: { icon: 'W', color: '#2980B9' },
  xls: { icon: 'X', color: '#27AE60' },
  xlsx: { icon: 'X', color: '#27AE60' },
  excel: { icon: 'X', color: '#27AE60' },
  ppt: { icon: 'P', color: '#E67E22' },
  pptx: { icon: 'P', color: '#E67E22' },
  zip: { icon: 'Z', color: '#8E44AD' },
  rar: { icon: 'Z', color: '#8E44AD' },
}

export function resolveFileVisual(fileType: unknown): { icon: string; color: string } {
  const key = String(fileType || 'file').toLowerCase().replace(/^\./, '')
  return FILE_STYLE[key] || { icon: 'F', color: '#64748B' }
}

export function formatFileSize(size: unknown): string {
  const n = Number(size)
  if (!Number.isFinite(n) || n <= 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} MB`
}

export function resolveMaterialAccess(raw: Record<string, unknown>): MaterialAccessTag {
  if (raw.canDownload === true || raw.canRead === true) {
    return { type: 'free', label: '免费' }
  }
  if (raw.boundProductId != null || raw.bound_product_id != null) {
    const price = raw.price ?? raw.productPrice
    return {
      type: 'price',
      label: price != null ? `¥${price}` : '付费',
      price: price != null ? String(price) : undefined,
    }
  }
  const dlAudience = String(raw.downloadAudience || raw.download_audience || '').toLowerCase()
  if (dlAudience.includes('planet')) {
    return { type: 'planet', label: '星球' }
  }
  const level = String(raw.minDownloadLevelName || raw.minReadLevelName || raw.min_download_level_name || '').trim()
  if (level) {
    return { type: 'vip', label: level }
  }
  const locked = String(raw.lockedReason || raw.locked_reason || '').trim()
  if (locked.includes('积分')) {
    return { type: 'points', label: '积分' }
  }
  return { type: 'price', label: '会员' }
}

export function mapMaterialRecord(raw: Record<string, unknown>, index = 0): MaterialListItem {
  const id = raw.id ?? index + 1
  const visual = resolveFileVisual(raw.fileType ?? raw.file_type ?? raw.mimeType)
  const pages = raw.pageCount ?? raw.page_count
  const countPart = pages != null && Number(pages) > 0 ? `${pages} 页` : ''
  const sizeText = formatFileSize(raw.size)
  const metaLine = [countPart, sizeText].filter(Boolean).join(' · ') || sizeText
  const downloads = Number(raw.downloadCount ?? raw.download_count ?? 0) || 0
  return {
    id: id as number | string,
    title: String(raw.name || raw.title || '资料标题'),
    fileType: String(raw.fileType || raw.file_type || 'file'),
    fileIcon: visual.icon,
    fileColor: visual.color,
    metaLine,
    sizeText,
    downloadCount: downloads,
    access: resolveMaterialAccess(raw),
    link_url: `/pages/resource-detail/resource-detail?id=${id}`,
  }
}

export function demoMaterialItems(limit = 5): MaterialListItem[] {
  const samples = [
    { name: '2026 跨境合规白皮书.pdf', fileType: 'pdf', pageCount: 48, size: 2_400_000, downloadCount: 1280, canDownload: true },
    { name: '关税测算表.xlsx', fileType: 'xlsx', size: 520_000, downloadCount: 860, minDownloadLevelName: 'VIP' },
    { name: '物流渠道对比.zip', fileType: 'zip', size: 8_100_000, downloadCount: 420, boundProductId: 1, price: '9.9' },
    { name: '星球内参 · 三月.pptx', fileType: 'pptx', pageCount: 22, size: 4_200_000, downloadCount: 96, downloadAudience: 'planet' },
    { name: '入门指南.docx', fileType: 'docx', pageCount: 12, size: 310_000, downloadCount: 2100, canRead: true },
  ]
  return samples.slice(0, limit).map((row, i) => mapMaterialRecord(row as Record<string, unknown>, i))
}
