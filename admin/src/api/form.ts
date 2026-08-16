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
  const status = params?.status
  const query = params
    ? {
        current: params.page,
        size: params.page_size,
        keyword: params.keyword,
        status: status === 'active' || status === 1 ? 1 : status === 'inactive' || status === 0 ? 0 : undefined,
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

/** 启用表单模板（带上名称与字段，兼容强制校验的旧后端） */
export async function activateFormTemplate(id: number) {
  const detail = await getFormTemplateDetail(id)
  const row = detail.data as any
  return put<FormTemplate>(`${BASE_URL}/form-templates/${id}`, {
    name: row?.name,
    description: row?.description,
    fields: typeof row?.fields === 'string' ? row.fields : JSON.stringify(row?.fields || []),
    status: 1,
  })
}

/** 停用表单模板 */
export async function deactivateFormTemplate(id: number) {
  const detail = await getFormTemplateDetail(id)
  const row = detail.data as any
  return put<FormTemplate>(`${BASE_URL}/form-templates/${id}`, {
    name: row?.name,
    description: row?.description,
    fields: typeof row?.fields === 'string' ? row.fields : JSON.stringify(row?.fields || []),
    status: 0,
  })
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
