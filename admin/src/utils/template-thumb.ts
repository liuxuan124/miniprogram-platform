import type { PageDSL, ReleaseRecord } from '@/types/page'

/** 整店模板：预置封面（public 静态资源） */
const STORE_THUMB_BY_CODE: Record<string, string> = {
  warm: '/section-bar-tech-bg.jpg',
  content_ip: '/kuajing-motaibai-header.png',
  lite: '/images/nav-icons/_preview-gradient-set-final.png',
  knowledge_pay: '/images/nav-icons/g-knowledge.png',
  local_life: '/images/nav-icons/g-industry.png',
  retail: '/images/nav-icons/g-bag.png',
  edu: '/images/nav-icons/g-content.png',
}

const NAME_KEYWORD_THUMB: Array<{ test: RegExp; src: string }> = [
  { test: /暖阁|warm/i, src: '/section-bar-tech-bg.jpg' },
  { test: /服装|服饰|clothing/i, src: '/images/nav-icons/g-bag.png' },
  { test: /食品|饮料|food/i, src: '/images/nav-icons/g-hot.png' },
  { test: /数码|家电|digital/i, src: '/images/nav-icons/g-insight.png' },
  { test: /美妆|beauty/i, src: '/images/nav-icons/g-favorite.png' },
  { test: /教育|选课|edu/i, src: '/images/nav-icons/g-content.png' },
  { test: /本地|到店|local/i, src: '/images/nav-icons/g-industry.png' },
  { test: /知识|创作者|IP/i, src: '/images/nav-icons/g-knowledge.png' },
  { test: /现代零售|零售|商城/i, src: '/images/nav-icons/_preview-gradient-set-extended.png' },
  { test: /轻量|lite/i, src: '/images/nav-icons/_preview-gradient-set-final.png' },
]

const DEFAULT_STORE_THUMB = '/images/nav-icons/_preview-gradient-set-final.png'

function parseMaybeJson<T>(raw: unknown): T | null {
  if (!raw) return null
  if (typeof raw === 'object') return raw as T
  try {
    return JSON.parse(String(raw)) as T
  } catch {
    return null
  }
}

function normalizeAssetUrl(url: string): string {
  const s = String(url || '').trim()
  if (!s) return ''
  if (/^(https?:|\/|data:image)/i.test(s)) return s
  return `/${s.replace(/^\//, '')}`
}

/** 从页面 DSL 取第一张可用图（banner / image / 品牌头图） */
export function extractFirstVisualFromDsl(dsl: PageDSL | null | undefined): string {
  if (!dsl?.components?.length) return ''
  for (const comp of dsl.components) {
    const props = (comp as any).props || {}
    if (comp.type === 'banner' && Array.isArray(props.images)) {
      for (const img of props.images) {
        const u = normalizeAssetUrl(img?.url || img?.src || img?.image || '')
        if (u) return u
      }
    }
    if (comp.type === 'image') {
      const u = normalizeAssetUrl(props.src || props.url || props.image || '')
      if (u) return u
    }
    if (comp.type === 'brand_header') {
      const u = normalizeAssetUrl(props.logo || props.logo_url || props.cover || '')
      if (u) return u
    }
  }
  return ''
}

export function storeTemplateThumbUrl(item: ReleaseRecord): string {
  const code = String((item as any).templateCode || (item as any).seed || '').toLowerCase()
  if (STORE_THUMB_BY_CODE[code]) return STORE_THUMB_BY_CODE[code]

  const snap = parseMaybeJson<{ pages?: Array<{ dslContent?: string }> }>((item as any).snapshot)
  if (snap?.pages?.length) {
    for (const p of snap.pages) {
      const dsl = parseMaybeJson<PageDSL>(p.dslContent)
      const fromDsl = extractFirstVisualFromDsl(dsl)
      if (fromDsl) return fromDsl
    }
  }

  const name = String((item as any).templateName || item.releaseNotes || '')
  for (const row of NAME_KEYWORD_THUMB) {
    if (row.test.test(name)) return row.src
  }
  return DEFAULT_STORE_THUMB
}

export function pageTemplateThumbUrl(tpl: Record<string, unknown>): string {
  const cover = String(tpl.cover_image || tpl.coverImage || '').trim()
  if (cover) return normalizeAssetUrl(cover)

  const dsl = parseMaybeJson<PageDSL>(
    typeof tpl.dslContent === 'string' ? tpl.dslContent : tpl.dsl || tpl.dsl_content,
  )
  const fromDsl = extractFirstVisualFromDsl(dsl)
  if (fromDsl) return fromDsl

  const name = String(tpl.name || tpl.title || '')
  for (const row of NAME_KEYWORD_THUMB) {
    if (row.test.test(name)) return row.src
  }
  return '/images/nav-icons/g-platform.png'
}
