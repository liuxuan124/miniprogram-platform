import { get } from './request'

export interface WarmPlanetBrief {
  planetId?: string
  title?: string
  members?: string
  cta?: string
  items?: Array<{ tag?: string; text?: string }>
  emoji?: string
  cover?: string
  subtitle?: string
  joined?: boolean
  primary?: boolean
  introUrl?: string
  feedUrl?: string
}

/** 与 backend WarmHomeVO 对齐 */
export interface WarmHomeApiPayload {
  greetTemplate?: string
  streakDays?: number
  todayCount?: number
  navs?: Array<Record<string, unknown>>
  authors?: Array<Record<string, unknown>>
  segs?: Array<Record<string, unknown>>
  feature?: Record<string, unknown> | null
  columns?: Array<Record<string, unknown>>
  planet?: WarmPlanetBrief | null
  /** 多星球推荐卡（2026-10-04） */
  planets?: WarmPlanetBrief[]
  primaryPlanetId?: string
  /** true = 用户已设主星球，星球区只展示它 */
  primaryOnly?: boolean
  feed?: Array<Record<string, unknown>>
  vipBar?: Record<string, unknown> | null
}

export function fetchWarmHomeAggregate() {
  return get<WarmHomeApiPayload>('/api/v1/mp/home/warm', undefined, { showError: false })
}
