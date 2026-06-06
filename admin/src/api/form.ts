/**
 * 表单管理相关 API
 * 严格遵循接口契约
 */
import { get, post, put, del } from './request'
import type {
  FormTemplate,
  CreateFormTemplateParams,
  UpdateFormTemplateParams,
  FormTemplateListParams,
  FormSubmission,
  FormSubmissionListParams,
} from '@/types/form'
import type { PageResult } from '@/types/global'

const BASE_URL = '/api/v1/admin'

// ==================== 表单模板 ====================

/** 获取表单模板列表 */
export function getFormTemplateList(params?: FormTemplateListParams) {
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
        keyword: params.keyword,
        status: params.status,
      }
    : undefined
  return get<PageResult<FormTemplate>>(`${BASE_URL}/form-templates`, query as Record<string, unknown>)
}

/** 创建表单模板 */
export function createFormTemplate(data: CreateFormTemplateParams) {
  return post<FormTemplate>(`${BASE_URL}/form-templates`, data as unknown as Record<string, unknown>)
}

/** 获取表单模板详情 */
export function getFormTemplateDetail(id: number) {
  return get<FormTemplate>(`${BASE_URL}/form-templates/${id}`)
}

/** 更新表单模板 */
export function updateFormTemplate(id: number, data: UpdateFormTemplateParams) {
  return put<FormTemplate>(`${BASE_URL}/form-templates/${id}`, data as unknown as Record<string, unknown>)
}

/** 删除表单模板 */
export function deleteFormTemplate(id: number) {
  return del<void>(`${BASE_URL}/form-templates/${id}`)
}

/** 启用表单模板 */
export function activateFormTemplate(id: number) {
  return put<FormTemplate>(`${BASE_URL}/form-templates/${id}`, { status: 1 })
}

/** 停用表单模板 */
export function deactivateFormTemplate(id: number) {
  return put<FormTemplate>(`${BASE_URL}/form-templates/${id}`, { status: 0 })
}

// ==================== 表单提交 ====================

/** 获取表单提交列表 */
export function getFormSubmissions(templateId: number, params?: FormSubmissionListParams) {
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
      }
    : undefined
  return get<PageResult<FormSubmission>>(`${BASE_URL}/form-templates/${templateId}/submissions`, query as Record<string, unknown>)
}
