import { normalizeUploadUrl } from '@/api/system'

/** 从商品对象中取出封面图 URL（兼容各字段名 + 图集首图） */
export function pickProductCoverUrl(item: Record<string, any> | null | undefined): string {
  if (!item) return ''
  const gallery = item.images
  const firstFromGallery =
    Array.isArray(gallery) && gallery.length ? String(gallery[0] || '').trim() : ''
  const raw =
    item.mainImage ||
    item.main_image ||
    item.coverUrl ||
    item.cover_url ||
    item.coverImage ||
    item.cover ||
    item.image ||
    item.pic ||
    firstFromGallery ||
    ''
  const url = String(raw || '').trim()
  return url ? normalizeUploadUrl(url) : ''
}

/** 合并已保存快照与接口最新数据，封面优先取有值的一方 */
export function mergeProductRecord(
  saved: Record<string, any> | null | undefined,
  fresh: Record<string, any> | null | undefined,
): Record<string, any> | null {
  if (!saved && !fresh) return null
  const merged = { ...(saved || {}), ...(fresh || {}) }
  const cover = pickProductCoverUrl(fresh) || pickProductCoverUrl(saved)
  if (cover) merged.image = cover
  const main = fresh?.mainImage || fresh?.main_image || saved?.mainImage || saved?.main_image || ''
  if (main) {
    merged.mainImage = main
    merged.main_image = main
  }
  if (!Array.isArray(merged.images) || !merged.images.length) {
    const imgs = fresh?.images?.length ? fresh.images : saved?.images
    if (Array.isArray(imgs) && imgs.length) merged.images = imgs
  }
  merged.name = fresh?.name || fresh?.title || saved?.name || saved?.title || merged.name
  if (fresh?.price != null && fresh?.price !== '') merged.price = fresh.price
  if (fresh?.sales != null) merged.sales = fresh.sales
  return merged
}

export function orderProductsByIds(ids: string[], ...sources: Array<Array<Record<string, any>>>) {
  const map = new Map<string, Record<string, any>>()
  for (const list of sources) {
    for (const item of list) {
      if (item?.id == null || item.id === '') continue
      const id = String(item.id)
      map.set(id, mergeProductRecord(map.get(id), item) as Record<string, any>)
    }
  }
  if (ids.length) return ids.map((id) => map.get(id)).filter(Boolean) as Record<string, any>[]
  return Array.from(map.values())
}
