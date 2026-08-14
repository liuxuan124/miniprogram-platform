<template>
  <div class="form-template-container">
    <!-- 搜索筛选区 -->
    <el-card shadow="hover" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索模板名称"
            clearable
            @keyup.enter="handleSearch"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 130px">
            <el-option
              v-for="(label, key) in FormTemplateStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作区 -->
    <el-card shadow="hover" class="table-card">
      <template #header>
        <div class="card-header">
          <span>表单模板列表</span>
          <div style="display: flex; gap: 8px">
            <el-button type="primary" icon="Plus" @click="handleCreate">创建模板</el-button>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="templateList" border stripe style="width: 100%" table-layout="auto">
        <el-table-column prop="id" label="ID" width="64" align="center" />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            <div v-for="tags in [getTemplateTypeTags(row)]" :key="row.id" class="type-tags">
              <el-tag
                v-for="(t, i) in tags.visible"
                :key="`${t}-${i}`"
                size="small"
                effect="plain"
                type="primary"
              >
                {{ t }}
              </el-tag>
              <el-tag v-if="tags.extra > 0" size="small" effect="plain" type="info">
                +{{ tags.extra }}
              </el-tag>
              <span v-if="!tags.visible.length" class="type-empty">未配置</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="模板名称" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column prop="fields" label="字段数" width="80" align="center">
          <template #default="{ row }">{{ row.fields?.length || 0 }}</template>
        </el-table-column>
        <el-table-column prop="submission_count" label="提交数" width="80" align="center" />
        <el-table-column prop="status" label="状态" width="88" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <div class="op-actions">
              <el-button link type="primary" size="small" @click="handleEdit(row)">编辑</el-button>
              <el-button
                v-if="row.status !== 'active'"
                link
                type="success"
                size="small"
                @click="handleActivate(row)"
              >
                启用
              </el-button>
              <el-button
                v-if="row.status === 'active'"
                link
                type="warning"
                size="small"
                @click="handleDeactivate(row)"
              >
                停用
              </el-button>
              <el-button link type="info" size="small" @click="handleViewSubmissions(row)">数据</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 创建/编辑模板弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑表单模板' : '创建表单模板'"
      width="900px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入模板名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="模板描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="请输入模板描述"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" style="width: 200px">
            <el-option
              v-for="(label, key) in FormTemplateStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>

        <!-- 字段配置区 -->
        <el-form-item label="字段配置">
          <div class="field-config-area">
            <!-- 可添加的字段类型 -->
            <div class="field-type-palette">
              <span class="palette-label">点一下添加一类问题：</span>
              <el-button
                v-for="(label, key) in FormFieldTypeLabels"
                :key="key"
                size="small"
                @click="handleAddField(key as FormFieldType)"
              >
                {{ label }}
              </el-button>
            </div>

            <!-- 已配置字段列表（拖拽排序） -->
            <div class="field-list">
              <el-empty v-if="formData.fields.length === 0" description="暂无字段，请从上方添加" :image-size="60" />
              <draggable
                v-else
                v-model="formData.fields"
                item-key="id"
                handle=".drag-handle"
                animation="200"
              >
                <template #item="{ element, index }">
                  <div class="field-item">
                    <div class="field-item-header">
                      <el-icon class="drag-handle"><Rank /></el-icon>
                      <span class="field-index">#{{ index + 1 }}</span>
                      <el-tag size="small" type="info">{{ getFieldTypeLabel(element.field_type) }}</el-tag>
                      <el-tag v-if="element.required" size="small" type="danger">必填</el-tag>
                      <span class="field-label-text">{{ element.label }}</span>
                      <div class="field-actions">
                        <el-button link type="primary" size="small" @click="handleEditField(index)">配置</el-button>
                        <el-button link type="danger" size="small" @click="handleRemoveField(index)">删除</el-button>
                      </div>
                    </div>
                  </div>
                </template>
              </draggable>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 字段配置弹窗 -->
    <el-dialog
      v-model="fieldDialogVisible"
      :title="fieldEditMode === 'edit' ? `编辑「${currentTypeLabel}」` : `添加「${currentTypeLabel}」`"
      width="580px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-alert
        v-if="fieldPreset.tip"
        :title="fieldPreset.tip"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />

      <el-form ref="fieldFormRef" :model="fieldFormData" :rules="fieldFormRules" label-width="120px">
        <el-form-item label="问题名称" prop="label">
          <el-input
            v-model="fieldFormData.label"
            :placeholder="fieldPreset.labelHint || '如：姓名、公司、备注'"
            maxlength="30"
            show-word-limit
          />
          <div class="field-help">填表人在小程序里看到的标题</div>
        </el-form-item>

        <el-form-item label="填写方式">
          <el-tag type="primary" effect="plain">{{ currentTypeLabel }}</el-tag>
          <span class="field-type-lock">已选定，不可更改</span>
        </el-form-item>

        <!-- 输入框灰色提示：可编辑类型 -->
        <el-form-item v-if="showPlaceholder && !fieldPreset.lockPlaceholder" label="输入框提示">
          <el-input
            v-model="fieldFormData.placeholder"
            :placeholder="fieldPreset.placeholderHint || '框里先显示的灰色小字，点进去就消失'"
          />
          <div class="field-help">提示填表人该怎么填，例如「请输入真实姓名」</div>
        </el-form-item>

        <!-- 固定格式：提示只读 -->
        <el-form-item v-if="showPlaceholder && fieldPreset.lockPlaceholder" label="输入框提示">
          <el-input v-model="fieldFormData.placeholder" disabled />
          <div class="field-help">本类型已固定提示文案，避免填错格式</div>
        </el-form-item>

        <!-- 默认值：按类型不同控件 -->
        <el-form-item v-if="showDefaultValue && defaultValueMode !== 'hidden'" label="预先填好">
          <el-input
            v-if="defaultValueMode === 'text'"
            v-model="fieldFormData.default_value"
            :placeholder="fieldPreset.defaultHint || '可不填；打开表单时自动带上'"
            :disabled="fieldPreset.lockDefault"
          />
          <el-input-number
            v-else-if="defaultValueMode === 'number'"
            v-model="defaultNumberValue"
            :min="fieldFormData.min"
            :max="fieldFormData.max"
            style="width: 100%"
          />
          <el-switch
            v-else-if="defaultValueMode === 'switch'"
            v-model="defaultSwitchValue"
            active-text="默认打开"
            inactive-text="默认关闭"
          />
          <el-rate v-else-if="defaultValueMode === 'rate'" v-model="defaultRateValue" />
          <el-date-picker
            v-else-if="defaultValueMode === 'date'"
            v-model="fieldFormData.default_value"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="可不选"
            style="width: 100%"
          />
          <el-time-picker
            v-else-if="defaultValueMode === 'time'"
            v-model="fieldFormData.default_value"
            value-format="HH:mm"
            placeholder="可不选"
            style="width: 100%"
          />
          <el-date-picker
            v-else-if="defaultValueMode === 'datetime'"
            v-model="fieldFormData.default_value"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm"
            placeholder="可不选"
            style="width: 100%"
          />
          <div class="field-help">打开表单时自动填上，填表人仍可改；一般留空即可</div>
        </el-form-item>

        <el-form-item v-if="showDescription" label="补充说明">
          <el-input
            v-model="fieldFormData.description"
            :placeholder="fieldPreset.descriptionHint || '可选，显示在问题下方帮助填表'"
            :disabled="fieldPreset.lockDescription"
          />
        </el-form-item>

        <el-form-item label="必须填写">
          <el-switch v-model="fieldFormData.required" active-text="是" inactive-text="否" />
        </el-form-item>

        <el-form-item v-if="needMaxLength" label="最多几个字">
          <el-input-number v-model="fieldFormData.max_length" :min="1" :max="1000" />
        </el-form-item>

        <template v-if="needMinMax">
          <el-form-item :label="fieldFormData.field_type === FormFieldType.Rate ? '最低分' : '最小数字'">
            <el-input-number v-model="fieldFormData.min" />
          </el-form-item>
          <el-form-item :label="fieldFormData.field_type === FormFieldType.Rate ? '最高分' : '最大数字'">
            <el-input-number v-model="fieldFormData.max" />
          </el-form-item>
        </template>

        <!-- 选项：只填显示文字，值自动生成 -->
        <el-form-item v-if="needOptions" label="可选答案" required>
          <div class="option-list">
            <div v-for="(opt, idx) in fieldFormData.options" :key="idx" class="option-row">
              <el-input
                v-model="opt.label"
                :placeholder="`选项 ${idx + 1}`"
                style="flex: 1"
                @input="syncOptionValue(idx)"
              />
              <el-button link type="danger" @click="removeOption(idx)">删除</el-button>
            </div>
            <el-button type="primary" link @click="handleAddOption">+ 添加一个选项</el-button>
            <div class="field-help">只需写填表人看到的文字，系统会自动保存对应值</div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="fieldDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleFieldSubmit">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import draggable from 'vuedraggable'
import {
  getFormTemplateList,
  createFormTemplate,
  updateFormTemplate,
  deleteFormTemplate,
} from '@/api/form'
import type {
  FormTemplate,
  FormFieldConfig,
  FormFieldOption,
  FormTemplateListParams,
} from '@/types/form'
import {
  FormFieldType,
  FormTemplateStatus,
  FormTemplateStatusLabels,
  FormTemplateStatusTagType,
  FormFieldTypeLabels,
} from '@/types/form'

const router = useRouter()

/** 搜索表单 */
const searchForm = reactive<FormTemplateListParams>({
  keyword: '',
  status: '',
})

/** 分页 */
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

/** 列表数据 */
const templateList = ref<FormTemplate[]>([])
const loading = ref(false)

/** 获取状态标签 */
function getStatusLabel(status: string): string {
  return (FormTemplateStatusLabels as Record<string, string>)[status] || status
}

/** 获取状态标签类型 */
function getStatusTagType(status: string): string {
  return (FormTemplateStatusTagType as Record<string, string>)[status] || 'info'
}

/** 获取字段类型标签 */
function getFieldTypeLabel(type: FormFieldType): string {
  return FormFieldTypeLabels[type] || type
}

/** 列表展示：按字段汇总模板类型标签 */
function getTemplateTypeTags(row: FormTemplate): { visible: string[]; extra: number } {
  const fields = normalizeFields(row?.fields || [])
  const labels: string[] = []
  const seen = new Set<string>()
  for (const f of fields) {
    const label = getFieldTypeLabel(f.field_type as FormFieldType)
    if (!label || seen.has(label)) continue
    seen.add(label)
    labels.push(label)
  }
  const maxShow = 2
  return {
    visible: labels.slice(0, maxShow),
    extra: Math.max(0, labels.length - maxShow),
  }
}

function mapTemplateStatus(status: number): FormTemplateStatus {
  if (status === 1) return FormTemplateStatus.Active
  return FormTemplateStatus.Inactive
}

function toBackendStatus(status: FormTemplateStatus): number {
  if (status === FormTemplateStatus.Active) return 1
  return 0
}

function normalizeFields(rawFields: unknown): FormFieldConfig[] {
  try {
    const source = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields
    if (!Array.isArray(source)) return []
    return source.map((field: any, index: number) => ({
      id: field.id || field.field_key || `field_${index + 1}`,
      label: field.label || `字段${index + 1}`,
      field_type: field.field_type || field.type || FormFieldType.Text,
      placeholder: field.placeholder || '',
      default_value: field.default_value || '',
      required: Boolean(field.required),
      sort: Number(field.sort ?? index),
      options: Array.isArray(field.options) ? field.options : [],
      min: field?.validation?.min ?? field.min,
      max: field?.validation?.max ?? field.max,
      max_length: field?.validation?.maxLength ?? field.max_length,
      description: field.description || '',
    }))
  } catch {
    return []
  }
}

function normalizeTemplate(raw: any): FormTemplate {
  return {
    id: Number(raw?.id || 0),
    name: raw?.name || '',
    description: raw?.description || '',
    fields: normalizeFields(raw?.fields),
    status: mapTemplateStatus(Number(raw?.status ?? 0)),
    submission_count: Number(raw?.submission_count ?? raw?.submitCount ?? 0),
    created_at: raw?.created_at || raw?.createTime || '',
    updated_at: raw?.updated_at || raw?.updateTime || '',
  }
}

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: FormTemplateListParams = {
      page: pagination.page,
      page_size: pagination.pageSize,
      ...searchForm,
    }
    const res = await getFormTemplateList(params)
    const data = (res as any).data || {}
    const records = data.records || data.list || []
    templateList.value = Array.isArray(records) ? records.map((item: any) => normalizeTemplate(item)) : []
    pagination.total = Number(data.total || 0)
  } catch {
    templateList.value = []
  } finally {
    loading.value = false
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchList()
}

/** 重置 */
function handleReset() {
  searchForm.keyword = ''
  searchForm.status = ''
  pagination.page = 1
  fetchList()
}

// ==================== 模板创建/编辑 ====================

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  name: '',
  description: '',
  status: 'draft' as FormTemplateStatus,
  fields: [] as FormFieldConfig[],
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入模板名称', trigger: 'blur' }],
}

/** 创建模板 */
function handleCreate() {
  isEdit.value = false
  editId.value = 0
  formData.name = ''
  formData.description = ''
  formData.status = FormTemplateStatus.Draft
  formData.fields = []
  dialogVisible.value = true
}

/** 编辑模板 */
function handleEdit(row: FormTemplate) {
  isEdit.value = true
  editId.value = row.id
  formData.name = row.name
  formData.description = row.description || ''
  formData.status = row.status
  formData.fields = JSON.parse(JSON.stringify(normalizeFields(row.fields || [])))
  dialogVisible.value = true
}

function buildFieldsPayload(fields: FormFieldConfig[]) {
  return JSON.stringify(
    (fields || []).map((f, i) => ({
      field_key: f.id || `field_${i + 1}`,
      label: f.label,
      type: f.field_type,
      required: Boolean(f.required),
      placeholder: f.placeholder || undefined,
      default_value: f.default_value || undefined,
      description: f.description || undefined,
      options: f.options && f.options.length ? f.options : undefined,
      validation: {
        min: f.min,
        max: f.max,
        maxLength: f.max_length,
      },
      sort: i,
    })),
  )
}

/** 提交模板 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  if (formData.fields.length === 0) {
    ElMessage.warning('请至少添加一个字段')
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      status: toBackendStatus(formData.status),
      fields: buildFieldsPayload(formData.fields),
    }
    if (isEdit.value) {
      await updateFormTemplate(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createFormTemplate(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

/** 仅改启用/停用：带上名称与字段，兼容仍强制校验的旧后端 */
async function updateTemplateStatus(row: FormTemplate, status: 0 | 1, actionLabel: string) {
  try {
    await ElMessageBox.confirm(`确定${actionLabel}模板「${row.name}」？`, `${actionLabel}确认`)
    await updateFormTemplate(row.id, {
      name: row.name,
      description: row.description || undefined,
      fields: buildFieldsPayload(normalizeFields(row.fields || [])),
      status: status as any,
    })
    ElMessage.success(`已${actionLabel}`)
    fetchList()
  } catch (err: any) {
    if (err === 'cancel' || err === 'close') return
    ElMessage.error(err?.message || `${actionLabel}失败`)
  }
}

/** 启用 */
function handleActivate(row: FormTemplate) {
  return updateTemplateStatus(row, 1, '启用')
}

/** 停用 */
function handleDeactivate(row: FormTemplate) {
  return updateTemplateStatus(row, 0, '停用')
}

/** 删除 */
async function handleDelete(row: FormTemplate) {
  await ElMessageBox.confirm(`确定删除模板「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deleteFormTemplate(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/** 查看提交数据 */
function handleViewSubmissions(row: FormTemplate) {
  router.push({ name: 'FormSubmissions', query: { templateId: row.id.toString() } })
}

// ==================== 字段配置 ====================

type FieldPreset = {
  tip?: string
  labelHint?: string
  placeholder?: string
  placeholderHint?: string
  defaultHint?: string
  description?: string
  descriptionHint?: string
  lockPlaceholder?: boolean
  lockDefault?: boolean
  lockDescription?: boolean
  hidePlaceholder?: boolean
  hideDefault?: boolean
  hideDescription?: boolean
  defaultLabel?: string
  maxLength?: number
  min?: number
  max?: number
}

const FIELD_PRESETS: Partial<Record<FormFieldType, FieldPreset>> = {
  [FormFieldType.Text]: {
    labelHint: '如：姓名、公司名称',
    placeholderHint: '例如：请输入真实姓名',
  },
  [FormFieldType.Textarea]: {
    labelHint: '如：备注、详细地址',
    placeholderHint: '例如：请简要说明需求',
  },
  [FormFieldType.Number]: {
    labelHint: '如：人数、预算',
    placeholderHint: '例如：请输入数字',
  },
  [FormFieldType.Email]: {
    tip: '邮箱格式已固定：系统会按邮箱规则校验，提示文案已写好，无需自行填写。',
    labelHint: '如：联系邮箱',
    placeholder: '例如：name@example.com',
    description: '请填写有效的邮箱地址',
    lockPlaceholder: true,
    lockDescription: true,
  },
  [FormFieldType.Phone]: {
    tip: '手机号格式已固定：系统按 11 位手机号校验，提示文案已写好。',
    labelHint: '如：联系电话',
    placeholder: '例如：13800138000',
    description: '请填写 11 位手机号码',
    lockPlaceholder: true,
    lockDescription: true,
  },
  [FormFieldType.Select]: {
    tip: '下拉选择：请添加可选答案，填表人从中挑一项。',
    labelHint: '如：所在城市、意向套餐',
    hidePlaceholder: true,
  },
  [FormFieldType.Radio]: {
    tip: '单选：请添加可选答案，填表人只能选一项。',
    labelHint: '如：性别、是否到店',
    hidePlaceholder: true,
  },
  [FormFieldType.Checkbox]: {
    tip: '多选：请添加可选答案，填表人可选多项。',
    labelHint: '如：感兴趣的服务',
    hidePlaceholder: true,
  },
  [FormFieldType.Date]: {
    tip: '日期选择器已固定，填表人直接点选日期，无需手写格式。',
    labelHint: '如：预约日期、出生日期',
    placeholder: '请选择日期',
    lockPlaceholder: true,
    hideDescription: false,
  },
  [FormFieldType.Time]: {
    tip: '时间选择器已固定，填表人直接点选时间。',
    labelHint: '如：到店时间',
    placeholder: '请选择时间',
    lockPlaceholder: true,
  },
  [FormFieldType.DateTime]: {
    tip: '日期时间选择器已固定，填表人直接点选。',
    labelHint: '如：预约到店时间',
    placeholder: '请选择日期和时间',
    lockPlaceholder: true,
  },
  [FormFieldType.Image]: {
    tip: '图片上传组件已固定，填表人点选相册/拍照即可。',
    labelHint: '如：门店照片、证件照',
    hidePlaceholder: true,
    hideDefault: true,
  },
  [FormFieldType.File]: {
    tip: '文件上传组件已固定，填表人选择文件即可。',
    labelHint: '如：合同附件',
    hidePlaceholder: true,
    hideDefault: true,
  },
  [FormFieldType.Rate]: {
    tip: '评分组件已固定为星级评分。',
    labelHint: '如：服务满意度',
    hidePlaceholder: true,
    min: 1,
    max: 5,
  },
  [FormFieldType.Switch]: {
    tip: '开关组件已固定为开/关两种状态。',
    labelHint: '如：是否需要发票',
    hidePlaceholder: true,
  },
}

const fieldDialogVisible = ref(false)
const fieldEditMode = ref<'add' | 'edit'>('add')
const fieldEditIndex = ref(-1)
const fieldFormRef = ref<FormInstance>()

const fieldFormData = reactive<{
  label: string
  field_type: FormFieldType
  placeholder: string
  default_value: string
  description: string
  required: boolean
  max_length: number | undefined
  min: number | undefined
  max: number | undefined
  options: FormFieldOption[]
}>({
  label: '',
  field_type: FormFieldType.Text,
  placeholder: '',
  default_value: '',
  description: '',
  required: false,
  max_length: undefined,
  min: undefined,
  max: undefined,
  options: [],
})

const fieldFormRules: FormRules = {
  label: [{ required: true, message: '请填写问题名称', trigger: 'blur' }],
}

const fieldPreset = computed(() => FIELD_PRESETS[fieldFormData.field_type] || {})
const currentTypeLabel = computed(() => FormFieldTypeLabels[fieldFormData.field_type] || fieldFormData.field_type)

const needOptions = computed(() =>
  [FormFieldType.Select, FormFieldType.Radio, FormFieldType.Checkbox].includes(fieldFormData.field_type),
)

const needMaxLength = computed(() =>
  [FormFieldType.Text, FormFieldType.Textarea].includes(fieldFormData.field_type),
)

const needMinMax = computed(() =>
  [FormFieldType.Number, FormFieldType.Rate].includes(fieldFormData.field_type),
)

const showPlaceholder = computed(() => !fieldPreset.value.hidePlaceholder)
const showDefaultValue = computed(() => !fieldPreset.value.hideDefault)
const showDescription = computed(() => !fieldPreset.value.hideDescription)

const defaultValueMode = computed(() => {
  const t = fieldFormData.field_type
  if (t === FormFieldType.Number) return 'number'
  if (t === FormFieldType.Switch) return 'switch'
  if (t === FormFieldType.Rate) return 'rate'
  if (t === FormFieldType.Date) return 'date'
  if (t === FormFieldType.Time) return 'time'
  if (t === FormFieldType.DateTime) return 'datetime'
  if ([FormFieldType.Select, FormFieldType.Radio, FormFieldType.Checkbox, FormFieldType.Image, FormFieldType.File].includes(t)) {
    return 'hidden'
  }
  return 'text'
})

const defaultNumberValue = computed({
  get: () => {
    const n = Number(fieldFormData.default_value)
    return Number.isFinite(n) && fieldFormData.default_value !== '' ? n : undefined
  },
  set: (v: number | undefined) => {
    fieldFormData.default_value = v === undefined || v === null ? '' : String(v)
  },
})

const defaultSwitchValue = computed({
  get: () => fieldFormData.default_value === '1' || fieldFormData.default_value === 'true',
  set: (v: boolean) => {
    fieldFormData.default_value = v ? '1' : '0'
  },
})

const defaultRateValue = computed({
  get: () => {
    const n = Number(fieldFormData.default_value)
    return Number.isFinite(n) && n > 0 ? n : 0
  },
  set: (v: number) => {
    fieldFormData.default_value = v ? String(v) : ''
  },
})

function applyTypePreset(type: FormFieldType, force = false) {
  const preset = FIELD_PRESETS[type] || {}
  if (force || preset.lockPlaceholder || !fieldFormData.placeholder) {
    if (preset.placeholder !== undefined) fieldFormData.placeholder = preset.placeholder
  }
  if (force || preset.lockDescription || !fieldFormData.description) {
    if (preset.description !== undefined) fieldFormData.description = preset.description
  }
  if (preset.maxLength && !fieldFormData.max_length) fieldFormData.max_length = preset.maxLength
  if (preset.min !== undefined && fieldFormData.min === undefined) fieldFormData.min = preset.min
  if (preset.max !== undefined && fieldFormData.max === undefined) fieldFormData.max = preset.max
  if (needOptions.value && fieldFormData.options.length === 0) {
    fieldFormData.options = [
      { label: '选项一', value: '选项一' },
      { label: '选项二', value: '选项二' },
    ]
  }
}

/** 添加字段 */
function handleAddField(type: FormFieldType) {
  fieldEditMode.value = 'add'
  fieldEditIndex.value = -1
  resetFieldForm()
  fieldFormData.field_type = type
  applyTypePreset(type, true)
  fieldDialogVisible.value = true
}

/** 编辑字段 */
function handleEditField(index: number) {
  fieldEditMode.value = 'edit'
  fieldEditIndex.value = index
  const field = formData.fields[index]
  fieldFormData.label = field.label
  fieldFormData.field_type = field.field_type
  fieldFormData.placeholder = field.placeholder || ''
  fieldFormData.default_value = field.default_value || ''
  fieldFormData.description = field.description || ''
  fieldFormData.required = field.required
  fieldFormData.max_length = field.max_length
  fieldFormData.min = field.min
  fieldFormData.max = field.max
  fieldFormData.options = field.options ? JSON.parse(JSON.stringify(field.options)) : []
  // 锁定类型补齐固定文案
  applyTypePreset(field.field_type, false)
  if (FIELD_PRESETS[field.field_type]?.lockPlaceholder && FIELD_PRESETS[field.field_type]?.placeholder) {
    fieldFormData.placeholder = FIELD_PRESETS[field.field_type]!.placeholder!
  }
  if (FIELD_PRESETS[field.field_type]?.lockDescription && FIELD_PRESETS[field.field_type]?.description) {
    fieldFormData.description = FIELD_PRESETS[field.field_type]!.description!
  }
  fieldDialogVisible.value = true
}

/** 删除字段 */
function handleRemoveField(index: number) {
  formData.fields.splice(index, 1)
}

/** 重置字段表单 */
function resetFieldForm() {
  fieldFormData.label = ''
  fieldFormData.placeholder = ''
  fieldFormData.default_value = ''
  fieldFormData.description = ''
  fieldFormData.required = false
  fieldFormData.max_length = undefined
  fieldFormData.min = undefined
  fieldFormData.max = undefined
  fieldFormData.options = []
}

function syncOptionValue(idx: number) {
  const opt = fieldFormData.options[idx]
  if (!opt) return
  opt.value = opt.label.trim()
}

function removeOption(idx: number) {
  fieldFormData.options.splice(idx, 1)
}

/** 添加选项 */
function handleAddOption() {
  if (!fieldFormData.options) fieldFormData.options = []
  const n = fieldFormData.options.length + 1
  fieldFormData.options.push({ label: `选项${n}`, value: `选项${n}` })
}

/** 提交字段配置 */
async function handleFieldSubmit() {
  const valid = await fieldFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (needOptions.value) {
    const options = (fieldFormData.options || [])
      .map((o) => ({ label: o.label.trim(), value: (o.label || o.value).trim() }))
      .filter((o) => o.label)
    if (!options.length) {
      ElMessage.warning('请至少添加一个可选答案')
      return
    }
    fieldFormData.options = options
  }

  // 固定类型强制写回预设
  const preset = FIELD_PRESETS[fieldFormData.field_type]
  if (preset?.lockPlaceholder && preset.placeholder) {
    fieldFormData.placeholder = preset.placeholder
  }
  if (preset?.lockDescription && preset.description) {
    fieldFormData.description = preset.description
  }

  const config: FormFieldConfig = {
    id:
      fieldEditMode.value === 'edit' && fieldEditIndex.value >= 0
        ? formData.fields[fieldEditIndex.value].id
        : `field_${Date.now()}`,
    label: fieldFormData.label.trim(),
    field_type: fieldFormData.field_type,
    placeholder: showPlaceholder.value ? fieldFormData.placeholder || undefined : undefined,
    default_value:
      showDefaultValue.value && defaultValueMode.value !== 'hidden'
        ? fieldFormData.default_value || undefined
        : undefined,
    description: showDescription.value ? fieldFormData.description || undefined : undefined,
    required: fieldFormData.required,
    sort: fieldEditMode.value === 'edit' ? formData.fields[fieldEditIndex.value].sort : formData.fields.length,
    ...(needMaxLength.value && fieldFormData.max_length ? { max_length: fieldFormData.max_length } : {}),
    ...(needMinMax.value ? { min: fieldFormData.min, max: fieldFormData.max } : {}),
    ...(needOptions.value
      ? { options: fieldFormData.options.map((o) => ({ label: o.label, value: o.label })) }
      : {}),
  }

  if (fieldEditMode.value === 'edit' && fieldEditIndex.value >= 0) {
    formData.fields[fieldEditIndex.value] = config
  } else {
    formData.fields.push(config)
  }

  fieldDialogVisible.value = false
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.form-template-container {
  .search-card {
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .type-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-start;
  }

  .type-empty {
    color: #98a2b3;
    font-size: 12px;
  }

  .op-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0 2px;
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .field-config-area {
    width: 100%;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 4px;
    padding: 12px;

    .field-type-palette {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px dashed var(--el-border-color-lighter);

      .palette-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        margin-right: 4px;
      }
    }

    .field-list {
      .field-item {
        padding: 8px 12px;
        margin-bottom: 6px;
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 4px;
        background: var(--el-fill-color-lighter);
        transition: all 0.2s;

        &:hover {
          border-color: var(--el-color-primary-light-5);
        }

        .field-item-header {
          display: flex;
          align-items: center;
          gap: 8px;

          .drag-handle {
            cursor: move;
            color: var(--el-text-color-secondary);
          }

          .field-index {
            font-size: 12px;
            color: var(--el-text-color-secondary);
          }

          .field-label-text {
            flex: 1;
            font-weight: 500;
          }

          .field-actions {
            display: flex;
            gap: 4px;
          }
        }
      }
    }
  }

  .option-list {
    width: 100%;

    .option-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
  }
}

.field-help {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: #8a94a6;
}

.field-type-lock {
  margin-left: 8px;
  font-size: 12px;
  color: #8a94a6;
}
</style>
