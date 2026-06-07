<template>
  <div class="budget-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2 class="header-title">预算管理</h2>
        <p class="header-desc">预算编制、执行监控与超支预警</p>
      </div>
    </div>

    <!-- 主体 Tabs -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- ==================== 预算列表 ==================== -->
      <el-tab-pane label="预算列表" name="budget">
        <el-card shadow="hover">
          <!-- 工具栏 -->
          <div class="toolbar">
            <el-form :inline="true" :model="budgetQuery" @submit.prevent="fetchBudgetList">
              <el-form-item label="关键词">
                <el-input
                  v-model="budgetQuery.keyword"
                  placeholder="预算名称"
                  clearable
                  style="width: 180px"
                  @keyup.enter="handleBudgetSearch"
                />
              </el-form-item>
              <el-form-item label="状态">
                <el-select
                  v-model="budgetQuery.status"
                  placeholder="全部状态"
                  clearable
                  style="width: 140px"
                >
                  <el-option
                    v-for="(label, key) in BudgetStatusLabels"
                    :key="key"
                    :label="label"
                    :value="key"
                  />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" icon="Search" @click="handleBudgetSearch">搜索</el-button>
                <el-button icon="Refresh" @click="handleBudgetReset">重置</el-button>
              </el-form-item>
            </el-form>
            <el-button type="primary" icon="Plus" @click="handleCreateBudget">+ 新建预算</el-button>
          </div>

          <!-- 预算表格 -->
          <el-table v-loading="budgetLoading" :data="budgetList" border stripe>
            <el-table-column prop="name" label="预算名称" min-width="160" show-overflow-tooltip />
            <el-table-column prop="period" label="预算周期" width="120" align="center" />
            <el-table-column label="起止日期" width="200" align="center">
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
            <el-table-column label="使用率" width="180" align="center">
              <template #default="{ row }">
                <el-progress
                  :percentage="row.usageRate"
                  :color="getUsageColor(row.usageRate)"
                  :stroke-width="14"
                  :text-inside="true"
                />
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="budgetStatusTagType[row.status as BudgetStatus] || 'info'"
                  size="small"
                >
                  {{ BudgetStatusLabels[row.status as BudgetStatus] || row.status }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" align="center" fixed="right">
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

          <!-- 分页 -->
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="budgetPagination.page"
              v-model:page-size="budgetPagination.pageSize"
              :total="budgetPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="fetchBudgetList"
              @current-change="fetchBudgetList"
            />
          </div>
        </el-card>
      </el-tab-pane>

      <!-- ==================== 预警中心 ==================== -->
      <el-tab-pane label="预警中心" name="alert">
        <!-- 预警汇总卡片 -->
        <el-row :gutter="20" class="alert-summary">
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

        <!-- 预警表格 -->
        <el-card shadow="hover">
          <el-table v-loading="alertLoading" :data="alertList" border stripe>
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
            <el-table-column prop="alertTime" label="预警时间" width="170" align="center" />
            <el-table-column label="级别" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.level === 'danger' ? 'danger' : 'warning'" size="small">
                  {{ row.level === 'danger' ? '严重' : '警告' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="row.handled ? 'success' : 'danger'" size="small">
                  {{ row.handled ? '已处理' : '未处理' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="80" align="center" fixed="right">
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
        </el-card>
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
                :rules="[{ required: true, message: '请输入科目名称', trigger: 'blur' }]"
                label-width="0"
                class="item-field"
              >
                <el-input v-model="item.category" placeholder="科目名称" />
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
import { extractPageRecords } from '@/utils/pagination'
import {
  getBudgetList,
  createBudget,
  updateBudget,
  deleteBudget,
  activateBudget,
  getBudgetAlerts,
  handleBudgetAlert,
} from '@/api/finance'
import type {
  BudgetRecord,
  BudgetFormData,
  BudgetAlert,
  BudgetItem,
  BudgetStatus,
} from '@/types/finance'
import { BudgetStatusLabels } from '@/types/finance'

// ==================== 通用工具 ====================

/** 格式化金额 */
function formatMoney(value: number): string {
  return (value ?? 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** 使用率颜色阈值：<60% 绿色, 60-80% 橙色, >80% 红色 */
function getUsageColor(rate: number): string {
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

const periodOptions = [
  { label: '2024年Q1', value: '2024-Q1' },
  { label: '2024年Q2', value: '2024-Q2' },
  { label: '2024年Q3', value: '2024-Q3' },
  { label: '2024年Q4', value: '2024-Q4' },
  { label: '2024年全年', value: '2024-全年' },
]

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
  await ElMessageBox.confirm(`确定删除预算「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  try {
    await deleteBudget(row.id)
    ElMessage.success('删除成功')
    fetchBudgetList()
  } catch {
    ElMessage.error('删除失败')
  }
}

async function handleActivateBudget(row: BudgetRecord) {
  await ElMessageBox.confirm(`确定启用预算「${row.name}」？启用后将开始统计执行率`, '启用确认', { type: 'info' })
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
  const valid = await budgetFormRef.value?.validate().catch(() => false)
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
  fetchBudgetList()
})
</script>

<style lang="scss" scoped>
.budget-page {
  padding: 20px;

  .page-header {
    margin-bottom: 20px;

    .header-info {
      .header-title {
        font-size: 22px;
        font-weight: 700;
        color: #0d1b2e;
        margin: 0 0 4px;
      }

      .header-desc {
        font-size: 13px;
        color: #6b7b93;
        margin: 0;
      }
    }
  }

  .main-tabs {
    :deep(.el-tabs__header) {
      margin-bottom: 16px;
    }
  }

  // 工具栏
  .toolbar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 12px;
  }

  // 金额样式
  .amount-text {
    color: #0d1b2e;
    font-weight: 600;
  }

  .amount-used {
    color: #e6a23c;
    font-weight: 600;
  }

  .amount-remaining {
    color: #67c23a;
    font-weight: 600;
  }

  .usage-danger {
    color: #f56c6c;
    font-weight: 700;
  }

  .text-muted {
    color: #c0c4cc;
  }

  // 分页
  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  // 预警汇总卡片
  .alert-summary {
    margin-bottom: 20px;

    .summary-card {
      margin-bottom: 12px;
      border-radius: 14px;

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

  // 预算科目明细
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
          color: #606266;
          white-space: nowrap;
          min-width: 36px;
          text-align: right;
        }
      }
    }
  }

  // 预警详情
  .alert-detail {
    :deep(.el-descriptions) {
      .el-descriptions__label {
        width: 90px;
      }
    }
  }
}
</style>
