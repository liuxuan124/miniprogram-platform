import type { WarmHomeApiPayload } from '@/api/warmHome'

export type WarmPreviewView = {
  statusBarHeight: number
  greetTitle: string
  userAvatar: string
  brandName: string
  isLoggedIn: boolean
  isPlatformMember: boolean
  memberLevelName: string
  memberBadgeLabel: string
  streakDays: number
  todayCount: number
  noticeDot: boolean
  vipBar: Record<string, unknown> | null
  navs: Array<Record<string, unknown>>
  authors: Array<Record<string, unknown>>
  feature: Record<string, unknown> | null
  columns: Array<Record<string, unknown>>
  planet: Record<string, unknown>
  /** 多星球推荐卡（2026-10-04） */
  planets: Array<Record<string, unknown>>
  primaryPlanetId: string
  /** true = 用户已设主星球，预览只展示它 */
  primaryOnly: boolean
  segs: Array<Record<string, unknown>>
  feed: Array<Record<string, unknown>>
  feedAll: Array<Record<string, unknown>>
  activeSeg: string
  loading: boolean
  loadError: boolean
}

function mapFeature(f: Record<string, unknown> | null | undefined) {
  if (!f || !f.contentId) return null
  const contentId = f.contentId
  return {
    contentId,
    tag: f.tag || '今日精选',
    title: f.title || '',
    cover: f.cover || '',
    meta: Array.isArray(f.meta) ? f.meta : [],
    contentType: f.contentType || 'article',
    url: `/pkg-content/content-detail/content-detail?id=${contentId}`,
  }
}

function mapColumn(c: Record<string, unknown>) {
  const productId = c.productId
  return {
    id: productId,
    productId,
    title: c.title || '',
    cover: c.cover || '',
    badge: c.badge || '',
    badgeGold: !!c.badgeGold,
    desc: c.desc || '',
    price: c.price ? `¥${String(c.price).replace(/^[¥￥]/, '')}` : '',
    origin: c.origin ? `¥${String(c.origin).replace(/^[¥￥]/, '')}` : '',
    url: productId ? `/pkg-content/product-detail/product-detail?id=${productId}` : '',
  }
}

function mapFeedItem(f: Record<string, unknown>) {
  const id = f.contentId
  const isMoment = f.seg === 'qa' || f.contentType === 'moment'
  const images = Array.isArray(f.images) ? f.images.filter(Boolean) : []
  const summary = f.summary && f.summary !== f.title ? f.summary : (f.summary || '')
  return {
    id,
    contentId: id,
    seg: f.seg || 'article',
    type: f.type || 'post',
    title: f.title || '',
    summary,
    tag: f.tag || '',
    tagGold: !!f.tagGold,
    meta: f.meta || '',
    cover: f.cover || '',
    images,
    contentType: f.contentType || 'article',
    url: id
      ? (isMoment
        ? `/pkg-content/moment-detail/moment-detail?id=${id}`
        : `/pkg-content/content-detail/content-detail?id=${id}`)
      : '',
  }
}

function filterFeedBySeg(feed: Array<Record<string, unknown>>, key: string) {
  if (!key || key === 'rec') return feed
  return feed.filter((i) => i.seg === key)
}

export function buildWarmPreviewView(
  data: WarmHomeApiPayload | null | undefined,
  opts: { greetTemplate?: string; loading?: boolean; loadError?: boolean } = {},
): WarmPreviewView {
  const feedAll = (data?.feed || []).map((f) => mapFeedItem(f))
  const segs = (data?.segs || []).map((s, i) => {
    const row = s as Record<string, unknown>
    return {
      ...row,
      on: row.on != null
        ? !!row.on
        : (row.key === 'rec' || (!(data?.segs || []).some((x) => (x as Record<string, unknown>).on) && i === 0)),
    }
  })
  const activeRow = segs.find((s) => s.on) || segs[0] || { key: 'rec' }
  const activeSeg = String((activeRow as Record<string, unknown>).key || 'rec')
  const vipBar = (data?.vipBar && typeof data.vipBar === 'object')
    ? (data.vipBar as Record<string, unknown>)
    : null
  return {
    statusBarHeight: 44,
    greetTitle: opts.greetTemplate || data?.greetTemplate || '你好',
    userAvatar: '',
    brandName: '',
    isLoggedIn: false,
    isPlatformMember: false,
    memberLevelName: '',
    memberBadgeLabel: '',
    streakDays: Number(data?.streakDays) || 0,
    todayCount: Number(data?.todayCount) || 0,
    noticeDot: false,
    vipBar,
    navs: (data?.navs || []).map((n) => ({
      ...n,
      label: (n.label === '内容列表' || n.label === '知识库') ? '长文' : (n.label || ''),
    })),
    authors: data?.authors || [],
    feature: mapFeature(data?.feature || null),
    columns: (data?.columns || []).map(mapColumn),
    planet: (data?.planet || { title: '', members: '', items: [], cta: '' }) as unknown as Record<string, unknown>,
    planets: (Array.isArray(data?.planets) && data.planets.length
      ? data.planets
      : (data?.planet ? [data.planet] : [{ planetId: 'warm-main' }])) as unknown as Array<Record<string, unknown>>,
    primaryPlanetId: String(data?.primaryPlanetId || (data?.planet as any)?.planetId || ''),
    primaryOnly: !!data?.primaryOnly,
    segs,
    feedAll,
    feed: filterFeedBySeg(feedAll, activeSeg),
    activeSeg,
    loading: !!opts.loading,
    loadError: !!opts.loadError,
  }
}

function normalizeNavRow(n: Record<string, unknown>, index: number) {
  return {
    ...n,
    key: String(n.key || `nav_${index}`),
    icon: String(n.icon || ''),
    label: String(n.label || ''),
    url: String(n.url || ''),
    tab: !!(n.tab as boolean),
  }
}

export function mergeGreetFromBlocks(
  view: WarmPreviewView,
  components: Array<{ type?: string; props?: Record<string, unknown> }>,
): WarmPreviewView {
  const greetBlock = components.find((c) => c.type === 'warm_greet')
  const props = greetBlock?.props || {}
  let next = view
  const tpl = props.greet_template || props.greetTemplate
  if (typeof tpl === 'string' && tpl.trim()) {
    next = { ...next, greetTitle: tpl.trim() }
  }
  const blockNavs = props.navs
  if (Array.isArray(blockNavs) && blockNavs.length) {
    next = {
      ...next,
      navs: blockNavs.map((n, i) => normalizeNavRow(n as Record<string, unknown>, i)),
    }
  } else if (!next.navs?.length) {
    next = { ...next, navs: [] }
  }
  return next
}
