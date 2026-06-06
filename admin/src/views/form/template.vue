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
      <el-table v-loading="loading" :data="templateList" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="模板名称" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link type="primary" @click="handleEdit(row)">{{ row.name }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column prop="fields" label="字段数" width="90" align="center">
          <template #default="{ row }">{{ row.fields?.length || 0 }}</template>
        </el-table-column>
        <el-table-column prop="submission_count" label="提交数" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170" align="center" />
        <el-table-column label="操作" width="320" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button
              v-if="row.status !== 'active'"
              link type="success" size="small"
              @click="handleActivate(row)"
            >
              <el-icon><CircleCheck /></el-icon>启用
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              link type="warning" size="small"
              @click="handleDeactivate(row)"
            >
              <el-icon><CircleClose /></el-icon>停用
            </el-button>
            <el-button link type="info" size="small" @click="handleViewSubmissions(row)">
              <el-icon><Document /></el-icon>数据
            </el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>删除
            </el-button>
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
              <span class="palette-label">点击添加字段：</span>
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
      :title="fieldEditMode === 'edit' ? '编辑字段' : '添加字段'"
      width="560px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="fieldFormRef" :model="fieldFormData" :rules="fieldFormRules" label-width="100px">
        <el-form-item label="字段标签" prop="label">
          <el-input v-model="fieldFormData.label" placeholder="如：姓名、电话、地址" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="字段类型" prop="field_type">
          <el-select v-model="fieldFormData.field_type" :disabled="fieldEditMode === 'edit'" style="width: 100%">
            <el-option
              v-for="(label, key) in FormFieldTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="占位提示">
          <el-input v-model="fieldFormData.placeholder" placeholder="请输入占位提示文字" />
        </el-form-item>
        <el-form-item label="默认值">
          <el-input v-model="fieldFormData.default_value" placeholder="请输入默认值" />
        </el-form-item>
        <el-form-item label="字段说明">
          <el-input v-model="fieldFormData.description" placeholder="字段的补充说明" />
        </el-form-item>
        <el-form-item label="是否必填">
          <el-switch v-model="fieldFormData.required" />
        </el-form-item>
        <el-form-item v-if="needMaxLength" label="最大长度">
          <el-input-number v-model="fieldFormData.max_length" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item v-if="needMinMax" label="最小值">
          <el-input-number v-model="fieldFormData.min" />
        </el-form-item>
        <el-form-item v-if="needMinMax" label="最大值">
          <el-input-number v-model="fieldFormData.max" />
        </el-form-item>
        <!-- 选项配置（Select/Radio/Checkbox） -->
        <el-form-item v-if="needOptions" label="选项列表" prop="options">
          <div class="option-list">
            <div v-for="(opt, idx) in fieldFormData.options" :key="idx" class="option-row">
              <el-input v-model="opt.label" placeholder="显示文本" style="width: 180px" />
              <el-input v-model="opt.value" placeholder="值" style="width: 120px" />
              <el-button link type="danger" icon="Delete" @click="fieldFormData.options?.splice(idx, 1)" />
            </div>
            <el-button type="primary" link icon="Plus" @click="handleAddOption">添加选项</el-button>
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
      fields: JSON.stringify(
        formData.fields.map((f, i) => ({
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
        }))
      ),
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

/** 启用 */
async function handleActivate(row: FormTemplate) {
  await ElMessageBox.confirm(`确定启用模板「${row.name}」？`, '启用确认')
  await updateFormTemplate(row.id, { status: 1 as any })
  ElMessage.success('已启用')
  fetchList()
}

/** 停用 */
async function handleDeactivate(row: FormTemplate) {
  await ElMessageBox.confirm(`确定停用模板「${row.name}」？`, '停用确认')
  await updateFormTemplate(row.id, { status: 0 as any })
  ElMessage.success('已停用')
  fetchList()
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
  label: [{ required: true, message: '请输入字段标签', trigger: 'blur' }],
  field_type: [{ required: true, message: '请选择字段类型', trigger: 'change' }],
}

/** 是否需要选项配置 */
const needOptions = computed(() => {
  return [FormFieldType.Select, FormFieldType.Radio, FormFieldType.Checkbox].includes(fieldFormData.field_type)
})

/** 是否需要最大长度 */
const needMaxLength = computed(() => {
  return [FormFieldType.Text, FormFieldType.Textarea].includes(fieldFormData.field_type)
})

/** 是否需要最小/最大值 */
const needMinMax = computed(() => {
  return [FormFieldType.Number, FormFieldType.Rate].includes(fieldFormData.field_type)
})

/** 添加字段 */
function handleAddField(type: FormFieldType) {
  fieldEditMode.value = 'add'
  fieldEditIndex.value = -1
  resetFieldForm()
  fieldFormData.field_type = type
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

/** 添加选项 */
function handleAddOption() {
  if (!fieldFormData.options) fieldFormData.options = []
  fieldFormData.options.push({ label: '', value: '' })
}

/** 提交字段配置 */
async function handleFieldSubmit() {
  const valid = await fieldFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (needOptions.value && (!fieldFormData.options || fieldFormData.options.length === 0)) {
    ElMessage.warning('请至少添加一个选项')
    return
  }

  const config: FormFieldConfig = {
    id: fieldEditMode.value === 'edit' && fieldEditIndex.value >= 0
      ? formData.fields[fieldEditIndex.value].id
      : `field_${Date.now()}`,
    label: fieldFormData.label,
    field_type: fieldFormData.field_type,
    placeholder: fieldFormData.placeholder || undefined,
    default_value: fieldFormData.default_value || undefined,
    description: fieldFormData.description || undefined,
    required: fieldFormData.required,
    sort: fieldEditMode.value === 'edit' ? formData.fields[fieldEditIndex.value].sort : formData.fields.length,
    ...(needMaxLength.value && fieldFormData.max_length ? { max_length: fieldFormData.max_length } : {}),
    ...(needMinMax.value ? { min: fieldFormData.min, max: fieldFormData.max } : {}),
    ...(needOptions.value ? { options: fieldFormData.options.filter(o => o.label && o.value) } : {}),
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
</style>
