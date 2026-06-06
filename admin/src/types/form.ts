/**
 * 表单管理相关类型定义
 */

/** 表单字段类型 */
export enum FormFieldType {
  Text = 'text',
  Textarea = 'textarea',
  Number = 'number',
  Email = 'email',
  Phone = 'phone',
  Select = 'select',
  Radio = 'radio',
  Checkbox = 'checkbox',
  Date = 'date',
  Time = 'time',
  DateTime = 'datetime',
  Image = 'image',
  File = 'file',
  Rate = 'rate',
  Switch = 'switch',
}

/** 表单字段类型标签 */
export const FormFieldTypeLabels: Record<FormFieldType, string> = {
  [FormFieldType.Text]: '单行文本',
  [FormFieldType.Textarea]: '多行文本',
  [FormFieldType.Number]: '数字',
  [FormFieldType.Email]: '邮箱',
  [FormFieldType.Phone]: '手机号',
  [FormFieldType.Select]: '下拉选择',
  [FormFieldType.Radio]: '单选',
  [FormFieldType.Checkbox]: '多选',
  [FormFieldType.Date]: '日期',
  [FormFieldType.Time]: '时间',
  [FormFieldType.DateTime]: '日期时间',
  [FormFieldType.Image]: '图片上传',
  [FormFieldType.File]: '文件上传',
  [FormFieldType.Rate]: '评分',
  [FormFieldType.Switch]: '开关',
}

/** 表单模板状态 */
export enum FormTemplateStatus {
  Draft = 'draft',
  Active = 'active',
  Inactive = 'inactive',
}

/** 表单模板状态标签 */
export const FormTemplateStatusLabels: Record<FormTemplateStatus, string> = {
  [FormTemplateStatus.Draft]: '草稿',
  [FormTemplateStatus.Active]: '已启用',
  [FormTemplateStatus.Inactive]: '已停用',
}

/** 表单模板状态标签类型 */
export const FormTemplateStatusTagType: Record<FormTemplateStatus, string> = {
  [FormTemplateStatus.Draft]: 'info',
  [FormTemplateStatus.Active]: 'success',
  [FormTemplateStatus.Inactive]: 'danger',
}

/** 表单字段选项 */
export interface FormFieldOption {
  label: string
  value: string | number
}

/** 表单字段配置 */
export interface FormFieldConfig {
  id: string
  label: string
  field_type: FormFieldType
  placeholder?: string
  default_value?: string
  required: boolean
  sort: number
  options?: FormFieldOption[]
  min?: number
  max?: number
  max_length?: number
  description?: string
}

/** 表单模板 */
export interface FormTemplate {
  id: number
  name: string
  description?: string
  fields: FormFieldConfig[]
  status: FormTemplateStatus
  submission_count: number
  created_at: string
  updated_at: string
}

/** 创建表单模板参数 */
export interface CreateFormTemplateParams {
  name: string
  description?: string
  fields: FormFieldConfig[] | string
  status?: FormTemplateStatus | number
}

/** 更新表单模板参数 */
export interface UpdateFormTemplateParams {
  name?: string
  description?: string
  fields?: FormFieldConfig[] | string
  status?: FormTemplateStatus | number
}

/** 表单模板列表查询参数 */
export interface FormTemplateListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: string
}

/** 表单提交记录 */
export interface FormSubmission {
  id: number
  form_template_id: number
  form_template_name?: string
  data: Record<string, any>
  submitter?: string
  submitter_phone?: string
  created_at: string
}

/** 表单提交列表查询参数 */
export interface FormSubmissionListParams {
  page?: number
  page_size?: number
  form_template_id?: number
  start_date?: string
  end_date?: string
}
