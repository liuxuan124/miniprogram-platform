/** 运营中心 › 通知中心 API */

import { get, post, put } from '@/api/request'

export type NoticeAudience = 'all' | 'segment' | 'member' | 'recent'

export interface NoticeCampaignItem {
  id: number
  title: string
  content: string
  link?: string
  audience: NoticeAudience
  targetCount: number
  sentCount: number
  readCount: number
  status: string
  createTime?: string
  sentTime?: string
}

export interface NoticeSceneItem {
  scene: string
  label: string
  enabled: boolean
  sortNo: number
}

export interface NoticeStats {
  campaigns: number
  manualSent: number
  unread: number
}

export interface BroadcastPayload {
  title: string
  content: string
  link?: string
  audience: NoticeAudience
  segmentId?: number | null
}

export function getNoticeStats() {
  return get<NoticeStats>('/api/v1/admin/ops/notifications/stats')
}

export function listNoticeCampaigns(params: { current?: number; size?: number; status?: string } = {}) {
  return get<{ total: number; records: NoticeCampaignItem[] }>('/api/v1/admin/ops/notifications/campaigns', params)
}

export function broadcastNotice(payload: BroadcastPayload) {
  return post<{ campaignId: number; targetCount: number; sentCount: number }>(
    '/api/v1/admin/ops/notifications/broadcast',
    payload as unknown as Record<string, unknown>,
  )
}

export function listNoticeScenes() {
  return get<NoticeSceneItem[]>('/api/v1/admin/ops/notifications/scenes')
}

export function updateNoticeScene(scene: string, enabled: boolean) {
  return put<void>(`/api/v1/admin/ops/notifications/scenes/${encodeURIComponent(scene)}`, undefined, {
    params: { enabled: enabled ? 'true' : 'false' },
  })
}
