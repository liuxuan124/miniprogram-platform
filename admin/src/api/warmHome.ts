import { get } from './request'

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
  planet?: Record<string, unknown> | null
  feed?: Array<Record<string, unknown>>
}

export function fetchWarmHomeAggregate() {
  return get<WarmHomeApiPayload>('/api/v1/mp/home/warm', undefined, { showError: false })
}
