/** 图片加载失败时的占位（与 public/images/default-avatar.svg 一致） */
export const FALLBACK_AVATAR = '/images/default-avatar.svg'

export function onImgError(e: Event) {
  const el = e.target as HTMLImageElement | null
  if (!el || el.dataset.fallbackApplied === '1') return
  el.dataset.fallbackApplied = '1'
  el.src = FALLBACK_AVATAR
}
