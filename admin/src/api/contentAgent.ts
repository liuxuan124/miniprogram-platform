/**
 * 内容管理 Agent API
 */
import { get, post } from './request'

const BASE = '/api/v1/admin/content-agent'

export interface ContentAgentTaskTypeOption {
  code: string
  label: string
  group: string
  needsLlm: boolean
}

export interface ContentAgentTask {
  id: number
  taskId: string
  role: string
  taskTypes: string[]
  contentIds: number[]
  status: 'pending' | 'running' | 'review' | 'completed' | 'failed' | 'expired'
  total: number
  processed: number
  currentTitle?: string
  operatorId?: number
  costTokens?: number
  freeformPrompt?: string
  errorMessage?: string
  startedAt?: string
  finishedAt?: string
  justCreated?: boolean
  pendingReviewCount?: number
  issueCount?: number
}

export interface ContentAgentTaskItem {
  id: number
  taskId: number
  contentId: number
  contentTitle?: string
  taskType: string
  taskTypeLabel?: string
  field: string
  fieldLabel?: string
  oldValue?: string
  newValue?: string
  confidence?: number
  reviewStatus: 'pending' | 'accepted' | 'rejected' | 'applied'
  rejectReason?: string
  issueLevel?: string
  issueCode?: string
  extraJson?: string
  bodyField?: boolean
}

export interface CreateContentAgentTaskRequest {
  taskTypes: string[]
  contentIds?: number[]
  freeformPrompt?: string
  targetFormat?: string
}

export function listContentAgentTaskTypes() {
  return get<ContentAgentTaskTypeOption[]>(`${BASE}/task-types`)
}

export function createContentAgentTask(data: CreateContentAgentTaskRequest) {
  return post<ContentAgentTask>(`${BASE}/tasks`, data as unknown as Record<string, unknown>)
}

export function getContentAgentTask(id: number) {
  return get<ContentAgentTask>(`${BASE}/tasks/${id}`)
}

export function getRunningContentAgentTask() {
  return get<ContentAgentTask | null>(`${BASE}/tasks/running`)
}

export function listContentAgentTaskItems(taskId: number, params?: { reviewStatus?: string; current?: number; size?: number }) {
  return get<{ records: ContentAgentTaskItem[]; total: number }>(`${BASE}/tasks/${taskId}/items`, params)
}

export function reviewContentAgentItems(taskId: number, data: { itemIds: number[]; action: 'accept' | 'reject'; rejectReason?: string }) {
  return post<void>(`${BASE}/tasks/${taskId}/items/review`, data as unknown as Record<string, unknown>)
}

export function applyContentAgentTask(taskId: number) {
  return post<{ appliedCount: number; skippedCount: number; message: string }>(`${BASE}/tasks/${taskId}/apply`)
}
