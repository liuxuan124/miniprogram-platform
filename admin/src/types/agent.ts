export interface AgentConfig {
  id: number
  name: string
  model: string
  modelProvider: string
  apiBaseUrl?: string
  apiKey?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: string
  status: number
  version: number
  createdAt?: string
  updatedAt?: string
}

export interface AgentConfigPayload {
  name: string
  model: string
  modelProvider: string
  apiBaseUrl?: string
  apiKey?: string
  systemPrompt?: string
  temperature?: number
  maxTokens?: number
  reasoningEffort?: string
}
