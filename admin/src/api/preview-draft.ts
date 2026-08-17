/**
 * 装修器临时草稿预览（手机扫码）
 */
import { post, del, get } from './request'
import type { PageDSL } from '@/types/page'

const ADMIN = '/api/v1/admin/preview-drafts'
const MP = '/api/v1/mp/preview-drafts'

export interface PreviewDraftCreateResult {
  token: string
  expiresAt: string
  previewPath: string
}

export interface PreviewDraftContent {
  dsl: PageDSL
  pageTitle?: string
  expiresAt?: string
}

export function createPreviewDraft(data: {
  dsl: PageDSL
  pageTitle?: string
  pageId?: number
}) {
  return post<PreviewDraftCreateResult>(ADMIN, data as unknown as Record<string, unknown>)
}

export function deletePreviewDraft(token: string) {
  return del<void>(`${ADMIN}/${encodeURIComponent(token)}`, undefined, { showError: false })
}

/** 公开读取（手机 H5，可不登录） */
export function getPreviewDraft(token: string) {
  return get<PreviewDraftContent>(`${MP}/${encodeURIComponent(token)}`, undefined, { showError: false })
}
