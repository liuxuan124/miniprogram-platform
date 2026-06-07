<template>
  <div class="income-expense-page">
    <div class="page-header">
      <div class="page-title">收支明细</div>
      <div class="page-desc">企业收支记录的录入、分类与管理</div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="search.keyword"
        class="toolbar-input"
        placeholder="搜索描述/对方单位"
        clearable
        @keyup.enter="loadList"
      />
      <el-select v-model="search.type" class="toolbar-select" placeholder="类型：全部" clearable @change="loadList">
        <el-option label="收入" value="income" />
        <el-option label="支出" value="expense" />
      </el-select>
      <el-select v-model="search.category" class="toolbar-select" placeholder="分类：全部" clearable @change="loadList">
        <el-option
          v-for="cat in categoryOptions"
          :key="cat.name"
          :label="cat.name"
          :value="cat.name"
        />
      </el-select>
      <el-date-picker
        v-model="search.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        class="toolbar-daterange"
        @change="loadList"
      />
      <el-select v-model="search.approvalStatus" class="toolbar-select" placeholder="审批状态：全部" clearable @change="loadList">
        <el-option label="待审批" value="pending" />
        <el-option label="已审批" value="approved" />
        <el-option label="已驳回" value="rejected" />
      </el-select>
      <div class="toolbar-spacer" />
      <el-button @click="handleImport">导入</el-button>
      <el-button @click="handleExport">导出</el-button>
      <el-button type="primary" @click="openCreateDialog">+ 新建记录</el-button>
    </div>

    <div class="table-panel">
      <el-table :data="tableData" stripe v-loading="loading">
        <el-table-column label="日期" width="120" prop="transactionDate" />
        <el-table-column label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small" effect="plain">
              {{ TransactionTypeLabels[row.type as TransactionType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="分类" min-width="140">
          <template #default="{ row }">
            {{ row.category }}{{ row.subCategory ? ' / ' + row.subCategory : '' }}
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column label="金额" width="130" align="right">
          <template #default="{ row }">
            <span :style="{ color: row.type === 'income' ? '#0faa6e' : '#f56c6c', fontWeight: 600 }">
              {{ row.type === 'income' ? '+' : '-' }}¥{{ formatAmount(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="收款/付款方" min-width="130" prop="counterparty" show-overflow-tooltip>
          <template #default="{ row }">{{ row.counterparty || '-' }}</template>
        </el-table-column>
        <el-table-column label="支付方式" width="110" align="center">
          <template #default="{ row }">
            {{ PaymentMethodLabels[row.paymentMethod] || row.paymentMethod || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="发票状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="invoiceTagType(row.invoiceStatus)" size="small" effect="plain">
              {{ invoiceStatusLabel(row.invoiceStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="审批状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="approvalTagType(row.approvalStatus)" size="small">
              {{ ApprovalStatusLabels[row.approvalStatus] || row.approvalStatus }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            <el-button
              v-if="row.approvalStatus === 'pending'"
              link
              type="warning"
              size="small"
              @click="openApprovalDialog(row)"
            >审批</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrap" v-if="total > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadList"
          @current-change="loadList"
        />
      </div>
    </div>

    <!-- 新建/编辑对话框 -->
    <el-dialog
      v-model="formDialogVisible"
      :title="isEditing ? '编辑记录' : '新建记录'"
      width="580px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="收支类型" prop="type">
          <el-radio-group v-model="formData.type" @change="onTypeChange">
            <el-radio value="income">收入</el-radio>
            <el-radio value="expense">支出</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="formData.amount"
            :min="0.01"
            :precision="2"
            :step="100"
            style="width: 100%"
            placeholder="请输入金额"
          />
        </el-form-item>
        <el-form-item label="一级分类" prop="category">
          <el-select v-model="formData.category" style="width: 100%" placeholder="请选择一级分类" @change="onCategoryChange">
            <el-option
              v-for="cat in filteredCategories"
              :key="cat.name"
              :label="cat.name"
              :value="cat.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="二级分类" prop="subCategory">
          <el-select v-model="formData.subCategory" style="width: 100%" placeholder="请选择二级分类" clearable>
            <el-option
              v-for="sub in subCategoryOptions"
              :key="sub.name"
              :label="sub.name"
              :value="sub.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="请输入收支描述" />
        </el-form-item>
        <el-form-item label="交易日期" prop="transactionDate">
          <el-date-picker
            v-model="formData.transactionDate"
            value-format="YYYY-MM-DD"
            type="date"
            style="width: 100%"
            placeholder="请选择交易日期"
          />
        </el-form-item>
        <el-form-item label="支付方式" prop="paymentMethod">
          <el-select v-model="formData.paymentMethod" style="width: 100%" placeholder="请选择支付方式">
            <el-option
              v-for="(label, key) in PaymentMethodLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="收款/付款方" prop="counterparty">
          <el-input v-model="formData.counterparty" placeholder="请输入收款/付款方名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting" @click="submitForm">
          {{ isEditing ? '保存修改' : '创建记录' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 审批对话框 -->
    <el-dialog v-model="approvalDialogVisible" title="审批记录" width="460px" destroy-on-close>
      <div style="margin-bottom: 16px">
        <span>当前记录金额：<b>¥{{ formatAmount(approvalRow?.amount || 0) }}</b></span>
        <span style="margin-left: 16px">描述：{{ approvalRow?.description || '-' }}</span>
      </div>
      <el-form label-width="80px">
        <el-form-item label="审批意见">
          <el-input v-model="approvalReason" type="textarea" :rows="3" placeholder="可选，填写审批意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="approvalDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="approvalSubmitting" @click="submitApproval('rejected')">驳回</el-button>
        <el-button type="success" :loading="approvalSubmitting" @click="submitApproval('approved')">通过</el-button>
      </template>
    </el-dialog>

    <!-- 隐藏文件上传 -->
    <input ref="fileInputRef" type="file" accept=".xlsx,.xls,.csv" style="display: none" @change="onFileChange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { extractPageRecords } from '@/utils/pagination'
import {
  getTransactionList,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  getTransactionCategories,
  exportTransactions,
  importTransactions,
} from '@/api/finance'
import type {
  TransactionRecord,
  TransactionListParams,
  TransactionFormData,
  TransactionCategory,
} from '@/types/finance'
import { TransactionTypeLabels, ApprovalStatusLabels, PaymentMethodLabels, type TransactionType } from '@/types/finance'

// ==================== 列表与搜索 ====================

const loading = ref(false)
const tableData = ref<TransactionRecord[]>([])
const total = ref(0)

const search = reactive({
  keyword: '',
  type: '' as '' | 'income' | 'expense',
  category: '',
  dateRange: null as [string, string] | null,
  approvalStatus: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
})

async function loadList() {
  loading.value = true
  try {
    const params: TransactionListParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: search.keyword || undefined,
      type: search.type || undefined,
      category: search.category || undefined,
      startDate: search.dateRange?.[0] || undefined,
      endDate: search.dateRange?.[1] || undefined,
      approvalStatus: search.approvalStatus || undefined,
    }
    const res = await getTransactionList(params)
    const pageData = extractPageRecords<TransactionRecord>(res)
    tableData.value = pageData.list
    total.value = pageData.total
  } catch {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// ==================== 分类数据 ====================

const categories = ref<TransactionCategory[]>([])

async function loadCategories() {
  try {
    const res = await getTransactionCategories()
    categories.value = Array.isArray((res as any).data) ? (res as any).data : []
  } catch {
    categories.value = []
  }
}

const categoryOptions = computed(() => {
  return categories.value.filter((c) => !c.parentId)
})

const filteredCategories = computed(() => {
  return categories.value.filter((c) => !c.parentId && (!formData.type || c.type === formData.type))
})

const subCategoryOptions = computed(() => {
  if (!formData.category) return []
  const parent = categories.value.find((c) => c.name === formData.category && !c.parentId)
  if (!parent) return []
  return categories.value.filter((c) => c.parentId === parent.id)
})

// ==================== 新建/编辑表单 ====================

const formDialogVisible = ref(false)
const formSubmitting = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()

const formData = reactive<TransactionFormData>({
  type: 'income',
  amount: 0,
  category: '',
  subCategory: '',
  description: '',
  transactionDate: '',
  paymentMethod: '',
  counterparty: '',
})

const formRules: FormRules = {
  type: [{ required: true, message: '请选择收支类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  category: [{ required: true, message: '请选择一级分类', trigger: 'change' }],
  transactionDate: [{ required: true, message: '请选择交易日期', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
}

function resetForm() {
  formData.type = 'income'
  formData.amount = 0
  formData.category = ''
  formData.subCategory = ''
  formData.description = ''
  formData.transactionDate = ''
  formData.paymentMethod = ''
  formData.counterparty = ''
}

function openCreateDialog() {
  isEditing.value = false
  editingId.value = null
  resetForm()
  formDialogVisible.value = true
}

function openEditDialog(row: TransactionRecord) {
  isEditing.value = true
  editingId.value = row.id
  formData.type = row.type
  formData.amount = row.amount
  formData.category = row.category
  formData.subCategory = row.subCategory
  formData.description = row.description
  formData.transactionDate = row.transactionDate
  formData.paymentMethod = row.paymentMethod
  formData.counterparty = row.counterparty
  formDialogVisible.value = true
}

function onTypeChange() {
  formData.category = ''
  formData.subCategory = ''
}

function onCategoryChange() {
  formData.subCategory = ''
}

async function submitForm() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  formSubmitting.value = true
  try {
    if (isEditing.value && editingId.value) {
      await updateTransaction(editingId.value, { ...formData })
      ElMessage.success('修改成功')
    } else {
      await createTransaction({ ...formData })
      ElMessage.success('创建成功')
    }
    formDialogVisible.value = false
    loadList()
  } finally {
    formSubmitting.value = false
  }
}

// ==================== 删除 ====================

async function handleDelete(row: TransactionRecord) {
  await ElMessageBox.confirm(`确定删除该条${TransactionTypeLabels[row.type]}记录（¥${formatAmount(row.amount)}）？`, '删除确认', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
  await deleteTransaction(row.id)
  ElMessage.success('删除成功')
  loadList()
}

// ==================== 审批 ====================

const approvalDialogVisible = ref(false)
const approvalSubmitting = ref(false)
const approvalRow = ref<TransactionRecord | null>(null)
const approvalReason = ref('')

function openApprovalDialog(row: TransactionRecord) {
  approvalRow.value = row
  approvalReason.value = ''
  approvalDialogVisible.value = true
}

async function submitApproval(status: 'approved' | 'rejected') {
  if (!approvalRow.value) return
  approvalSubmitting.value = true
  try {
    await approveTransaction(approvalRow.value.id, status, approvalReason.value || undefined)
    ElMessage.success(status === 'approved' ? '审批通过' : '已驳回')
    approvalDialogVisible.value = false
    loadList()
  } finally {
    approvalSubmitting.value = false
  }
}

// ==================== 导入/导出 ====================

const fileInputRef = ref<HTMLInputElement>()

function handleImport() {
  fileInputRef.value?.click()
}

async function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await importTransactions(fd)
    const result = (res as any).data || {}
    const success = result.success ?? 0
    const failed = result.failed ?? 0
    ElMessage.success(failed > 0 ? `导入完成：成功 ${success} 条，失败 ${failed} 条` : `导入成功 ${success} 条`)
    loadList()
  } catch {
    ElMessage.error('导入失败，请检查文件格式')
  } finally {
    target.value = ''
  }
}

async function handleExport() {
  try {
    const params: TransactionListParams = {
      keyword: search.keyword || undefined,
      type: search.type || undefined,
      category: search.category || undefined,
      startDate: search.dateRange?.[0] || undefined,
      endDate: search.dateRange?.[1] || undefined,
      approvalStatus: search.approvalStatus || undefined,
    }
    const res = await exportTransactions(params)
    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `收支明细-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch {
    ElMessage.error('导出失败')
  }
}

// ==================== 辅助函数 ====================

function formatAmount(val: number): string {
  return Number(val).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function invoiceTagType(status: string): 'info' | 'warning' | 'success' | 'danger' {
  const map: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
    none: 'info',
    pending: 'warning',
    received: 'success',
    issued: 'success',
  }
  return map[status] || 'info'
}

function invoiceStatusLabel(status: string): string {
  const map: Record<string, string> = {
    none: '无发票',
    pending: '待开具',
    received: '已收到',
    issued: '已开具',
  }
  return map[status] || status || '-'
}

function approvalTagType(status: string): 'warning' | 'success' | 'danger' {
  const map: Record<string, 'warning' | 'success' | 'danger'> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  }
  return map[status] || 'warning'
}

// ==================== 初始化 ====================

onMounted(() => {
  loadCategories()
  loadList()
})
</script>

<style lang="scss" scoped>
.income-expense-page {
  .page-header {
    margin-bottom: 16px;
  }

  .page-title {
    font-size: 22px;
    line-height: 1.2;
    color: #0d1b2e;
    font-weight: 800;
  }

  .page-desc {
    margin-top: 6px;
    color: #6b7b93;
    font-size: 13px;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    flex-wrap: wrap;
  }

  .toolbar-input {
    width: 180px;
  }

  .toolbar-select {
    width: 150px;
  }

  .toolbar-daterange {
    width: 260px;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .table-panel {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }
}
</style>
