<template>
  <div class="appointment-slot-container">
    <!-- 搜索筛选区 -->
    <el-card shadow="hover" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="预约服务">
          <el-select
            v-model="searchForm.service_id"
            placeholder="选择服务"
            clearable
            style="width: 220px"
            @change="handleSearch"
          >
            <el-option
              v-for="svc in serviceOptions"
              :key="svc.id"
              :label="svc.name"
              :value="svc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker
            v-model="searchForm.date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 160px"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleDateRangeChange"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option
              v-for="option in slotStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
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
          <span>预约时段列表</span>
          <div class="header-actions">
            <el-button type="primary" icon="Plus" @click="handleCreate">添加时段</el-button>
            <el-button icon="Calendar" @click="handleBatchCreate">批量生成</el-button>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="slotList" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="service_name" label="服务" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.service_name || '-' }}</template>
        </el-table-column>
        <el-table-column prop="date" label="日期" width="120" align="center" />
        <el-table-column prop="start_time" label="开始时间" width="100" align="center" />
        <el-table-column prop="end_time" label="结束时间" width="100" align="center" />
        <el-table-column prop="capacity" label="容量" width="80" align="center" />
        <el-table-column prop="booked_count" label="已预约" width="80" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-warning': row.booked_count >= row.capacity }">
              {{ row.booked_count }}/{{ row.capacity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSlotStatusTagType(row.status)" size="small">
              {{ getSlotStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEditSlot(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button
              v-if="Number(row.status) === AppointmentSlotStatus.Available"
              link type="warning" size="small"
              @click="handleDisableSlot(row)"
            >
              <el-icon><CircleClose /></el-icon>禁用
            </el-button>
            <el-button
              v-if="Number(row.status) === AppointmentSlotStatus.Disabled"
              link type="success" size="small"
              @click="handleEnableSlot(row)"
            >
              <el-icon><CircleCheck /></el-icon>启用
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

    <!-- 添加时段弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      title="添加预约时段"
      width="500px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="预约服务" prop="service_id">
          <el-select v-model="formData.service_id" placeholder="选择服务" style="width: 100%">
            <el-option
              v-for="svc in serviceOptions"
              :key="svc.id"
              :label="svc.name"
              :value="svc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="formData.date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-time-picker
            v-model="formData.start_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-time-picker
            v-model="formData.end_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="formData.capacity" :min="1" :max="999" />
          <span style="margin-left: 8px; color: var(--el-text-color-secondary)">人</span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量生成弹窗 -->
    <el-dialog
      v-model="batchDialogVisible"
      title="批量生成预约时段"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="batchFormRef" :model="batchFormData" :rules="batchFormRules" label-width="100px">
        <el-form-item label="预约服务" prop="service_id">
          <el-select v-model="batchFormData.service_id" placeholder="选择服务" style="width: 100%">
            <el-option
              v-for="svc in serviceOptions"
              :key="svc.id"
              :label="svc.name"
              :value="svc.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围" prop="date_range">
          <el-date-picker
            v-model="batchFormData.date_range"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-time-picker
            v-model="batchFormData.start_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-time-picker
            v-model="batchFormData.end_time"
            format="HH:mm"
            value-format="HH:mm"
            placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="容量" prop="capacity">
          <el-input-number v-model="batchFormData.capacity" :min="1" :max="999" />
          <span style="margin-left: 8px; color: var(--el-text-color-secondary)">人/时段</span>
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          style="margin-top: 8px"
        >
          将在所选日期范围内，为每天生成一个从开始时间到结束时间的时段
        </el-alert>
      </el-form>

      <template #footer>
        <el-button @click="batchDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="batchSubmitLoading" @click="handleBatchSubmit">确定生成</el-button>
      </template>
    </el-dialog>

    <!-- 编辑时段弹窗 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑预约时段"
      width="440px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="editFormRef" :model="editFormData" label-width="100px">
        <el-form-item label="容量">
          <el-input-number v-model="editFormData.capacity" :min="1" :max="999" />
          <span style="margin-left: 8px; color: var(--el-text-color-secondary)">人</span>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editFormData.status" style="width: 100%">
            <el-option
              v-for="option in slotStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitLoading" @click="handleEditSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getAppointmentSlotList,
  createAppointmentSlot,
  batchCreateAppointmentSlots,
  updateAppointmentSlot,
} from '@/api/appointment'
import { getAppointmentServiceList } from '@/api/appointment'
import type {
  AppointmentSlot,
  AppointmentService,
  AppointmentSlotListParams,
} from '@/types/appointment'
import {
  AppointmentSlotStatus,
  AppointmentSlotStatusLabels,
  AppointmentSlotStatusTagType,
} from '@/types/appointment'

const route = useRoute()

/** 搜索表单 */
const searchForm = reactive<AppointmentSlotListParams>({
  service_id: undefined as unknown as number,
  date: '',
  start_date: '',
  end_date: '',
  status: undefined,
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
const slotList = ref<AppointmentSlot[]>([])
const loading = ref(false)

/** 服务选项 */
const serviceOptions = ref<AppointmentService[]>([])
const slotStatusOptions = Object.entries(AppointmentSlotStatusLabels).map(([key, label]) => ({
  value: Number(key),
  label,
}))

/** 获取状态标签 */
function getSlotStatusLabel(status: number): string {
  return (AppointmentSlotStatusLabels as Record<string, string>)[status] || String(status)
}

/** 获取状态标签类型 */
function getSlotStatusTagType(status: number): string {
  return (AppointmentSlotStatusTagType as Record<string, string>)[status] || 'info'
}

function normalizeService(raw: any): AppointmentService {
  return {
    id: Number(raw?.id || 0),
    name: raw?.name || '',
    description: raw?.description || '',
    duration: Number(raw?.duration || 0),
    price: raw?.price == null ? undefined : Number(raw.price),
    status: Number(raw?.status ?? 0) as any,
    slot_count: Number(raw?.slot_count ?? raw?.slotCount ?? 0),
    created_at: raw?.created_at || raw?.createTime || '',
    updated_at: raw?.updated_at || raw?.updateTime || '',
  }
}

function normalizeSlot(raw: any): AppointmentSlot {
  return {
    id: Number(raw?.id || 0),
    service_id: Number(raw?.service_id ?? raw?.serviceId ?? 0),
    service_name: raw?.service_name || raw?.serviceName || '',
    date: String(raw?.date || ''),
    start_time: raw?.start_time || raw?.startTime || '',
    end_time: raw?.end_time || raw?.endTime || '',
    capacity: Number(raw?.capacity ?? raw?.maxCapacity ?? 0),
    booked_count: Number(raw?.booked_count ?? raw?.bookedCount ?? 0),
    status: Number(raw?.status ?? 0) as AppointmentSlotStatus,
    created_at: raw?.created_at || raw?.createTime || '',
    updated_at: raw?.updated_at || raw?.updateTime || '',
  }
}

/** 获取服务选项列表 */
async function fetchServiceOptions() {
  try {
    const res = await getAppointmentServiceList({ page: 1, page_size: 100 })
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    serviceOptions.value = Array.isArray(list) ? list.map((item: any) => normalizeService(item)) : []
  } catch {
    serviceOptions.value = []
  }
}

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: AppointmentSlotListParams = {
      page: pagination.page,
      page_size: pagination.pageSize,
      service_id: searchForm.service_id || undefined,
      date: searchForm.date || undefined,
      start_date: searchForm.start_date || undefined,
      end_date: searchForm.end_date || undefined,
      status: searchForm.status ?? undefined,
    }
    const res = await getAppointmentSlotList(params)
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    slotList.value = Array.isArray(list) ? list.map((item: any) => normalizeSlot(item)) : []
    pagination.total = Number(data.total || 0)
  } catch {
    slotList.value = []
  } finally {
    loading.value = false
  }
}

/** 日期范围变更 */
function handleDateRangeChange(val: [string, string] | null) {
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
  searchForm.service_id = undefined as unknown as number
  searchForm.date = ''
  searchForm.start_date = ''
  searchForm.end_date = ''
  searchForm.status = undefined
  dateRange.value = null
  pagination.page = 1
  fetchList()
}

// ==================== 添加时段 ====================

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  service_id: undefined as unknown as number,
  date: '',
  start_time: '',
  end_time: '',
  capacity: 10,
})

const formRules: FormRules = {
  service_id: [{ required: true, message: '请选择服务', trigger: 'change' }],
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'blur' }],
}

function handleCreate() {
  formData.service_id = undefined as unknown as number
  formData.date = ''
  formData.start_time = ''
  formData.end_time = ''
  formData.capacity = 10
  dialogVisible.value = true
}

async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    await createAppointmentSlot({
      service_id: formData.service_id,
      date: formData.date,
      start_time: formData.start_time,
      end_time: formData.end_time,
      capacity: formData.capacity,
    })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

// ==================== 批量生成 ====================

const batchDialogVisible = ref(false)
const batchSubmitLoading = ref(false)
const batchFormRef = ref<FormInstance>()

const batchFormData = reactive({
  service_id: undefined as unknown as number,
  date_range: [] as string[],
  start_time: '',
  end_time: '',
  capacity: 10,
})

const batchFormRules: FormRules = {
  service_id: [{ required: true, message: '请选择服务', trigger: 'change' }],
  date_range: [{ required: true, message: '请选择日期范围', trigger: 'change' }],
  start_time: [{ required: true, message: '请选择开始时间', trigger: 'change' }],
  end_time: [{ required: true, message: '请选择结束时间', trigger: 'change' }],
  capacity: [{ required: true, message: '请输入容量', trigger: 'blur' }],
}

function handleBatchCreate() {
  batchFormData.service_id = undefined as unknown as number
  batchFormData.date_range = []
  batchFormData.start_time = ''
  batchFormData.end_time = ''
  batchFormData.capacity = 10
  batchDialogVisible.value = true
}

async function handleBatchSubmit() {
  const valid = await batchFormRef.value?.validate().catch(() => false)
  if (!valid) return

  batchSubmitLoading.value = true
  try {
    await batchCreateAppointmentSlots({
      service_id: batchFormData.service_id,
      date_range: batchFormData.date_range,
      start_time: batchFormData.start_time,
      end_time: batchFormData.end_time,
      capacity: batchFormData.capacity,
    })
    ElMessage.success('批量生成成功')
    batchDialogVisible.value = false
    fetchList()
  } finally {
    batchSubmitLoading.value = false
  }
}

// ==================== 编辑时段 ====================

const editDialogVisible = ref(false)
const editSubmitLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editId = ref(0)
const editTargetRow = ref<AppointmentSlot | null>(null)

const editFormData = reactive({
  capacity: 10,
  status: AppointmentSlotStatus.Available as AppointmentSlotStatus,
})

function handleEditSlot(row: AppointmentSlot) {
  editId.value = row.id
  editTargetRow.value = row
  editFormData.capacity = row.capacity
  editFormData.status = Number(row.status) as AppointmentSlotStatus
  editDialogVisible.value = true
}

async function handleEditSubmit() {
  if (!editTargetRow.value) {
    ElMessage.error('未找到可编辑的时段数据，请重试')
    return
  }
  editSubmitLoading.value = true
  try {
    await updateAppointmentSlot(editId.value, {
      capacity: editFormData.capacity,
      status: Number(editFormData.status) as AppointmentSlotStatus,
      service_id: editTargetRow.value.service_id,
      date: editTargetRow.value.date,
      start_time: editTargetRow.value.start_time,
      end_time: editTargetRow.value.end_time,
    })
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    editTargetRow.value = null
    fetchList()
  } finally {
    editSubmitLoading.value = false
  }
}

/** 禁用时段 */
async function handleDisableSlot(row: AppointmentSlot) {
  await ElMessageBox.confirm('确定禁用该时段？禁用后用户将无法预约', '禁用确认')
  await updateAppointmentSlot(row.id, {
    status: AppointmentSlotStatus.Disabled,
    service_id: row.service_id,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
  })
  ElMessage.success('已禁用')
  fetchList()
}

/** 启用时段 */
async function handleEnableSlot(row: AppointmentSlot) {
  await ElMessageBox.confirm('确定启用该时段？', '启用确认')
  await updateAppointmentSlot(row.id, {
    status: AppointmentSlotStatus.Available,
    service_id: row.service_id,
    date: row.date,
    start_time: row.start_time,
    end_time: row.end_time,
  })
  ElMessage.success('已启用')
  fetchList()
}

onMounted(async () => {
  await fetchServiceOptions()
  // 从路由参数获取服务ID
  const sid = route.query.serviceId
  if (sid) {
    searchForm.service_id = Number(sid)
  }
  fetchList()
})
</script>

<style lang="scss" scoped>
.appointment-slot-container {
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

  .text-warning {
    color: var(--el-color-warning);
    font-weight: 600;
  }
}
</style>
