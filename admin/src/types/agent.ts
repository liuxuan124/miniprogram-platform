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
  role?: string
  toolGrants?: string
  dailyTokenBudget?: number
  overBudgetAction?: string
  evalCases?: unknown[] | string
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
  role?: string
  toolGrants?: string
  dailyTokenBudget?: number
  overBudgetAction?: string
  evalCases?: string
}

export interface AgentRoleCard {
  role: string
  name: string
  configured: boolean
  activeConfigId?: number | null
  model?: string
  version?: number
  updatedAt?: string
  fallbackTo?: string
  comingSoon?: boolean
  todayCalls?: number
  todayTokens?: number
  todayCost?: number
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
