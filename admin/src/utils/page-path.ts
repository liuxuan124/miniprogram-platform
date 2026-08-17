/**
 * 页面访问路径：固定前缀 + 可编辑后缀
 */
export function normalizeBuilderPath(raw: string): string {
  const value = String(raw || '').trim()
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

/** 1=首页 2=专题 3=自定义 */
export function pathPrefixByType(type: number | string): string {
  const t = Number(type)
  if (t === 1) return '/pages/index/'
  if (t === 2) return '/pages/activity/'
  return '/pages/custom/'
}

export function isHomePathLocked(type: number | string): boolean {
  return Number(type) === 1
}

export function splitEditablePath(
  path: string,
  type: number | string,
): { prefix: string; slug: string; locked: boolean } {
  const normalized = normalizeBuilderPath(path)
  if (isHomePathLocked(type)) {
    return { prefix: '/pages/index/index', slug: '', locked: true }
  }
  const prefix = pathPrefixByType(type)
  if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
    return { prefix, slug: normalized.slice(prefix.length), locked: false }
  }
  // 历史脏路径：尽量拆出最后一段
  const parts = normalized.split('/').filter(Boolean)
  const last = parts[parts.length - 1] || ''
  return { prefix, slug: last, locked: false }
}

export function joinEditablePath(prefix: string, slug: string, type: number | string): string {
  if (isHomePathLocked(type)) return '/pages/index/index'
  const cleanSlug = String(slug || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  if (!cleanSlug) return normalizeBuilderPath(prefix.replace(/\/$/, ''))
  return normalizeBuilderPath(`${prefix}${cleanSlug}`)
}

export function validatePathSlug(slug: string, type: number | string): string | null {
  if (isHomePathLocked(type)) return null
  const s = String(slug || '').trim()
  if (!s) return '请填写路径后缀'
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return '后缀仅支持字母、数字、下划线和短横线'
  if (/^index-\d+$/i.test(s)) return '不能使用 index-数字 这类小程序无法打开的路径'
  return null
}
