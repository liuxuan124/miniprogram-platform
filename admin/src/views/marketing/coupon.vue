<template>
  <div class="coupon-container">
    <!-- 筛选区 -->
    <el-card shadow="hover" class="search-card">
      <el-form :inline="true" :model="queryParams" @submit.prevent="fetchList">
        <el-form-item label="关键词">
          <el-input v-model="queryParams.keyword" placeholder="优惠券名称" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="queryParams.type" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="(label, key) in CouponTypeLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="queryParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="(label, key) in CouponStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchList">查询</el-button>
          <el-button icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 列表区 -->
    <el-card shadow="hover">
      <template #header>
        <div class="card-header">
          <span>优惠券管理</span>
          <div class="header-actions">
            <el-button type="primary" icon="Plus" @click="handleCreate">创建优惠券</el-button>
            <el-button icon="View" @click="showUserCoupons = true">用户优惠券</el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="couponList"
        border
        stripe
        style="width: 100%"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="优惠券名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === CouponType.Fixed ? 'warning' : 'success'" size="small">
              {{ CouponTypeLabels[row.type as CouponType] || row.type }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优惠内容" width="140" align="center">
          <template #default="{ row }">
            <template v-if="row.type === CouponType.Fixed">
              <span class="text-danger">-¥{{ row.value }}</span>
            </template>
            <template v-else>
              <span class="text-danger">{{ row.value }}折</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="使用门槛" width="120" align="center">
          <template #default="{ row }">
            {{ row.minOrderAmount > 0 ? `满¥${row.minOrderAmount}` : '无门槛' }}
          </template>
        </el-table-column>
        <el-table-column prop="scope" label="适用范围" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" type="info">
              {{ CouponScopeLabels[row.scope as CouponScope] || row.scope }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="领取/总量" width="120" align="center">
          <template #default="{ row }">
            {{ row.usedCount }} / {{ row.totalCount === -1 ? '不限' : row.totalCount }}
          </template>
        </el-table-column>
        <el-table-column label="已使用" width="80" align="center">
          <template #default="{ row }">
            {{ row.usedCount }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="CouponStatusTagType[row.status as CouponStatus]" size="small">
              {{ CouponStatusLabels[row.status as CouponStatus] || row.status }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="有效期" width="180" align="center">
          <template #default="{ row }">
            <template v-if="row.startTime">
              {{ row.startTime?.slice(0, 10) }} ~ {{ row.endTime?.slice(0, 10) }}
            </template>
            <template v-else-if="row.validDays">
              领取后{{ row.validDays }}天内有效
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button
              v-if="row.status === CouponStatus.Draft"
              link type="success" size="small"
              @click="handlePublish(row)"
            >
              <el-icon><Upload /></el-icon>发布
            </el-button>
            <el-button
              v-if="row.status === CouponStatus.Published"
              link type="warning" size="small"
              @click="handleDisable(row)"
            >
              <el-icon><Lock /></el-icon>停用
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
          v-model:current-page="queryParams.page"
          v-model:page-size="queryParams.page_size"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑优惠券' : '创建优惠券'"
      width="680px"
      destroy-on-close
      @close="resetForm"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-form-item label="优惠券名称" prop="name">
          <el-input v-model="formData.name" placeholder="如：新人专享券" maxlength="30" show-word-limit />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优惠券类型" prop="type">
              <el-select v-model="formData.type" style="width: 100%" @change="handleTypeChange">
                <el-option
                  v-for="(label, key) in CouponTypeLabels"
                  :key="key"
                  :label="label"
                  :value="key"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优惠额度" prop="value">
              <el-input-number
                v-model="formData.value"
                :min="formData.type === CouponType.Fixed ? 0.01 : 1"
                :max="formData.type === CouponType.Fixed ? 99999 : 99"
                :precision="formData.type === CouponType.Fixed ? 2 : 1"
                :step="formData.type === CouponType.Fixed ? 1 : 0.5"
                controls-position="right"
                style="width: 100%"
              />
              <div class="form-tip">
                {{ formData.type === CouponType.Fixed ? '满减金额（元）' : '折扣率，如 8.5 表示 8.5 折' }}
              </div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="最低消费" prop="minOrderAmount">
              <el-input-number v-model="formData.minOrderAmount" :min="0" :precision="2" controls-position="right" style="width: 100%" />
              <div class="form-tip">0 表示无门槛</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="适用范围" prop="scope">
              <el-select v-model="formData.scope" style="width: 100%">
                <el-option
                  v-for="(label, key) in CouponScopeLabels"
                  :key="key"
                  :label="label"
                  :value="key"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发放总量" prop="totalCount">
              <el-input-number v-model="formData.totalCount" :min="-1" controls-position="right" style="width: 100%" />
              <div class="form-tip">-1 表示不限量</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="每人限领" prop="perUserLimit">
              <el-input-number v-model="formData.perUserLimit" :min="1" :max="100" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="有效期类型">
          <el-radio-group v-model="validityType" @change="handleValidityTypeChange">
            <el-radio value="fixed">固定时间段</el-radio>
            <el-radio value="days">领取后有效天数</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="validityType === 'fixed'" label="有效时间段" prop="startTime">
          <el-date-picker
            v-model="dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item v-if="validityType === 'days'" label="有效天数" prop="validDays">
          <el-input-number v-model="formData.validDays" :min="1" :max="3650" controls-position="right" style="width: 200px" />
          <span style="margin-left: 8px; color: #909399">天</span>
        </el-form-item>

        <el-form-item label="使用说明" prop="description">
          <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="优惠券使用说明" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 用户优惠券弹窗 -->
    <el-dialog
      v-model="showUserCoupons"
      title="用户优惠券"
      width="900px"
      destroy-on-close
    >
      <el-form :inline="true" :model="userCouponParams" style="margin-bottom: 16px">
        <el-form-item label="关键词">
          <el-input v-model="userCouponParams.keyword" placeholder="用户昵称/优惠券名" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userCouponParams.status" placeholder="全部" clearable style="width: 120px">
            <el-option
              v-for="(label, key) in UserCouponStatusLabels"
              :key="key"
              :label="label"
              :value="key"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" icon="Search" @click="fetchUserCoupons">查询</el-button>
        </el-form-item>
      </el-form>

      <el-table v-loading="ucLoading" :data="userCouponList" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column label="用户" min-width="120">
          <template #default="{ row }">
            <div style="display: flex; align-items: center; gap: 6px">
              <el-avatar :size="24" :src="row.user_avatar">
                {{ row.user_nickname?.charAt(0) }}
              </el-avatar>
              <span>{{ row.user_nickname }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="coupon_name" label="优惠券" min-width="140" show-overflow-tooltip />
        <el-table-column prop="coupon_type" label="类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.coupon_type === CouponType.Fixed ? 'warning' : 'success'">
              {{ CouponTypeLabels[row.coupon_type as CouponType] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="优惠内容" width="110" align="center">
          <template #default="{ row }">
            <template v-if="row.coupon_type === CouponType.Fixed">
              -¥{{ row.discount_value }}
            </template>
            <template v-else>
              {{ row.discount_value }}折
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="UserCouponStatusTagType[row.status]" size="small">
              {{ UserCouponStatusLabels[row.status] }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="claimed_at" label="领取时间" width="170" align="center" />
        <el-table-column prop="expired_at" label="过期时间" width="170" align="center" />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="userCouponParams.page"
          v-model:page-size="userCouponParams.page_size"
          :total="ucTotal"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="fetchUserCoupons"
          @current-change="fetchUserCoupons"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getCouponList,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  publishCoupon,
  disableCoupon,
  getUserCouponList,
} from '@/api/coupon'
import type { CouponRecord, CreateCouponParams, CouponListParams } from '@/types/coupon'
import {
  CouponType,
  CouponStatus,
  CouponScope,
  CouponTypeLabels,
  CouponStatusLabels,
  CouponStatusTagType,
  CouponScopeLabels,
  UserCouponStatusLabels,
  UserCouponStatusTagType,
} from '@/types/coupon'
import type { UserCouponRecord } from '@/types/coupon'

/** 列表数据 */
const couponList = ref<CouponRecord[]>([])
const rawCouponList = ref<CouponRecord[]>([])
const total = ref(0)
const loading = ref(false)

/** 查询参数 */
const queryParams = reactive<CouponListParams>({
  page: 1,
  page_size: 10,
  keyword: '',
  type: undefined,
  status: undefined,
})

function normalizeCoupon(raw: any): CouponRecord {
  const usedCount = Number(raw?.usedCount ?? raw?.used_count ?? 0)
  return {
    id: Number(raw?.id || 0),
    name: raw?.name || '',
    type: (raw?.type || CouponType.Fixed) as CouponType,
    status: (raw?.status || CouponStatus.Draft) as CouponStatus,
    scope: (raw?.scope || CouponScope.All) as CouponScope,
    scopeIds: Array.isArray(raw?.scopeIds ?? raw?.scope_ids) ? (raw.scopeIds ?? raw.scope_ids) : [],
    value: Number(raw?.value ?? raw?.discount_value ?? 0),
    minOrderAmount: Number(raw?.minOrderAmount ?? raw?.min_amount ?? 0),
    totalCount: Number(raw?.totalCount ?? raw?.total_count ?? -1),
    usedCount: usedCount,
    perUserLimit: Number(raw?.perUserLimit ?? raw?.per_limit ?? 1),
    startTime: raw?.startTime || raw?.start_time || '',
    endTime: raw?.endTime || raw?.end_time || '',
    validDays: raw?.validDays ?? raw?.valid_days,
    description: raw?.description || '',
    createdAt: raw?.createdAt || raw?.created_at || '',
    updatedAt: raw?.updatedAt || raw?.updated_at || '',
  }
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  const ss = pad(date.getSeconds())
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}`
}

function toApiDateTime(value?: string): string | undefined {
  if (!value) return undefined
  const text = String(value).trim()
  if (!text) return undefined
  return text.includes('T') ? text : text.replace(' ', 'T')
}

/** 获取优惠券列表 */
async function fetchList() {
  loading.value = true
  try {
    const res = await getCouponList({
      page: queryParams.page,
      page_size: queryParams.page_size,
      status: queryParams.status,
    })
    const data = (res as any).data || {}
    const records = data.records || data.list || []
    rawCouponList.value = Array.isArray(records) ? records.map((item: any) => normalizeCoupon(item)) : []
    applyCouponFilters()
  } catch {
    rawCouponList.value = []
    couponList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function applyCouponFilters() {
  const keyword = String(queryParams.keyword || '').trim().toLowerCase()
  const type = queryParams.type
  let list = [...rawCouponList.value]
  if (keyword) {
    list = list.filter((item) => String(item.name || '').toLowerCase().includes(keyword))
  }
  if (type) {
    list = list.filter((item) => item.type === type)
  }
  couponList.value = list
  total.value = list.length
}

/** 重置筛选 */
function handleReset() {
  queryParams.keyword = ''
  queryParams.type = undefined
  queryParams.status = undefined
  queryParams.page = 1
  fetchList()
}

// ==================== 新增/编辑 ====================

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref<number>(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const validityType = ref<'fixed' | 'days'>('fixed')
const dateRange = ref<string[]>([])

const formData = reactive<CreateCouponParams>({
  name: '',
  type: CouponType.Fixed,
  scope: CouponScope.All,
  scopeIds: [],
  value: 10,
  minOrderAmount: 0,
  totalCount: -1,
  perUserLimit: 1,
  startTime: undefined,
  endTime: undefined,
  validDays: undefined,
  description: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入优惠券名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择优惠券类型', trigger: 'change' }],
  value: [{ required: true, message: '请输入优惠额度', trigger: 'blur' }],
}

/** 类型变更时重置优惠额度 */
function handleTypeChange() {
  formData.value = formData.type === CouponType.Fixed ? 10 : 9.5
}

/** 有效期类型变更 */
function handleValidityTypeChange() {
  formData.startTime = undefined
  formData.endTime = undefined
  formData.validDays = undefined
  dateRange.value = []
}

/** 创建 */
function handleCreate() {
  isEdit.value = false
  editId.value = 0
  validityType.value = 'fixed'
  dialogVisible.value = true
}

/** 编辑 */
function handleEdit(row: CouponRecord) {
  isEdit.value = true
  editId.value = row.id
  formData.name = row.name
  formData.type = row.type
  formData.scope = row.scope
  formData.scopeIds = row.scopeIds || []
  formData.value = row.value
  formData.minOrderAmount = row.minOrderAmount
  formData.totalCount = row.totalCount
  formData.perUserLimit = row.perUserLimit
  formData.description = row.description || ''

  if (row.startTime && row.endTime) {
    validityType.value = 'fixed'
    formData.startTime = row.startTime
    formData.endTime = row.endTime
    dateRange.value = [row.startTime, row.endTime]
    formData.validDays = undefined
  } else if (row.validDays) {
    validityType.value = 'days'
    formData.validDays = row.validDays
    formData.startTime = undefined
    formData.endTime = undefined
    dateRange.value = []
  }

  dialogVisible.value = true
}

/** 发布 */
async function handlePublish(row: CouponRecord) {
  await ElMessageBox.confirm(`确定发布优惠券「${row.name}」？发布后用户可领取`, '发布确认')
  await publishCoupon(row.id)
  ElMessage.success('发布成功')
  fetchList()
}

/** 停用 */
async function handleDisable(row: CouponRecord) {
  await ElMessageBox.confirm(`确定停用优惠券「${row.name}」？停用后用户无法继续领取`, '停用确认', { type: 'warning' })
  await disableCoupon(row.id)
  ElMessage.success('已停用')
  fetchList()
}

/** 删除 */
async function handleDelete(row: CouponRecord) {
  await ElMessageBox.confirm(`确定删除优惠券「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deleteCoupon(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/** 重置表单 */
function resetForm() {
  formData.name = ''
  formData.type = CouponType.Fixed
  formData.scope = CouponScope.All
  formData.scopeIds = []
  formData.value = 10
  formData.minOrderAmount = 0
  formData.totalCount = -1
  formData.perUserLimit = 1
  formData.startTime = undefined
  formData.endTime = undefined
  formData.validDays = undefined
  formData.description = ''
  dateRange.value = []
  validityType.value = 'fixed'
  formRef.value?.resetFields()
}

/** 提交表单 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  // 处理有效期
  if (validityType.value === 'fixed') {
    if (dateRange.value && dateRange.value.length === 2) {
      formData.startTime = toApiDateTime(dateRange.value[0])
      formData.endTime = toApiDateTime(dateRange.value[1])
    } else {
      ElMessage.warning('请选择有效时间段')
      return
    }
    formData.validDays = undefined
  } else {
    if (!formData.validDays || formData.validDays <= 0) {
      ElMessage.warning('请输入有效天数')
      return
    }
    formData.startTime = undefined
    formData.endTime = undefined
  }

  const payload: any = {
    name: formData.name,
    type: formData.type,
    value: formData.value,
    minOrderAmount: formData.minOrderAmount,
    totalCount: formData.totalCount,
    perUserLimit: formData.perUserLimit,
    scope: formData.scope,
    scopeIds: formData.scopeIds,
    description: formData.description,
  }

  if (validityType.value === 'fixed') {
    payload.startTime = formData.startTime
    payload.endTime = formData.endTime
  } else {
    payload.validDays = formData.validDays
    // 领取后有效天数模式：设置默认的 startTime/endTime 满足后端 @NotNull 校验
    const now = new Date()
    const end = new Date(now.getTime() + Number(formData.validDays || 1) * 24 * 60 * 60 * 1000)
    payload.startTime = formatDateTime(now)
    payload.endTime = formatDateTime(end)
  }

  submitLoading.value = true
  try {
    if (isEdit.value) {
      await updateCoupon(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createCoupon(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch {
    // 错误提示由请求拦截器统一处理
  } finally {
    submitLoading.value = false
  }
}

// ==================== 用户优惠券 ====================

const showUserCoupons = ref(false)
const userCouponList = ref<UserCouponRecord[]>([])
const ucTotal = ref(0)
const ucLoading = ref(false)
const userCouponParams = reactive({
  page: 1,
  page_size: 10,
  keyword: '',
  status: undefined as string | undefined,
})

async function fetchUserCoupons() {
  ucLoading.value = true
  try {
    const res = await getUserCouponList(userCouponParams)
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    userCouponList.value = Array.isArray(list)
      ? list.map((item: any) => ({
          id: Number(item.id || 0),
          user_id: Number(item.user_id || item.userId || 0),
          user_nickname: item.user_nickname || item.userNickname || `用户${item.user_id || item.userId || '-'}`,
          user_avatar: item.user_avatar || item.userAvatar || '',
          coupon_id: Number(item.coupon_id || item.couponId || 0),
          coupon_name: item.coupon_name || item.couponName || '',
          coupon_type: (item.coupon_type || item.couponType || CouponType.Fixed) as CouponType,
          discount_value: Number(item.discount_value ?? item.couponValue ?? 0),
          min_amount: Number(item.min_amount ?? item.minOrderAmount ?? 0),
          status: item.status || 'unused',
          claimed_at: item.claimed_at || item.created_at || item.createdAt || '',
          used_at: item.used_at || item.usedAt || '',
          expired_at: item.expired_at || item.end_time || item.endTime || '',
          order_no: item.order_no || item.orderNo || item.orderId || '',
        }))
      : []
    ucTotal.value = Number(data.total || userCouponList.value.length || 0)
  } catch {
    userCouponList.value = []
    ucTotal.value = 0
  } finally {
    ucLoading.value = false
  }
}

watch(showUserCoupons, (val) => {
  if (val) {
    userCouponParams.page = 1
    fetchUserCoupons()
  }
})

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.coupon-container {
  .search-card {
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .text-danger {
    color: #f56c6c;
    font-weight: 600;
  }

  .form-tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.4;
    margin-top: 4px;
  }
}
</style>
