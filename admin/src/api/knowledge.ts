import { get, post, del } from './request'

const BASE_URL = '/api/v1/admin/knowledge'

export interface KnowledgeSourceItem {
  id: number
  fileName?: string
  sourceType?: string
  sourceId?: number
  vectorStatus?: string
  recallWeight?: number
  chunkCount?: number
  hitCount?: number
  fileSize?: number
  fileUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface KnowledgeChunkItem {
  id: number
  knowledgeId: number
  seq?: number
  title?: string
  body?: string
  charLen?: number
  sourceRef?: string
  hitCount?: number
}

export interface KnowledgeSearchHit {
  chunkId?: number
  title?: string
  body?: string
  sourceRef?: string
  score?: number
}

export function listKnowledgeSources(params?: Record<string, unknown>) {
  return get<KnowledgeSourceItem[]>(BASE_URL, params, { showError: false })
}

export function getChunks(knowledgeId: number) {
  return get<KnowledgeChunkItem[]>(`${BASE_URL}/${knowledgeId}/chunks`, undefined, { showError: false })
}

export function searchTest(q: string, configId?: number) {
  return get<KnowledgeSearchHit[]>(`${BASE_URL}/search`, { q, configId }, { showError: false })
}

export function syncFromContent(body: {
  includePublishedContent?: boolean
  includeAnsweredQa?: boolean
  categoryIds?: number[]
}) {
  return post<{ synced?: number; chunks?: number; message?: string }>(`${BASE_URL}/sync-content`, body)
}

export function createManualQa(body: { question: string; answer: string; recallWeight?: number }) {
  return post<KnowledgeSourceItem>(`${BASE_URL}/manual-qa`, body)
}

export function deleteChunk(chunkId: number) {
  return del(`${BASE_URL}/chunks/${chunkId}`)
}

export function downloadKnowledge(id: number) {
  return get<{ url?: string }>(`${BASE_URL}/${id}/download`, undefined, { showError: false })
}

export function uploadKnowledgeFile(file: File, configId?: number) {
  const formData = new FormData()
  formData.append('file', file)
  if (configId != null && configId > 0) {
    formData.append('configId', String(configId))
  }
  return post<KnowledgeSourceItem>(`${BASE_URL}/upload`, formData)
}
