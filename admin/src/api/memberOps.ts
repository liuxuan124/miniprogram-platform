/**
 * 用户会员运营台 API（/api/v1/admin/member-ops）
 */
import { get, post, put, del } from './request'

const BASE = '/api/v1/admin/member-ops'

export interface MemberOpsOverview {
  tiles?: Array<{ label: string; value: number | string; hint?: string }>
  todos?: Array<{ key: string; title: string; count: number; hint?: string; path?: string }>
  funnel?: Array<{ label: string; value: number }>
  planMix?: Array<{ planId?: number; name: string; count: number; price?: number; period?: string; tone?: string; on?: boolean }>
}

export interface MemberSegment {
  id: number
  name: string
  ruleDesc?: string
  ruleCode?: string
  reachAction?: string
  memberCount?: number
  avatars?: Array<{ name?: string; tone?: string }>
  sortOrder?: number
  status?: number
}

export interface ReachPayload {
  action?: string
  planId?: number
  days?: number
  reason?: string
  title?: string
  content?: string
}

export interface GiftPayload {
  userIds: number[]
  planId: number
  days: number
  reason: string
}

export interface MergePayload {
  keepUserId: number
  mergeUserIds: number[]
}

export interface SupportTicket {
  id: number
  userId?: number
  whoName?: string
  lastText?: string
  status: 'open' | 'done' | string
  source?: string
  orderId?: number
  unread?: boolean
  lastReply?: string
  createTime?: string
  updateTime?: string
  planName?: string
  phone?: string
}

export interface FeedbackItem {
  id: number
  userId?: number
  nickname?: string
  content?: string
  adminReply?: string
  createTime?: string
  handledAt?: string
}

export interface CommunityPost {
  id: number
  communityId?: string
  /** 桥接 mp_content.id（V104 起）；正文/附件以该内容为准 */
  contentId?: number | null
  authorName?: string
  userId?: number
  kind?: string
  textContent?: string
  topic?: string
  pinned?: number | boolean
  essence?: number | boolean
  hidden?: number | boolean
  likes?: number
  comments?: number
  replyText?: string
  /** 非表字段：服务端从 mp_content 回填的附件 JSON（只存 fileId 等元信息） */
  attachments?: string | Array<Record<string, unknown>> | null
  attachmentCount?: number | null
  /** 以下为 V111 起从 mp_content 回填：内容库字段，社区管理台与动态管理合并后同屏可见/可改 */
  title?: string | null
  /** draft 草稿 / published 已上架 / unpublished 已下架 */
  status?: string | null
  images?: string | null
  summary?: string | null
  viewCount?: number | null
  likeCount?: number | null
  createTime?: string
}

export interface CommunityCheckin {
  id: number
  communityId?: string
  name: string
  days?: number
  joinedCount?: number
  todayCount?: number
  status?: number
}

export interface ReaderGroup {
  id: number
  name: string
  director?: string
  whoCanJoin?: string
  qrUrl?: string
  qrExpireAt?: string
  fullFlag?: number | boolean
  status?: number
  sortOrder?: number
}

/** 概览 */
export function getMemberOpsOverview() {
  return get<MemberOpsOverview>(`${BASE}/overview`)
}

/** 分群 */
export function listSegments() {
  return get<MemberSegment[]>(`${BASE}/segments`)
}

export function createSegment(data: Partial<MemberSegment>) {
  return post<MemberSegment>(`${BASE}/segments`, data as Record<string, unknown>)
}

export function updateSegment(id: number, data: Partial<MemberSegment>) {
  return put<MemberSegment>(`${BASE}/segments/${id}`, data as Record<string, unknown>)
}

export function deleteSegment(id: number) {
  return del<void>(`${BASE}/segments/${id}`)
}

export function listSegmentMembers(id: number, params?: Record<string, unknown>) {
  return get<any>(`${BASE}/segments/${id}/members`, params)
}

export function reachSegment(id: number, body: ReachPayload) {
  return post<any>(`${BASE}/segments/${id}/reach`, body as unknown as Record<string, unknown>)
}

/** 用户运营动作 */
export function giftMembership(body: GiftPayload) {
  return post<any>(`${BASE}/users/gift`, body as unknown as Record<string, unknown>)
}

export function mergeUsers(body: MergePayload) {
  return post<any>(`${BASE}/users/merge`, body as unknown as Record<string, unknown>)
}

export function listDuplicateUsers() {
  return get<any[]>(`${BASE}/users/duplicates`)
}

export function getUserTags(userId: number) {
  return get<any[]>(`${BASE}/users/${userId}/tags`)
}

export function putUserTags(userId: number, tagIds: number[]) {
  return put<void>(`${BASE}/users/${userId}/tags`, { tagIds } as unknown as Record<string, unknown>)
}

export function appendUserTags(userId: number, tagIds: number[]) {
  return post<void>(`${BASE}/users/${userId}/tags`, { tagIds } as unknown as Record<string, unknown>)
}

export function reachUsers(userIds: number[], content: string, title?: string) {
  return post<{ reached: number }>(`${BASE}/users/reach`, { userIds, content, title } as unknown as Record<string, unknown>)
}

export function putUserNote(userId: number, note: string) {
  return put<void>(`${BASE}/users/${userId}/note`, { note } as unknown as Record<string, unknown>)
}

/**
 * V120：软删除用户账号（mp_user.deleted=1）
 *
 * - 需要 `member:update` 权限，service_staff 只有 member:list 会 403
 * - reason 走 query：后端是 @RequestParam 绑定
 * - 后端会先吊销该用户已签发的 token；付费会员 / system / test 账号一律拒删
 */
export function deleteUser(userId: number, reason?: string) {
  return del<{ deleted: boolean; userId: number; nickname?: string }>(`${BASE}/users/${userId}`, {
    reason,
  })
}

/** 客服 */
export function listSupportTickets(params?: { status?: string }) {
  return get<SupportTicket[]>(`${BASE}/support/tickets`, params as Record<string, unknown>)
}

export function replySupportTicket(id: number, content: string) {
  return post<void>(`${BASE}/support/tickets/${id}/reply`, { content } as unknown as Record<string, unknown>)
}

export interface SupportMessage {
  id: number
  sender: 'user' | 'admin' | 'system' | string
  content: string
  createTime?: string
}

export function listSupportTicketMessages(id: number) {
  return get<SupportMessage[]>(`${BASE}/support/tickets/${id}/messages`)
}

export function updateSupportTicketStatus(id: number, status: 'open' | 'done') {
  return put<void>(`${BASE}/support/tickets/${id}/status`, { status } as unknown as Record<string, unknown>)
}

/** 反馈 */
export function listFeedback(params?: Record<string, unknown>) {
  return get<FeedbackItem[]>(`${BASE}/feedback`, params)
}

export function replyFeedback(id: number, content: string) {
  return post<void>(`${BASE}/feedback/${id}/reply`, { content } as unknown as Record<string, unknown>)
}

/** 社区动态 */
export function listCommunityPosts(params?: { communityId?: string }) {
  return get<CommunityPost[]>(`${BASE}/community/posts`, params as Record<string, unknown>)
}

/** 社区发帖入参：fileIds 来自后台「从文件库选择」，只存 fileId 不复制文件 */
export interface CommunityPostCreate {
  communityId?: string
  authorName?: string
  kind?: string
  textContent?: string
  topic?: string
  userId?: number
  /** 挂资料库文件（最多 5 份），服务端写入 mp_content.attachments */
  fileIds?: number[]
  /** 图片 URL 列表（可选） */
  images?: string[]
  title?: string
}

export function createCommunityPost(data: CommunityPostCreate) {
  return post<CommunityPost>(`${BASE}/community/posts`, data as unknown as Record<string, unknown>)
}

export function updateCommunityPost(id: number, data: Partial<CommunityPost>) {
  return put<CommunityPost>(`${BASE}/community/posts/${id}`, data as Record<string, unknown>)
}

/** 打卡 */
export function listCheckins(params?: { communityId?: string }) {
  return get<CommunityCheckin[]>(`${BASE}/community/checkins`, params as Record<string, unknown>)
}

export function createCheckin(data: Partial<CommunityCheckin>) {
  return post<CommunityCheckin>(`${BASE}/community/checkins`, data as Record<string, unknown>)
}

export function updateCheckin(id: number, data: Partial<CommunityCheckin>) {
  return put<CommunityCheckin>(`${BASE}/community/checkins/${id}`, data as Record<string, unknown>)
}

export function deleteCheckin(id: number) {
  return del<void>(`${BASE}/community/checkins/${id}`)
}

/** 读者群 */
export function listReaderGroups() {
  return get<ReaderGroup[]>(`${BASE}/reader-groups`)
}

export function createReaderGroup(data: Partial<ReaderGroup>) {
  return post<ReaderGroup>(`${BASE}/reader-groups`, data as Record<string, unknown>)
}

export function updateReaderGroup(id: number, data: Partial<ReaderGroup>) {
  return put<ReaderGroup>(`${BASE}/reader-groups/${id}`, data as Record<string, unknown>)
}

export function deleteReaderGroup(id: number) {
  return del<void>(`${BASE}/reader-groups/${id}`)
}
