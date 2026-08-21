/**
 * 将素材/上传 URL 解析为浏览器可访问的绝对地址。
 * 上传文件由后端 /uploads/** 提供，需走 API 域名（或经 Nginx 代理的同源 /uploads/）。
 */
function getApiOrigin(): string {
  const target = (import.meta.env.VITE_API_TARGET as string | undefined)?.trim()
  if (target) return target.replace(/\/+$/, '')
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (base) return base.replace(/\/+$/, '')
  return window.location.origin.replace(/\/+$/, '')
}

/** @deprecated 请使用 resolveMediaUrl */
export function normalizeUploadUrl(url: string): string {
  return resolveMediaUrl(url)
}

export function resolveMediaUrl(url?: string): string {
  const value = String(url || '').trim()
  if (!value) return ''
  if (/^data:/i.test(value)) return value

  const apiOrigin = getApiOrigin()

  const rewriteUpload = value.match(
    /^https?:\/\/(?:localhost|127\.0\.0\.1|\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?(\/uploads\/.+)$/i,
  )
  if (rewriteUpload) return apiOrigin + rewriteUpload[1]

  const crossOriginUpload = value.match(/^https?:\/\/[^/]+(\/uploads\/.+)$/i)
  if (crossOriginUpload) return apiOrigin + crossOriginUpload[1]

  if (/^https?:\/\//i.test(value)) return value

  const path = value.startsWith('/') ? value : `/${value}`
  if (path.startsWith('/uploads/')) return apiOrigin + path

  return `${window.location.origin.replace(/\/+$/, '')}${path}`
}
