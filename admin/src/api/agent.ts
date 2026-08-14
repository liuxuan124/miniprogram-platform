import { get, post, put, del } from './request'
import type {
  AgentConfig,
  AgentConfigPayload,
  AgentKnowledgeItem,
  AgentVersionItem,
} from '@/types/agent'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/agent'
/** 两段路径，避免被后端 /{id} 误当成数字 id */
const META = `${BASE_URL}/meta`

export function getAgentConfigs(params?: Record<string, unknown>) {
  return get<PageResult<AgentConfig>>(BASE_URL, params, { showError: false })
}

export function getActiveAgentConfig() {
  return get<AgentConfig | null>(`${META}/active`, undefined, { showError: false })
}

export function createAgentConfig(data: AgentConfigPayload) {
  return post<AgentConfig>(BASE_URL, data)
}

export function updateAgentConfig(id: number, data: AgentConfigPayload) {
  return put<AgentConfig>(`${BASE_URL}/${id}`, data)
}

export function publishAgentConfig(id: number) {
  return put<AgentConfig>(`${BASE_URL}/${id}/publish`)
}

export function rollbackAgentVersion(version: number) {
  return post<AgentConfig>(`${BASE_URL}/rollback`, { version })
}

export function testAgentConnection(data: AgentConfigPayload) {
  return post<{ ok: boolean; message?: string; mode?: string }>(`${BASE_URL}/test-connection`, data)
}

export function sandboxAgentChat(payload: {
  question: string
  systemPrompt?: string
  enableRecommend?: boolean
  enableProactive?: boolean
  fallbackStrategy?: string
}) {
  return post<{ answer: string; mode?: string; hint?: string }>(`${BASE_URL}/sandbox/chat`, payload, {
    showError: false,
  })
}

export function getAgentKnowledge(configId?: number) {
  return get<AgentKnowledgeItem[]>(
    `${META}/knowledge`,
    configId != null ? { configId } : undefined,
    { showError: false }
  )
}

export function addAgentKnowledge(data: {
  configId?: number
  fileName: string
  fileUrl?: string
  fileSize?: number
  recallWeight?: number
}) {
  return post<AgentKnowledgeItem>(`${META}/knowledge`, data)
}

export function uploadAgentKnowledge(file: File, configId?: number) {
  const formData = new FormData()
  formData.append('file', file)
  if (configId != null && configId > 0) {
    formData.append('configId', String(configId))
  }
  return post<AgentKnowledgeItem>(`${META}/knowledge/upload`, formData)
}

export function updateAgentKnowledgeWeight(id: number, weight: number) {
  return put(`${META}/knowledge/${id}/weight`, { weight })
}

export function deleteAgentKnowledge(id: number) {
  return del(`${META}/knowledge/${id}`)
}

export function getAgentVersions() {
  return get<AgentVersionItem[]>(`${META}/versions`, undefined, { showError: false })
}

export function getAgentRecentConversations(limit = 20) {
  return get<Array<Record<string, string>>>(`${META}/conversations`, { limit }, { showError: false })
}
