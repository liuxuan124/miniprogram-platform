import { get, post, put } from './request'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin/questions'

export interface QuestionItem {
  id: number
  userId: number
  userNickname?: string
  body: string
  images?: string[]
  status: string
  viewCount?: number
  createTime?: string
  answer?: {
    id: number
    content: string
    attachments?: Array<Record<string, unknown>>
    adminName?: string
    publishedAt?: string
  }
}

export function getQuestionList(params?: Record<string, unknown>) {
  return get<PageResult<QuestionItem>>(BASE_URL, params)
}

export function getQuestionDetail(id: number) {
  return get<QuestionItem>(`${BASE_URL}/${id}`)
}

export function answerQuestion(id: number, data: { content: string; attachments?: Array<Record<string, unknown>> }) {
  return post<QuestionItem>(`${BASE_URL}/${id}/answer`, data)
}

export function rejectQuestion(id: number) {
  return put<QuestionItem>(`${BASE_URL}/${id}/reject`)
}

export function hideQuestion(id: number) {
  return put<QuestionItem>(`${BASE_URL}/${id}/hide`)
}
