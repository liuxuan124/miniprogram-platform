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

export function putUserNote(userId: number, note: string) {
  return put<void>(`${BASE}/users/${userId}/note`, { note } as unknown as Record<string, unknown>)
}

/** 客服 */
export function listSupportTickets(params?: { status?: string }) {
  return get<SupportTicket[]>(`${BASE}/support/tickets`, params as Record<string, unknown>)
}

export function replySupportTicket(id: number, content: string) {
  return post<void>(`${BASE}/support/tickets/${id}/reply`, { content } as unknown as Record<string, unknown>)
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

export function createCommunityPost(data: Partial<CommunityPost>) {
  return post<CommunityPost>(`${BASE}/community/posts`, data as Record<string, unknown>)
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
