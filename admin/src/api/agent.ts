import { get, post, put } from './request'
import type { AgentConfig, AgentConfigPayload } from '@/types/agent'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/agent'

export function getAgentConfigs(params?: Record<string, unknown>) {
  return get<PageResult<AgentConfig>>(BASE_URL, params)
}

export function getActiveAgentConfig() {
  return get<AgentConfig | null>(`${BASE_URL}/active`)
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
