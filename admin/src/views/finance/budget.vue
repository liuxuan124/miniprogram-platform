<template>
  <div class="budget-page">
    <PageHeader
      kicker="财务管理 / 预算管理"
      title="预算管理"
      description="预算编制、执行监控与超支预警。"
    />

    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- ==================== 预算列表 ==================== -->
      <el-tab-pane label="预算列表" name="budget">
        <div class="toolbar">
          <el-input
            v-model="budgetQuery.keyword"
            class="toolbar-input"
            placeholder="搜索预算名称"
            clearable
            @keyup.enter="handleBudgetSearch"
            @clear="handleBudgetSearch"
          />
          <el-select
            v-model="budgetQuery.status"
            class="toolbar-select"
            placeholder="状态：全部"
            clearable
            @change="handleBudgetSearch"
          >
            <el-option
              v-for="(label, key) in BudgetStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
          <el-button @click="handleBudgetReset">重置</el-button>
          <div class="toolbar-spacer" />
          <el-button type="primary" @click="handleCreateBudget">+ 新建预算</el-button>
        </div>

        <div class="table-panel">
          <el-table v-loading="budgetLoading" :data="budgetList" stripe>
            <el-table-column prop="name" label="预算名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="period" label="预算周期" width="120" align="center" />
            <el-table-column label="起止日期" min-width="200" align="center">
              <template #default="{ row }">
                {{ row.startDate?.slice(0, 10) }} ~ {{ row.endDate?.slice(0, 10) }}
              </template>
            </el-table-column>
            <el-table-column label="总预算" width="130" align="right">
              <template #default="{ row }">
                <span class="amount-text">¥{{ formatMoney(row.totalBudget) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已使用" width="130" align="right">
              <template #default="{ row }">
                <span class="amount-used">¥{{ formatMoney(row.usedAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="剩余" width="130" align="right">
              <template #default="{ row }">
                <span class="amount-remaining">¥{{ formatMoney(row.remainingAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="使用率" min-width="180" align="center">
              <template #default="{ row }">
                <div class="usage-cell">
                  <el-progress
                    :percentage="Math.min(Number(row.usageRate) || 0, 100)"
                    :color="getUsageColor(Number(row.usageRate) || 0)"
                    :stroke-width="14"
                    :text-inside="true"
                    :format="() => formatUsageRate(Number(row.usageRate) || 0)"
                  />
                  <el-tag v-if="Number(row.usageRate) > 100" type="danger" size="small" effect="plain">超支</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="(budgetStatusTagType[row.status as BudgetStatus] || 'info') as any"
                  size="small"
                  effect="plain"
                >
                  {{ BudgetStatusLabels[row.status as BudgetStatus] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="180">
              <template #default="{ row }">
                <el-button
                  v-if="row.status === 'draft'"
                  link
                  type="success"
                  size="small"
                  @click="handleActivateBudget(row)"
                >启用</el-button>
                <el-button link type="primary" size="small" @click="handleEditBudget(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteBudget(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="budgetPagination.total > 0" class="pagination-wrap">
            <el-pagination
              v-model:current-page="budgetPagination.page"
              v-model:page-size="budgetPagination.pageSize"
              :total="budgetPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchBudgetList"
              @current-change="fetchBudgetList"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- ==================== 预警中心 ==================== -->
      <el-tab-pane label="预警中心" name="alert">
        <el-row :gutter="16" class="alert-summary">
          <el-col :xs="12" :sm="8" v-for="card in alertSummaryCards" :key="card.title">
            <el-card shadow="hover" class="summary-card" :class="card.cls">
              <div class="summary-content">
                <div class="summary-info">
                  <p class="summary-title">{{ card.title }}</p>
                  <p class="summary-value">{{ card.value }}</p>
                </div>
                <div class="summary-icon-wrap" :style="{ background: card.bgColor }">
                  <el-icon class="summary-icon" :style="{ color: card.color }">
                    <component :is="card.icon" />
                  </el-icon>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <div class="table-panel">
          <el-table v-loading="alertLoading" :data="alertList" stripe>
            <el-table-column prop="budgetName" label="预算名称" min-width="140" show-overflow-tooltip />
            <el-table-column prop="category" label="科目" width="120" align="center" />
            <el-table-column label="预算金额" width="130" align="right">
              <template #default="{ row }">
                <span>¥{{ formatMoney(row.budgetAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="已使用" width="130" align="right">
              <template #default="{ row }">
                <span class="amount-used">¥{{ formatMoney(row.usedAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="使用率" width="100" align="center">
              <template #default="{ row }">
                <span class="usage-danger">{{ row.usageRate }}%</span>
              </template>
            </el-table-column>
            <el-table-column label="预警阈值" width="100" align="center">
              <template #default="{ row }">
                {{ row.alertThreshold }}%
              </template>
            </el-table-column>
            <el-table-column prop="alertTime" label="预警时间" min-width="160" align="center" />
            <el-table-column label="级别" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.level === 'danger' ? 'danger' : 'warning'" size="small" effect="plain">
                  {{ row.level === 'danger' ? '严重' : '警告' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.handled ? 'success' : 'danger'" size="small" effect="plain">
                  {{ row.handled ? '已处理' : '未处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" min-width="100">
              <template #default="{ row }">
                <el-button
                  v-if="!row.handled"
                  link
                  type="primary"
                  size="small"
                  @click="handleOpenAlert(row)"
                >
                  处理
                </el-button>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 新建/编辑预算弹窗 ==================== -->
    <el-dialog
      v-model="budgetDialogVisible"
      :title="isEditBudget ? '编辑预算' : '新建预算'"
      width="720px"
      destroy-on-close
      @close="resetBudgetForm"
    >
      <el-form
        ref="budgetFormRef"
        :model="budgetForm"
        :rules="budgetFormRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="预算名称" prop="name">
          <el-input v-model="budgetForm.name" placeholder="请输入预算名称" maxlength="50" show-word-limit />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="预算周期" prop="period">
              <el-select v-model="budgetForm.period" placeholder="请选择预算周期" style="width: 100%">
                <el-option
                  v-for="opt in periodOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="总预算" prop="totalBudget">
              <el-input-number
                v-model="budgetForm.totalBudget"
                :min="0"
                :precision="2"
                :step="1000"
                controls-position="right"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="起止日期" prop="dateRange">
          <el-date-picker
            v-model="budgetForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="适用部门" prop="departments">
          <el-select
            v-model="budgetForm.departments"
            multiple
            placeholder="请选择适用部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departmentOptions"
              :key="dept"
              :label="dept"
              :value="dept"
            />
          </el-select>
        </el-form-item>

        <!-- 预算科目明细 -->
        <el-form-item label="预算科目明细">
          <div class="budget-items-wrap">
            <div
              v-for="(item, index) in budgetForm.items"
              :key="index"
              class="budget-item-row"
            >
              <el-form-item
                :prop="`items.${index}.category`"
                :rules="[{ required: true, message: '请选择支出科目', trigger: 'change' }]"
                label-width="0"
                class="item-field"
              >
                <el-select
                  v-model="item.category"
                  filterable
                  allow-create
                  default-first-option
                  placeholder="支出科目（与收支分类一致）"
                  style="width: 100%"
                >
                  <el-option
                    v-for="cat in expenseCategoryOptions"
                    :key="cat"
                    :label="cat"
                    :value="cat"
                  />
                </el-select>
              </el-form-item>
              <el-form-item
                :prop="`items.${index}.budgetAmount`"
                :rules="[{ required: true, message: '请输入预算金额', trigger: 'blur' }]"
                label-width="0"
                class="item-field"
              >
                <el-input-number
                  v-model="item.budgetAmount"
                  :min="0"
                  :precision="2"
                  :step="100"
                  controls-position="right"
                  placeholder="预算金额"
                  style="width: 100%"
                />
              </el-form-item>
              <el-form-item
                :prop="`items.${index}.alertThreshold`"
                label-width="0"
                class="item-field item-slider"
              >
                <div class="threshold-wrap">
                  <el-slider
                    v-model="item.alertThreshold"
                    :min="50"
                    :max="100"
                    :step="5"
                    :show-tooltip="false"
                  />
                  <span class="threshold-val">{{ item.alertThreshold }}%</span>
                </div>
              </el-form-item>
              <el-button
                link
                type="danger"
                icon="Delete"
                @click="removeBudgetItem(index)"
                :disabled="budgetForm.items.length <= 1"
              />
            </div>
            <el-button type="primary" link icon="Plus" @click="addBudgetItem">
              添加科目
            </el-button>
            <div class="items-sum-hint" :class="{ 'is-mismatch': itemsSumMismatch }">
              科目合计 ¥{{ formatMoney(itemsBudgetSum) }}
              <template v-if="budgetForm.totalBudget > 0">
                ／ 总预算 ¥{{ formatMoney(budgetForm.totalBudget) }}
                <span v-if="itemsSumMismatch">（须与总预算一致）</span>
              </template>
            </div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="budgetDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="budgetSubmitting" @click="submitBudgetForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 处理预警弹窗 ==================== -->
    <el-dialog
      v-model="alertDialogVisible"
      title="处理预警"
      width="520px"
      destroy-on-close
    >
      <div class="alert-detail" v-if="currentAlert">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="预算名称">{{ currentAlert.budgetName }}</el-descriptions-item>
          <el-descriptions-item label="科目">{{ currentAlert.category }}</el-descriptions-item>
          <el-descriptions-item label="预算金额">¥{{ formatMoney(currentAlert.budgetAmount) }}</el-descriptions-item>
          <el-descriptions-item label="已使用">¥{{ formatMoney(currentAlert.usedAmount) }}</el-descriptions-item>
          <el-descriptions-item label="使用率">
            <span class="usage-danger">{{ currentAlert.usageRate }}%</span>
          </el-descriptions-item>
          <el-descriptions-item label="预警阈值">{{ currentAlert.alertThreshold }}%</el-descriptions-item>
          <el-descriptions-item label="预警时间" :span="2">{{ currentAlert.alertTime }}</el-descriptions-item>
          <el-descriptions-item label="级别">
            <el-tag :type="currentAlert.level === 'danger' ? 'danger' : 'warning'" size="small">
              {{ currentAlert.level === 'danger' ? '严重' : '警告' }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <el-form
        ref="alertFormRef"
        :model="alertForm"
        :rules="alertFormRules"
        label-width="100px"
        style="margin-top: 20px"
      >
        <el-form-item label="处理说明" prop="note">
          <el-input
            v-model="alertForm.note"
            type="textarea"
            :rows="4"
            placeholder="请输入处理说明"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="alertDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="alertSubmitting" @click="submitAlertForm">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { validateFormAndScroll } from '@/utils/formScroll'
import { extractPageRecords } from '@/utils/pagination'
import PageHeader from '@/components/PageHeader.vue'
import {
  getBudgetList,
  createBudget,
  updateBudget,
  deleteBudget,
  activateBudget,
  getBudgetAlerts,
  handleBudgetAlert,
  getTransactionCategories,
} from '@/api/finance'
import type {
  BudgetRecord,
  BudgetFormData,
  BudgetAlert,
  BudgetItem,
  BudgetStatus,
  TransactionCategory,
} from '@/types/finance'
import { BudgetStatusLabels } from '@/types/finance'

// ==================== 通用工具 ====================

/** 格式化金额 */
function formatMoney(value: number): string {
  return (value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatUsageRate(rate: number): string {
  return `${Number(rate || 0).toFixed(1)}%`
}

/** 使用率颜色：含超支 */
function getUsageColor(rate: number): string {
  if (rate > 100) return '#f56c6c'
  if (rate > 80) return '#f56c6c'
  if (rate > 60) return '#e6a23c'
  return '#67c23a'
}

/** 预算状态 Tag 类型映射 */
const budgetStatusTagType: Record<BudgetStatus, string> = {
  draft: 'info',
  active: 'success',
  completed: '',
  overdue: 'danger',
}

// ==================== Tabs 控制 ====================

const activeTab = ref('budget')

// ==================== 预算列表 ====================

const budgetLoading = ref(false)
const budgetList = ref<BudgetRecord[]>([])
const budgetQuery = reactive({
  keyword: '',
  status: '' as string,
})
const budgetPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

async function fetchBudgetList() {
  budgetLoading.value = true
  try {
    const res = await getBudgetList({
      page: budgetPagination.page,
      pageSize: budgetPagination.pageSize,
      keyword: budgetQuery.keyword || undefined,
      status: budgetQuery.status || undefined,
    })
    const pageData = extractPageRecords<BudgetRecord>(res)
    budgetList.value = pageData.list
    budgetPagination.total = pageData.total
  } catch {
    ElMessage.error('获取预算列表失败')
  } finally {
    budgetLoading.value = false
  }
}

function handleBudgetSearch() {
  budgetPagination.page = 1
  fetchBudgetList()
}

function handleBudgetReset() {
  budgetQuery.keyword = ''
  budgetQuery.status = ''
  budgetPagination.page = 1
  fetchBudgetList()
}

// ==================== 新建/编辑预算 ====================

const budgetDialogVisible = ref(false)
const isEditBudget = ref(false)
const editBudgetId = ref<number>(0)
const budgetSubmitting = ref(false)
const budgetFormRef = ref<FormInstance>()

const periodOptions = computed(() => {
  const year = new Date().getFullYear()
  const years = [year, year - 1]
  const opts: { label: string; value: string }[] = []
  for (const y of years) {
    for (let q = 1; q <= 4; q++) {
      opts.push({ label: `${y}年Q${q}`, value: `${y}-Q${q}` })
    }
    opts.push({ label: `${y}年全年`, value: `${y}-全年` })
  }
  // 编辑旧数据时保留不在列表中的周期
  if (budgetForm.period && !opts.some((o) => o.value === budgetForm.period)) {
    opts.unshift({ label: budgetForm.period, value: budgetForm.period })
  }
  return opts
})

const expenseCategoryOptions = ref<string[]>([])

async function loadExpenseCategories() {
  try {
    const res = await getTransactionCategories('expense')
    const list = Array.isArray((res as any).data) ? ((res as any).data as TransactionCategory[]) : []
    expenseCategoryOptions.value = list
      .filter((c) => !c.parentId)
      .map((c) => c.name)
      .filter(Boolean)
  } catch {
    expenseCategoryOptions.value = ['人力成本', '运营费用', '采购成本', '营销推广', '其他支出']
  }
}

const departmentOptions = [
  '技术部',
  '产品部',
  '市场部',
  '运营部',
  '财务部',
  '人事部',
  '销售部',
  '客服部',
]

interface BudgetFormItem {
  category: string
  budgetAmount: number
  alertThreshold: number
}

const budgetForm = reactive({
  name: '',
  period: '',
  dateRange: [] as string[],
  totalBudget: 0,
  departments: [] as string[],
  items: [{ category: '', budgetAmount: 0, alertThreshold: 80 }] as BudgetFormItem[],
})

const itemsBudgetSum = computed(() =>
  budgetForm.items.reduce((s, item) => s + (Number(item.budgetAmount) || 0), 0),
)

const itemsSumMismatch = computed(() => {
  if (!budgetForm.totalBudget || budgetForm.totalBudget <= 0) return false
  return Math.abs(itemsBudgetSum.value - Number(budgetForm.totalBudget)) > 0.01
})

const budgetFormRules: FormRules = {
  name: [{ required: true, message: '请输入预算名称', trigger: 'blur' }],
  period: [{ required: true, message: '请选择预算周期', trigger: 'change' }],
  dateRange: [{ required: true, message: '请选择起止日期', trigger: 'change' }],
  totalBudget: [{ required: true, message: '请输入总预算', trigger: 'blur' }],
  departments: [{ required: true, message: '请选择适用部门', trigger: 'change' }],
}

function addBudgetItem() {
  budgetForm.items.push({ category: '', budgetAmount: 0, alertThreshold: 80 })
}

function removeBudgetItem(index: number) {
  if (budgetForm.items.length <= 1) return
  budgetForm.items.splice(index, 1)
}

function handleCreateBudget() {
  isEditBudget.value = false
  editBudgetId.value = 0
  resetBudgetFormFields()
  budgetDialogVisible.value = true
}

function parseBudgetItems(raw: BudgetRecord['items']): BudgetFormItem[] {
  let items: BudgetItem[] = []
  if (Array.isArray(raw)) {
    items = raw
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw)
      items = Array.isArray(parsed) ? parsed : []
    } catch {
      items = []
    }
  }
  return items.map((item) => ({
    category: item.category,
    budgetAmount: item.budgetAmount,
    alertThreshold: item.alertThreshold ?? 80,
  }))
}

function handleEditBudget(row: BudgetRecord) {
  isEditBudget.value = true
  editBudgetId.value = row.id
  budgetForm.name = row.name
  budgetForm.period = row.period
  budgetForm.dateRange = [row.startDate, row.endDate]
  budgetForm.totalBudget = row.totalBudget
  budgetForm.departments = [...(row.departments || [])]
  budgetForm.items = parseBudgetItems(row.items)
  if (budgetForm.items.length === 0) {
    budgetForm.items = [{ category: '', budgetAmount: 0, alertThreshold: 80 }]
  }
  budgetDialogVisible.value = true
}

async function handleDeleteBudget(row: BudgetRecord) {
  try {
    await ElMessageBox.confirm(`确定删除预算「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await deleteBudget(row.id)
    ElMessage.success('删除成功')
    fetchBudgetList()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleActivateBudget(row: BudgetRecord) {
  try {
    await ElMessageBox.confirm(`确定启用预算「${row.name}」？启用后将开始统计执行率`, '启用确认', { type: 'info' })
  } catch {
    return
  }
  try {
    await activateBudget(row.id)
    ElMessage.success('预算已启用')
    fetchBudgetList()
  } catch {
    ElMessage.error('启用失败')
  }
}

function resetBudgetFormFields() {
  budgetForm.name = ''
  budgetForm.period = ''
  budgetForm.dateRange = []
  budgetForm.totalBudget = 0
  budgetForm.departments = []
  budgetForm.items = [{ category: '', budgetAmount: 0, alertThreshold: 80 }]
}

function resetBudgetForm() {
  resetBudgetFormFields()
  budgetFormRef.value?.resetFields()
}

async function submitBudgetForm() {
  const valid = await validateFormAndScroll(budgetFormRef.value)
  if (!valid) return

  if (!budgetForm.dateRange || budgetForm.dateRange.length < 2) {
    ElMessage.warning('请选择起止日期')
    return
  }

  const itemsValid = budgetForm.items.every((item) => item.category && item.budgetAmount > 0)
  if (!itemsValid) {
    ElMessage.warning('请完善预算科目明细')
    return
  }

  const categories = budgetForm.items.map((i) => i.category.trim())
  if (new Set(categories).size !== categories.length) {
    ElMessage.warning('科目名称不能重复')
    return
  }

  if (itemsSumMismatch.value) {
    ElMessage.warning(`科目合计（¥${formatMoney(itemsBudgetSum.value)}）须与总预算（¥${formatMoney(budgetForm.totalBudget)}）一致`)
    return
  }

  const payload: BudgetFormData = {
    name: budgetForm.name,
    period: budgetForm.period,
    startDate: budgetForm.dateRange[0],
    endDate: budgetForm.dateRange[1],
    totalBudget: budgetForm.totalBudget,
    departments: budgetForm.departments,
    items: budgetForm.items.map((item) => ({
      category: item.category,
      budgetAmount: item.budgetAmount,
      alertThreshold: item.alertThreshold,
    })),
  }

  budgetSubmitting.value = true
  try {
    if (isEditBudget.value) {
      await updateBudget(editBudgetId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createBudget(payload)
      ElMessage.success('创建成功')
    }
    budgetDialogVisible.value = false
    fetchBudgetList()
  } catch {
    ElMessage.error(isEditBudget.value ? '更新失败' : '创建失败')
  } finally {
    budgetSubmitting.value = false
  }
}

// ==================== 预警中心 ====================

const alertLoading = ref(false)
const alertList = ref<BudgetAlert[]>([])

const alertSummaryCards = computed(() => {
  const total = alertList.value.length
  const unhandled = alertList.value.filter((a) => !a.handled).length
  const handled = total - unhandled
  return [
    {
      title: '预警总数',
      value: total,
      cls: 'card-total',
      icon: 'Bell',
      color: '#409eff',
      bgColor: '#ecf5ff',
    },
    {
      title: '未处理',
      value: unhandled,
      cls: 'card-unhandled',
      icon: 'WarningFilled',
      color: '#f56c6c',
      bgColor: '#fef0f0',
    },
    {
      title: '已处理',
      value: handled,
      cls: 'card-handled',
      icon: 'CircleCheckFilled',
      color: '#67c23a',
      bgColor: '#f0f9eb',
    },
  ]
})

async function fetchAlertList() {
  alertLoading.value = true
  try {
    const res = await getBudgetAlerts()
    alertList.value = (res as any).data || []
  } catch {
    ElMessage.error('获取预警列表失败')
  } finally {
    alertLoading.value = false
  }
}

// ==================== 处理预警 ====================

const alertDialogVisible = ref(false)
const alertSubmitting = ref(false)
const alertFormRef = ref<FormInstance>()
const currentAlert = ref<BudgetAlert | null>(null)
const alertForm = reactive({ note: '' })

const alertFormRules: FormRules = {
  note: [{ required: true, message: '请输入处理说明', trigger: 'blur' }],
}

function handleOpenAlert(row: BudgetAlert) {
  currentAlert.value = row
  alertForm.note = ''
  alertDialogVisible.value = true
}

async function submitAlertForm() {
  const valid = await alertFormRef.value?.validate().catch(() => false)
  if (!valid) return

  alertSubmitting.value = true
  try {
    await handleBudgetAlert(currentAlert.value!.id, alertForm.note)
    ElMessage.success('处理成功')
    alertDialogVisible.value = false
    fetchAlertList()
  } catch {
    ElMessage.error('处理失败')
  } finally {
    alertSubmitting.value = false
  }
}

// ==================== 初始化 ====================

watch(activeTab, (val) => {
  if (val === 'alert') {
    fetchAlertList()
  }
})

onMounted(() => {
  loadExpenseCategories()
  fetchBudgetList()
})
</script>

<style lang="scss" scoped>
.budget-page {
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

  .toolbar-spacer {
    flex: 1;
  }

  .usage-cell {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
  }

  .items-sum-hint {
    margin-top: 8px;
    font-size: 13px;
    color: var(--text-muted);

    &.is-mismatch {
      color: var(--danger);
      font-weight: 600;
    }
  }

  .table-panel {
    background: #fff;
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px;
  }

  .amount-text {
    color: #0d1b2e;
    font-weight: 600;
  }

  .amount-used {
    color: var(--warning);
    font-weight: 600;
  }

  .amount-remaining {
    color: var(--success);
    font-weight: 600;
  }

  .usage-danger {
    color: var(--danger);
    font-weight: 700;
  }

  .text-muted {
    color: var(--text-muted);
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 14px;
  }

  .alert-summary {
    margin-bottom: 14px;

    .summary-card {
      margin-bottom: 12px;
      border-radius: 12px;

      .summary-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .summary-info {
        .summary-title {
          font-size: 13px;
          color: #6b7b93;
          margin: 0 0 6px;
          font-weight: 600;
        }

        .summary-value {
          font-size: 28px;
          font-weight: 800;
          color: #0d1b2e;
          margin: 0;
        }
      }

      .summary-icon-wrap {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        .summary-icon {
          font-size: 20px;
        }
      }
    }
  }

  .budget-items-wrap {
    width: 100%;

    .budget-item-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;

      .item-field {
        flex: 1;
        margin-bottom: 0;
      }

      .item-slider {
        min-width: 160px;
      }

      .threshold-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;

        .el-slider {
          flex: 1;
        }

        .threshold-val {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
          min-width: 36px;
          text-align: right;
        }
      }
    }
  }

  .alert-detail {
    :deep(.el-descriptions) {
      .el-descriptions__label {
        width: 90px;
      }
    }
  }
}
</style>
