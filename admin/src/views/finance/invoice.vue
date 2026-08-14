<template>
  <div class="invoice-page">
    <PageHeader
      kicker="财务管理 / 发票与税务"
      title="发票与税务"
      description="发票管理、核验与税务计算辅助。"
    />

    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- ==================== 发票管理 Tab ==================== -->
      <el-tab-pane label="发票管理" name="invoice">
        <div class="toolbar">
          <el-input
            v-model="searchForm.keyword"
            class="toolbar-input"
            placeholder="搜索发票号/公司名"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-select
            v-model="searchForm.invoiceType"
            class="toolbar-select"
            placeholder="类型：全部"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="(label, key) in InvoiceTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-select
            v-model="searchForm.invoiceStatus"
            class="toolbar-select"
            placeholder="状态：全部"
            clearable
            @change="handleSearch"
          >
            <el-option
              v-for="(label, key) in InvoiceStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            class="toolbar-daterange"
            @change="handleSearch"
          />
          <el-button @click="handleReset">重置</el-button>
          <div class="toolbar-spacer" />
          <el-button type="primary" @click="handleCreate">+ 新建发票</el-button>
        </div>

        <div class="table-panel">
          <el-table v-loading="loading" :data="tableData" stripe>
            <el-table-column prop="invoiceNumber" label="发票号码" min-width="160" show-overflow-tooltip />
            <el-table-column label="发票类型" width="130" align="center">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ InvoiceTypeLabels[row.invoiceType as InvoiceType] }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="(statusTagType(row.invoiceStatus) as any)" size="small" effect="plain">
                  {{ InvoiceStatusLabels[row.invoiceStatus as InvoiceStatus] }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="金额" width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="税额" width="110" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.taxAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="价税合计" width="120" align="right">
              <template #default="{ row }">
                <span class="total-amount">¥{{ formatMoney(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="税率" width="80" align="center">
              <template #default="{ row }">
                <span>{{ row.taxRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column prop="issuer" label="开票方" min-width="140" show-overflow-tooltip />
            <el-table-column prop="receiver" label="收票方" min-width="140" show-overflow-tooltip />
            <el-table-column prop="issueDate" label="开票日期" width="120" />
            <el-table-column label="操作" min-width="220">
              <template #default="{ row }">
                <el-button
                  v-if="row.invoiceStatus === 'draft'"
                  type="primary"
                  link
                  size="small"
                  @click="handleEdit(row)"
                >编辑</el-button>
                <el-button
                  v-if="row.invoiceStatus === 'draft'"
                  type="success"
                  link
                  size="small"
                  @click="handleIssue(row)"
                >开具</el-button>
                <el-button
                  v-if="row.invoiceStatus === 'pending' || row.invoiceStatus === 'issued'"
                  type="primary"
                  link
                  size="small"
                  @click="handleVerify(row)"
                >核验</el-button>
                <el-button
                  v-if="row.invoiceStatus !== 'cancelled' && row.invoiceStatus !== 'draft'"
                  type="warning"
                  link
                  size="small"
                  @click="handleCancel(row)"
                >作废</el-button>
                <el-button
                  v-if="row.invoiceStatus === 'draft'"
                  type="danger"
                  link
                  size="small"
                  @click="handleDelete(row)"
                >删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="pagination.total > 0" class="pagination-wrap">
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
        </div>
      </el-tab-pane>

      <!-- ==================== 税务计算 Tab ==================== -->
      <el-tab-pane label="税务计算" name="tax">
        <div class="tax-calc-container">
          <el-row :gutter="24">
            <!-- 左侧：计算表单 -->
            <el-col :span="10">
              <el-card>
                <template #header>
                  <span>税务计算器</span>
                </template>
                <el-form :model="taxForm" label-width="100px" :rules="taxFormRules" ref="taxFormRef">
                  <el-form-item label="收入类型" prop="type">
                    <el-select v-model="taxForm.type" placeholder="请选择收入类型" style="width: 100%">
                      <el-option label="商品销售" value="商品销售" />
                      <el-option label="服务收入" value="服务收入" />
                      <el-option label="其他" value="其他" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="金额" prop="amount">
                    <el-input-number
                      v-model="taxForm.amount"
                      :min="0"
                      :precision="2"
                      :step="100"
                      controls-position="right"
                      style="width: 100%"
                    />
                  </el-form-item>
                  <el-form-item label="税率" prop="taxRate">
                    <el-select v-model="taxForm.taxRate" placeholder="请选择税率" style="width: 100%">
                      <el-option label="0%" :value="0" />
                      <el-option label="1%" :value="1" />
                      <el-option label="3%" :value="3" />
                      <el-option label="6%" :value="6" />
                      <el-option label="9%" :value="9" />
                      <el-option label="13%" :value="13" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="是否含税">
                    <el-switch v-model="taxForm.includeTax" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="handleCalculate" :loading="calcLoading">计算</el-button>
                    <el-button @click="resetTaxForm">重置</el-button>
                  </el-form-item>
                </el-form>
              </el-card>
            </el-col>

            <!-- 右侧：计算结果 -->
            <el-col :span="14">
              <el-card v-if="taxResult">
                <template #header>
                  <span>计算结果</span>
                </template>
                <div class="result-card">
                  <div class="result-row">
                    <span class="result-label">含税总额</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.grossAmount ?? taxResult.taxableIncome) }}</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">不含税收入</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.taxableIncome) }}</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">增值税额</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.vatAmount) }}</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">附加税（增值税 × 12%）</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.surcharge) }}</span>
                  </div>
                  <div class="result-row">
                    <span class="result-label">企业所得税</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.incomeTax) }}</span>
                  </div>
                  <el-divider />
                  <div class="result-row highlight">
                    <span class="result-label">合计税费</span>
                    <span class="result-value">¥{{ formatMoney(taxResult.totalTax) }}</span>
                  </div>
                  <div class="result-row highlight">
                    <span class="result-label">税后收入</span>
                    <span class="result-value success">¥{{ formatMoney(taxResult.afterTaxIncome) }}</span>
                  </div>
                </div>
              </el-card>
              <el-empty v-else description="请填写左侧表单并点击计算" />
            </el-col>
          </el-row>

          <!-- 底部汇总卡片 -->
          <div class="tax-summary-row">
            <div class="tax-summary-card">
              <div class="summary-value">¥{{ formatMoney(taxSummary.totalInvoiced) }}</div>
              <div class="summary-label">本月已开票总额</div>
            </div>
            <div class="tax-summary-card success">
              <div class="summary-value">¥{{ formatMoney(taxSummary.totalPaid) }}</div>
              <div class="summary-label">本月已缴税额</div>
            </div>
            <div class="tax-summary-card warning">
              <div class="summary-value">¥{{ formatMoney(taxSummary.totalPending) }}</div>
              <div class="summary-label">本月待缴税额</div>
            </div>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 新建/编辑发票弹窗 ==================== -->
    <el-dialog
      v-model="invoiceDialogVisible"
      :title="isEdit ? '编辑发票' : '新建发票'"
      width="640px"
      destroy-on-close
    >
      <el-form :model="invoiceForm" :rules="invoiceFormRules" ref="invoiceFormRef" label-width="100px">
        <el-form-item label="发票号码" prop="invoiceNumber">
          <el-input v-model="invoiceForm.invoiceNumber" placeholder="请输入发票号码" />
        </el-form-item>
        <el-form-item label="发票类型" prop="invoiceType">
          <el-select v-model="invoiceForm.invoiceType" placeholder="请选择发票类型" style="width: 100%">
            <el-option
              v-for="(label, key) in InvoiceTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number
                v-model="invoiceForm.amount"
                :min="0"
                :precision="2"
                :step="100"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="税率" prop="taxRate">
              <el-select v-model="invoiceForm.taxRate" placeholder="请选择税率" style="width: 100%">
                <el-option label="0%" :value="0" />
                <el-option label="1%" :value="1" />
                <el-option label="3%" :value="3" />
                <el-option label="6%" :value="6" />
                <el-option label="9%" :value="9" />
                <el-option label="13%" :value="13" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="税额">
              <span class="auto-calc">¥{{ formatMoney(calcTaxAmount) }}</span>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价税合计">
              <span class="auto-calc total">¥{{ formatMoney(calcTotalAmount) }}</span>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开票方" prop="issuer">
              <el-input v-model="invoiceForm.issuer" placeholder="请输入开票方" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收票方" prop="receiver">
              <el-input v-model="invoiceForm.receiver" placeholder="请输入收票方" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="开票日期" prop="issueDate">
              <el-date-picker
                v-model="invoiceForm.issueDate"
                type="date"
                placeholder="请选择开票日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="到期日期" prop="dueDate">
              <el-date-picker
                v-model="invoiceForm.dueDate"
                type="date"
                placeholder="请选择到期日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="备注">
          <el-input
            v-model="invoiceForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="invoiceDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitInvoice">确定</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 作废发票弹窗 ==================== -->
    <el-dialog
      v-model="cancelDialogVisible"
      title="作废发票"
      width="500px"
      destroy-on-close
    >
      <el-form :model="cancelForm" :rules="cancelFormRules" ref="cancelFormRef" label-width="80px">
        <el-form-item label="作废原因" prop="reason">
          <el-input
            v-model="cancelForm.reason"
            type="textarea"
            :rows="4"
            placeholder="请输入作废原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="cancelDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="submitCancel">确认作废</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { extractPageRecords } from '@/utils/pagination'
import PageHeader from '@/components/PageHeader.vue'
import {
  getInvoiceList,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  issueInvoice,
  verifyInvoice,
  cancelInvoice,
  calculateTax,
  getInvoiceTaxSummary,
} from '@/api/finance'
import type {
  InvoiceRecord,
  InvoiceListParams,
  InvoiceFormData,
  InvoiceType,
  InvoiceStatus,
  TaxCalcResult,
} from '@/types/finance'
import { InvoiceTypeLabels, InvoiceStatusLabels } from '@/types/finance'

// ==================== 通用 ====================

const activeTab = ref('invoice')
const loading = ref(false)
const submitting = ref(false)
const calcLoading = ref(false)

/** 格式化金额 */
function formatMoney(val: number | undefined): string {
  if (val === undefined || val === null) return '0.00'
  return val.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 状态标签类型映射 */
function statusTagType(status: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    draft: 'info',
    pending: 'warning',
    issued: '',
    received: 'success',
    verified: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

// ==================== 发票列表 ====================

const tableData = ref<InvoiceRecord[]>([])
const dateRange = ref<string[]>([])

const searchForm = reactive({
  keyword: '',
  invoiceType: '' as string,
  invoiceStatus: '' as string,
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

async function fetchList() {
  loading.value = true
  try {
    const params: InvoiceListParams = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      invoiceType: (searchForm.invoiceType || undefined) as InvoiceType | undefined,
      invoiceStatus: (searchForm.invoiceStatus || undefined) as InvoiceStatus | undefined,
      startDate: dateRange.value?.[0] || undefined,
      endDate: dateRange.value?.[1] || undefined,
    }
    const res = await getInvoiceList(params)
    const pageData = extractPageRecords<InvoiceRecord>(res)
    tableData.value = pageData.list
    pagination.total = pageData.total
  } catch {
    ElMessage.error('获取发票列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  fetchList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.invoiceType = ''
  searchForm.invoiceStatus = ''
  dateRange.value = []
  pagination.page = 1
  fetchList()
}

// ==================== 新建/编辑发票 ====================

const invoiceDialogVisible = ref(false)
const isEdit = ref(false)
const editingId = ref<number | null>(null)
const invoiceFormRef = ref<FormInstance>()

const invoiceForm = reactive<InvoiceFormData>({
  invoiceNumber: '',
  invoiceType: 'vat_normal',
  amount: 0,
  taxRate: 6,
  issuer: '',
  receiver: '',
  issueDate: '',
  dueDate: '',
  description: '',
})

const invoiceFormRules: FormRules = {
  invoiceNumber: [{ required: true, message: '请输入发票号码', trigger: 'blur' }],
  invoiceType: [{ required: true, message: '请选择发票类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  taxRate: [{ required: true, message: '请选择税率', trigger: 'change' }],
  issuer: [{ required: true, message: '请输入开票方', trigger: 'blur' }],
  receiver: [{ required: true, message: '请输入收票方', trigger: 'blur' }],
  issueDate: [{ required: true, message: '请选择开票日期', trigger: 'change' }],
  dueDate: [{ required: true, message: '请选择到期日期', trigger: 'change' }],
}

/** 自动计算税额 */
const calcTaxAmount = computed(() => {
  return invoiceForm.amount * invoiceForm.taxRate / 100
})

/** 自动计算价税合计 */
const calcTotalAmount = computed(() => {
  return invoiceForm.amount + calcTaxAmount.value
})

function handleCreate() {
  isEdit.value = false
  editingId.value = null
  Object.assign(invoiceForm, {
    invoiceNumber: '',
    invoiceType: 'vat_normal',
    amount: 0,
    taxRate: 6,
    issuer: '',
    receiver: '',
    issueDate: '',
    dueDate: '',
    description: '',
  })
  invoiceDialogVisible.value = true
}

function handleEdit(row: InvoiceRecord) {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(invoiceForm, {
    invoiceNumber: row.invoiceNumber,
    invoiceType: row.invoiceType,
    amount: row.amount,
    taxRate: row.taxRate,
    issuer: row.issuer,
    receiver: row.receiver,
    issueDate: row.issueDate,
    dueDate: row.dueDate,
    description: row.description,
  })
  invoiceDialogVisible.value = true
}

async function submitInvoice() {
  if (!invoiceFormRef.value) return
  const valid = await invoiceFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value && editingId.value) {
      await updateInvoice(editingId.value, invoiceForm)
      ElMessage.success('发票更新成功')
    } else {
      await createInvoice(invoiceForm)
      ElMessage.success('发票创建成功')
    }
    invoiceDialogVisible.value = false
    fetchList()
    loadTaxSummary()
  } catch {
    ElMessage.error(isEdit.value ? '更新发票失败' : '创建发票失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 核验 / 开具 ====================

async function handleIssue(row: InvoiceRecord) {
  try {
    await ElMessageBox.confirm(
      `确认开具发票 ${row.invoiceNumber}？开具后不可再编辑。`,
      '开具确认',
      { type: 'info', confirmButtonText: '确认开具', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await issueInvoice(row.id)
    ElMessage.success('发票已开具')
    fetchList()
    loadTaxSummary()
  } catch {
    ElMessage.error('开具失败')
  }
}

async function handleVerify(row: InvoiceRecord) {
  try {
    await ElMessageBox.confirm(
      `确认核验发票 ${row.invoiceNumber}？`,
      '核验确认',
      { type: 'info', confirmButtonText: '确认核验', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await verifyInvoice(row.id)
    ElMessage.success('发票核验成功')
    fetchList()
    loadTaxSummary()
  } catch {
    ElMessage.error('核验失败')
  }
}

// ==================== 作废发票 ====================

const cancelDialogVisible = ref(false)
const cancelFormRef = ref<FormInstance>()
const currentCancelId = ref<number | null>(null)
const cancelForm = reactive({ reason: '' })

const cancelFormRules: FormRules = {
  reason: [{ required: true, message: '请输入作废原因', trigger: 'blur' }],
}

function handleCancel(row: InvoiceRecord) {
  currentCancelId.value = row.id
  cancelForm.reason = ''
  cancelDialogVisible.value = true
}

async function submitCancel() {
  if (!cancelFormRef.value) return
  const valid = await cancelFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await cancelInvoice(currentCancelId.value!, cancelForm.reason)
    ElMessage.success('发票已作废')
    cancelDialogVisible.value = false
    fetchList()
    loadTaxSummary()
  } catch {
    ElMessage.error('作废发票失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 删除发票 ====================

async function handleDelete(row: InvoiceRecord) {
  try {
    await ElMessageBox.confirm(
      `确认删除发票 ${row.invoiceNumber}？此操作不可恢复。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  try {
    await deleteInvoice(row.id)
    ElMessage.success('发票已删除')
    fetchList()
  } catch {
    ElMessage.error('删除失败')
  }
}

// ==================== 税务计算 ====================

const taxFormRef = ref<FormInstance>()
const taxResult = ref<TaxCalcResult | null>(null)

const taxForm = reactive({
  type: '',
  amount: 0,
  taxRate: 6,
  includeTax: false,
})

const taxFormRules: FormRules = {
  type: [{ required: true, message: '请选择收入类型', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  taxRate: [{ required: true, message: '请选择税率', trigger: 'change' }],
}

async function handleCalculate() {
  if (!taxFormRef.value) return
  const valid = await taxFormRef.value.validate().catch(() => false)
  if (!valid) return
  if (!taxForm.amount || taxForm.amount <= 0) {
    ElMessage.warning('金额须大于 0')
    return
  }

  calcLoading.value = true
  try {
    const res = await calculateTax({
      amount: taxForm.amount,
      taxRate: taxForm.taxRate,
      type: taxForm.type,
      includeTax: taxForm.includeTax,
    })
    taxResult.value = res.data
  } catch {
    ElMessage.error('税务计算失败')
  } finally {
    calcLoading.value = false
  }
}

function resetTaxForm() {
  taxForm.type = ''
  taxForm.amount = 0
  taxForm.taxRate = 6
  taxForm.includeTax = false
  taxResult.value = null
  taxFormRef.value?.resetFields()
}

// 税务汇总
const taxSummary = reactive({
  totalInvoiced: 0,
  totalPaid: 0,
  totalPending: 0,
})

async function loadTaxSummary() {
  try {
    const res = await getInvoiceTaxSummary()
    const data = res.data || ({} as any)
    taxSummary.totalInvoiced = Number(data.totalInvoiced) || 0
    taxSummary.totalPaid = Number(data.totalPaid) || 0
    taxSummary.totalPending = Number(data.totalPending) || 0
  } catch {
    taxSummary.totalInvoiced = 0
    taxSummary.totalPaid = 0
    taxSummary.totalPending = 0
  }
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchList()
  loadTaxSummary()
})
</script>

<style lang="scss" scoped>
.invoice-page {
  .main-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 14px;
    }
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

  .total-amount {
    font-weight: 700;
    color: #303133;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }

  .auto-calc {
    display: inline-block;
    width: 100%;
    line-height: 32px;
    color: #606266;
    font-size: 14px;

    &.total {
      font-weight: 700;
      color: #303133;
    }
  }

  .tax-calc-container {
    .result-card {
      .result-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid #f0f0f0;

        &:last-child {
          border-bottom: none;
        }

        .result-label {
          font-size: 14px;
          color: #606266;
        }

        .result-value {
          font-size: 14px;
          color: #303133;
          font-weight: 500;
        }

        &.highlight {
          padding: 14px 0;

          .result-label {
            font-size: 15px;
            font-weight: 600;
            color: #303133;
          }

          .result-value {
            font-size: 18px;
            font-weight: 700;

            &.success {
              color: #67c23a;
            }
          }
        }
      }
    }

    .tax-summary-row {
      display: flex;
      gap: 16px;
      margin-top: 24px;
      flex-wrap: wrap;
    }

    .tax-summary-card {
      flex: 1;
      min-width: 180px;
      padding: 16px 18px;
      border-radius: 12px;
      background: #fff;
      border: 1px solid #e4e9f2;

      .summary-value {
        font-size: 22px;
        font-weight: 800;
        color: #0d1b2e;
      }

      .summary-label {
        font-size: 13px;
        color: #6b7b93;
        margin-top: 6px;
      }

      &.success .summary-value {
        color: #67c23a;
      }

      &.warning .summary-value {
        color: #e6a23c;
      }
    }
  }
}
</style>
