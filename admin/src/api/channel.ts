/**
 * 渠道分享归因 API（/api/v1/admin/channel）
 * 链路：后台建渠道 → 拿到渠道码 → 带进分享链接/小程序码 scene（ch=KEY）
 *      → 小程序启动解析并缓存 channelId → 下单写入 mp_order.channel_id → 报表聚合
 */
import { get, post, del } from './request'

const BASE = '/api/v1/admin/channel'

export interface ChannelRecord {
  id?: number
  /** 渠道码（短码，大写；新建留空由后端自动生成 6 位） */
  channelKey?: string
  channelName?: string
  channelType?: string
  contact?: string
  /** 佣金比例 0~1，前端按百分比展示 */
  commissionRate?: number | string
  status?: number
  remark?: string
  createTime?: string
  updateTime?: string
}

export interface ChannelReportRow {
  channelId?: number
  channelKey?: string
  channelName?: string
  channelType?: string
  orderCount?: number
  gmv?: number
  paidGmv?: number
  commission?: number
}

/** 渠道列表（status 不传=全部） */
export function listChannels(status?: number) {
  return get<ChannelRecord[]>(BASE, status === undefined ? undefined : { status })
}

/** 新增/更新渠道（有 id 为更新） */
export function saveChannel(data: Partial<ChannelRecord>) {
  return post<ChannelRecord>(BASE, data as Record<string, unknown>)
}

/** 删除渠道 */
export function deleteChannel(id: number) {
  return del<void>(`${BASE}/${id}`)
}

/** 渠道归因报表（from/to 为 LocalDateTime 字符串，如 2026-10-01T00:00:00） */
export function getChannelReport(params?: { from?: string; to?: string; channelId?: number }) {
  return get<ChannelReportRow[]>(`${BASE}/report`, params as Record<string, unknown>)
}
