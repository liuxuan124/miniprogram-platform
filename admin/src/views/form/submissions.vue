<template>
  <div class="form-submissions-container">
    <!-- 搜索筛选区 -->
    <el-card shadow="hover" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="表单模板">
          <el-select
            v-model="searchForm.form_template_id"
            placeholder="选择模板"
            clearable
            style="width: 220px"
            @change="handleSearch"
          >
            <el-option
              v-for="tpl in templateOptions"
              :key="tpl.id"
              :label="tpl.name"
              :value="tpl.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="提交日期">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleDateChange"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="handleSearch">搜索</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据区 -->
    <el-card shadow="hover" class="table-card">
      <template #header>
        <div class="card-header">
          <span>表单提交数据</span>
          <el-button icon="Download" @click="handleExport">导出数据</el-button>
        </div>
      </template>

      <el-alert
        v-if="!searchForm.form_template_id"
        title="请先选择一个表单模板查看提交数据"
        type="info"
        :closable="false"
        show-icon
        style="margin-bottom: 16px"
      />

      <!-- 提交数据表格 -->
      <el-table
        v-if="searchForm.form_template_id"
        v-loading="loading"
        :data="submissionList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="submitter" label="提交人" width="120" align="center">
          <template #default="{ row }">{{ row.submitter || '-' }}</template>
        </el-table-column>
        <el-table-column prop="submitter_phone" label="联系电话" width="130" align="center">
          <template #default="{ row }">{{ row.submitter_phone || '-' }}</template>
        </el-table-column>
        <!-- 动态字段列 -->
        <el-table-column
          v-for="field in currentFields"
          :key="field.id"
          :label="field.label"
          :min-width="getFieldMinWidth(field)"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            {{ formatFieldValue(row.data?.[field.id], field) }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="提交时间" width="170" align="center" />
        <el-table-column label="操作" width="100" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div v-if="searchForm.form_template_id" class="pagination-wrapper">
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

    <!-- 提交详情弹窗 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="提交详情"
      width="600px"
      destroy-on-close
    >
      <el-descriptions :column="1" border>
        <el-descriptions-item label="提交人">{{ currentDetail.submitter || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentDetail.submitter_phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="提交时间">{{ currentDetail.created_at }}</el-descriptions-item>
      </el-descriptions>

      <el-divider>表单数据</el-divider>

      <el-descriptions :column="1" border>
        <el-descriptions-item
          v-for="field in currentFields"
          :key="field.id"
          :label="field.label"
        >
          {{ formatFieldValue(currentDetail.data?.[field.id], field) || '-' }}
        </el-descriptions-item>
      </el-descriptions>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getFormSubmissions } from '@/api/form'
import { getFormTemplateList } from '@/api/form'
import type { FormSubmission, FormFieldConfig, FormTemplate, FormSubmissionListParams } from '@/types/form'
import { FormTemplateStatus } from '@/types/form'

const route = useRoute()

/** 搜索表单 */
const searchForm = reactive<FormSubmissionListParams>({
  form_template_id: undefined as unknown as number,
  start_date: '',
  end_date: '',
})

/** 日期范围 */
const dateRange = ref<[string, string] | null>(null)

/** 分页 */
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

/** 列表数据 */
const submissionList = ref<FormSubmission[]>([])
const loading = ref(false)

/** 模板选项列表 */
const templateOptions = ref<FormTemplate[]>([])

/** 当前模板字段配置 */
const currentFields = computed<FormFieldConfig[]>(() => {
  if (!searchForm.form_template_id) return []
  const tpl = templateOptions.value.find(t => t.id === searchForm.form_template_id)
  return tpl?.fields || []
})

/** 详情弹窗 */
const detailDialogVisible = ref(false)
const currentDetail = ref<Partial<FormSubmission>>({})

function normalizeFields(rawFields: unknown): FormFieldConfig[] {
  try {
    const source = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields
    if (!Array.isArray(source)) return []
    return source.map((field: any, index: number) => ({
      id: field.id || field.field_key || `field_${index + 1}`,
      label: field.label || `字段${index + 1}`,
      field_type: field.field_type || field.type || 'text',
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
    status: Number(raw?.status) === 1 ? FormTemplateStatus.Active : FormTemplateStatus.Inactive,
    submission_count: Number(raw?.submission_count ?? raw?.submitCount ?? 0),
    created_at: raw?.created_at || raw?.createTime || '',
    updated_at: raw?.updated_at || raw?.updateTime || '',
  }
}

function normalizeSubmission(raw: any): FormSubmission {
  let data: Record<string, any> = {}
  try {
    data = typeof raw?.data === 'string' ? JSON.parse(raw.data) : (raw?.data || {})
  } catch {
    data = {}
  }
  return {
    id: Number(raw?.id || 0),
    form_template_id: Number(raw?.form_template_id || raw?.formId || 0),
    form_template_name: raw?.form_template_name || '',
    data,
    submitter: raw?.submitter || `用户${raw?.userId || raw?.user_id || '-'}`,
    submitter_phone: raw?.submitter_phone || '-',
    created_at: raw?.created_at || raw?.createTime || '',
  }
}

/** 获取模板列表（作为筛选选项） */
async function fetchTemplateOptions() {
  try {
    const res = await getFormTemplateList({ page: 1, page_size: 100 })
    const data = (res as any).data || {}
    const records = data.records || data.list || []
    templateOptions.value = Array.isArray(records) ? records.map((item: any) => normalizeTemplate(item)) : []
  } catch {
    templateOptions.value = []
  }
}

/** 获取提交列表 */
async function fetchList() {
  if (!searchForm.form_template_id) return
  loading.value = true
  try {
    const params: FormSubmissionListParams = {
      page: pagination.page,
      page_size: pagination.pageSize,
      form_template_id: searchForm.form_template_id,
      start_date: searchForm.start_date || undefined,
      end_date: searchForm.end_date || undefined,
    }
    const res = await getFormSubmissions(searchForm.form_template_id, params)
    const data = (res as any).data || {}
    const records = data.records || data.list || []
    submissionList.value = Array.isArray(records) ? records.map((item: any) => normalizeSubmission(item)) : []
    pagination.total = Number(data.total || 0)
  } catch {
    submissionList.value = []
  } finally {
    loading.value = false
  }
}

/** 日期范围变更 */
function handleDateChange(val: [string, string] | null) {
  if (val) {
    searchForm.start_date = val[0]
    searchForm.end_date = val[1]
  } else {
    searchForm.start_date = ''
    searchForm.end_date = ''
  }
}

/** 搜索 */
function handleSearch() {
  pagination.page = 1
  fetchList()
}

/** 重置 */
function handleReset() {
  searchForm.form_template_id = undefined as unknown as number
  searchForm.start_date = ''
  searchForm.end_date = ''
  dateRange.value = null
  pagination.page = 1
  submissionList.value = []
}

/** 查看详情 */
function handleViewDetail(row: FormSubmission) {
  currentDetail.value = row
  detailDialogVisible.value = true
}

/** 格式化字段值 */
function formatFieldValue(value: any, _field: FormFieldConfig): string {
  if (value === undefined || value === null || value === '') return '-'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'boolean') return value ? '是' : '否'
  return String(value)
}

/** 获取字段列最小宽度 */
function getFieldMinWidth(field: FormFieldConfig): number {
  if (field.field_type === 'textarea') return 200
  if (['select', 'radio', 'checkbox'].includes(field.field_type)) return 150
  return 120
}

/** 导出数据 */
function handleExport() {
  if (!searchForm.form_template_id) {
    ElMessage.warning('请先选择表单模板')
    return
  }
  if (!submissionList.value.length) {
    ElMessage.warning('暂无可导出的提交数据')
    return
  }

  const headers = ['ID', '提交人', '联系电话', ...currentFields.value.map((f) => f.label), '提交时间']
  const escapeCsv = (value: unknown) => {
    const text = String(value ?? '')
    if (/[",\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`
    }
    return text
  }

  const rows = submissionList.value.map((row) => {
    const dynamicValues = currentFields.value.map((field) => formatFieldValue(row.data?.[field.id], field))
    return [
      row.id,
      row.submitter || '-',
      row.submitter_phone || '-',
      ...dynamicValues,
      row.created_at || '-',
    ]
      .map(escapeCsv)
      .join(',')
  })

  const csv = [headers.map(escapeCsv).join(','), ...rows].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const template = templateOptions.value.find((tpl) => tpl.id === searchForm.form_template_id)
  const fileName = `表单提交数据-${template?.name || searchForm.form_template_id}-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

onMounted(async () => {
  await fetchTemplateOptions()
  // 从路由参数获取模板ID
  const tid = route.query.templateId
  if (tid) {
    searchForm.form_template_id = Number(tid)
    fetchList()
  }
})
</script>

<style lang="scss" scoped>
.form-submissions-container {
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
}
</style>
