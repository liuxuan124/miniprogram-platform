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
  welcomeMessage?: string
  fallbackStrategy?: string
  enableRecommend?: boolean
  enableProactive?: boolean
  memoryType?: string
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
  welcomeMessage?: string
  fallbackStrategy?: string
  enableRecommend?: boolean
  enableProactive?: boolean
  memoryType?: string
}

export interface AgentKnowledgeItem {
  id: number
  configId?: number
  fileName: string
  fileSize?: number
  fileUrl?: string
  vectorStatus: string
  recallWeight?: number
  createdAt?: string
}

export interface AgentVersionItem {
  id: number
  version: number
  configJson?: string
  changelog?: string
  status: number
  createdAt?: string
}
