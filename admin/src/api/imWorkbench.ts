/** 客服 IM 工作台 API */

import { get, post, put, del } from '@/api/request'

export type ImMsgType = 'text' | 'image' | 'product_card' | 'logistics_card' | 'system_event'
export type ImStatus = 'waiting' | 'active' | 'closed'

export interface ImConversation {
  id: number
  userId?: number
  agentId?: number
  agentName?: string
  status: ImStatus
  statusLabel: string
  source: string
  sourceLabel: string
  sourceRef?: string
  lastMessageType?: ImMsgType
  lastMessageText?: string
  lastMessageAt?: string
  userUnread: number
  agentUnread: number
  pinned: boolean
  nickname?: string
  avatar?: string
  phone?: string
  memberLabel?: string
  createTime?: string
  updateTime?: string
}

export interface ImProductCard {
  id: number
  title: string
  coverUrl: string
  price: string
  originalPrice?: string
  stock: number
  sales?: number
  productType?: string
  available: boolean
  linkPath: string
}

export interface ImLogisticsCard {
  orderId: number
  orderNo: string
  expressName: string
  trackingNo: string
  status: string
  virtual: boolean
  latestTrack: string
  updateTime?: string
  trackCount?: number
  linkPath: string
  tracks: Array<{ time: string; context: string }>
}

export interface ImMessage {
  id: number
  conversationId: number
  seq: number
  senderRole: 'user' | 'agent' | 'system'
  senderName?: string
  msgType: ImMsgType
  text?: string
  payload?: Record<string, any> | null
  readByUser: boolean
  readByAgent: boolean
  createTime?: string
}

export interface ImCannedReply {
  id: number
  groupCode: string
  groupLabel: string
  title: string
  content: string
  builtin: boolean
  sortNo: number
}

export interface ImAgent {
  agentId: number
  agentName?: string
  state: 'online' | 'busy' | 'offline'
  activeCount: number
  online: boolean
  lastSeenAt?: string
}

export interface ImCustomer {
  id: number
  nickname?: string
  avatar?: string
  phone?: string
  memberLabel?: string
  memberExpireAt?: string
  registerDays?: number
  orderCount?: number
  totalPaid?: string
  avgPaid?: string
  lastOrderAt?: string
}

export interface ImUserOrder {
  id: number
  orderNo: string
  status: string
  statusLabel: string
  payAmount: string
  logisticsCompany?: string
  logisticsNo?: string
  shippedAt?: string
  createTime?: string
  productNames: string[]
}

export interface NoticeSetting {
  channel: 'wecom_bot' | 'mp_official' | 'browser'
  label: string
  enabled: boolean
  config: Record<string, any>
  receivers: string[]
}

const BASE = '/api/v1/admin/ops/im'

// ---------- 会话 ----------
export function listConversations(params: { tab?: string; keyword?: string } = {}) {
  return get<ImConversation[]>(`${BASE}/conversations`, params as Record<string, unknown>)
}

export function getConversation(id: number) {
  return get<ImConversation & { messages: ImMessage[]; agentTyping: boolean }>(`${BASE}/conversations/${id}`)
}

/** 增量拉取（断线续传），顺带把客服侧未读清零 */
export function pullMessages(id: number, afterSeq?: number) {
  return get<{ messages: ImMessage[]; agentTyping: boolean }>(`${BASE}/conversations/${id}/messages`, {
    ...(afterSeq != null ? { afterSeq } : {}),
  })
}

export function acceptConversation(id: number) {
  return post<void>(`${BASE}/conversations/${id}/accept`)
}

export function closeConversation(id: number) {
  return post<void>(`${BASE}/conversations/${id}/close`)
}

export function transferConversation(id: number, agentId: number, agentName: string) {
  return post<void>(`${BASE}/conversations/${id}/transfer`, { agentId, agentName })
}

export function pinConversation(id: number, pinned: boolean) {
  return post<void>(`${BASE}/conversations/${id}/pin`, undefined, { params: { pinned: String(pinned) } })
}

export function setTyping(id: number, typing: boolean) {
  return post<void>(`${BASE}/conversations/${id}/typing`, undefined, { params: { typing: String(typing) } })
}

// ---------- 发消息 ----------
export type SendPayload =
  | { msgType: 'text'; text: string }
  | { msgType: 'image'; imageUrl: string }
  | { msgType: 'product_card'; productId: number }
  | { msgType: 'logistics_card'; orderId: number }

export function sendMessage(conversationId: number, payload: SendPayload) {
  return post<ImMessage>(`${BASE}/conversations/${conversationId}/messages`, payload as unknown as Record<string, unknown>)
}

// ---------- 右栏 ----------
export function getCustomer(id: number) {
  return get<ImCustomer>(`${BASE}/conversations/${id}/customer`)
}

export function getUserOrders(id: number, limit = 10) {
  return get<ImUserOrder[]>(`${BASE}/conversations/${id}/orders`, { limit })
}

export function searchProducts(keyword?: string, limit = 20) {
  return get<ImProductCard[]>(`${BASE}/products`, {
    ...(keyword ? { keyword } : {}),
    limit,
  })
}

export function getShippableOrders(id: number) {
  return get<
    Array<{
      orderId: number
      orderNo: string
      status: string
      logisticsCompany?: string
      logisticsNo?: string
      canPush: boolean
      productNames: string[]
    }>
  >(`${BASE}/conversations/${id}/shippable-orders`)
}

// ---------- 话术库 ----------
export function listCannedReplies(params: { group?: string; keyword?: string } = {}) {
  return get<ImCannedReply[]>(`${BASE}/canned-replies`, params as Record<string, unknown>)
}

export function createCannedReply(data: Partial<ImCannedReply>) {
  return post<ImCannedReply>(`${BASE}/canned-replies`, data as Record<string, unknown>)
}

export function updateCannedReply(id: number, data: Partial<ImCannedReply>) {
  return put<void>(`${BASE}/canned-replies/${id}`, data as Record<string, unknown>)
}

export function deleteCannedReply(id: number) {
  return del<void>(`${BASE}/canned-replies/${id}`)
}

// ---------- 座席与通知 ----------
export function listAgents() {
  return get<ImAgent[]>(`${BASE}/agents`)
}

export function setPresence(state: 'online' | 'busy' | 'offline') {
  return post<void>(`${BASE}/presence`, undefined, { params: { state } })
}

export function listNoticeSettings() {
  return get<NoticeSetting[]>(`${BASE}/notice-settings`)
}

export function updateNoticeSetting(
  channel: string,
  data: { enabled: boolean; config?: Record<string, any>; receivers?: string[] },
) {
  return put<void>(`${BASE}/notice-settings/${channel}`, data as unknown as Record<string, unknown>)
}

export function testWecomBot(data: { webhook: string; title?: string; content?: string }) {
  return post<{ ok: boolean; message: string }>(`${BASE}/notice-settings/test-wecom`, data as unknown as Record<string, unknown>)
}

/** SSE 事件流地址。必须用原生 EventSource 订阅（fetch+ReadableStream 拿不到自动重连与 Last-Event-ID）。 */
export const IM_SSE_URL = `${BASE}/stream`
