<template>
  <div class="appointment-service-container">
    <!-- 搜索筛选区 -->
    <el-card shadow="hover" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索服务名称"
            clearable
            @keyup.enter="handleSearch"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable style="width: 130px">
            <el-option
              v-for="option in serviceStatusOptions"
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
          <span>预约服务列表</span>
          <div class="header-actions">
            <el-button type="primary" icon="Plus" @click="handleCreate">添加服务</el-button>
          </div>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table v-loading="loading" :data="serviceList" border stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="服务名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="description" label="服务描述" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">{{ row.description || '-' }}</template>
        </el-table-column>
        <el-table-column prop="duration" label="时长(分钟)" width="110" align="center" />
        <el-table-column prop="price" label="价格" width="100" align="center">
          <template #default="{ row }">
            <span v-if="row.price !== undefined && row.price !== null">¥{{ row.price }}</span>
            <span v-else>免费</span>
          </template>
        </el-table-column>
        <el-table-column prop="slot_count" label="时段数" width="90" align="center" />
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updated_at" label="更新时间" width="170" align="center" />
        <el-table-column label="操作" width="250" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>编辑
            </el-button>
            <el-button link type="info" size="small" @click="handleViewSlots(row)">
              <el-icon><Clock /></el-icon>时段
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

    <!-- 创建/编辑服务弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑预约服务' : '添加预约服务'"
      width="560px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="服务名称" prop="name">
          <el-input v-model="formData.name" placeholder="请输入服务名称" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item label="服务描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            placeholder="请输入服务描述"
            :rows="3"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
        <el-form-item label="服务时长" prop="duration">
          <el-input-number v-model="formData.duration" :min="5" :step="5" :max="480" />
          <span style="margin-left: 8px; color: var(--el-text-color-secondary)">分钟</span>
        </el-form-item>
        <el-form-item label="服务价格">
          <el-input-number v-model="formData.price" :min="0" :precision="2" :step="10" />
          <span style="margin-left: 8px; color: var(--el-text-color-secondary)">元（0为免费）</span>
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="formData.status" style="width: 200px">
            <el-option
              v-for="option in serviceStatusOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  getAppointmentServiceList,
  createAppointmentService,
  updateAppointmentService,
  deleteAppointmentService,
} from '@/api/appointment'
import type {
  AppointmentService,
  AppointmentServiceListParams,
} from '@/types/appointment'
import {
  AppointmentServiceStatus,
  AppointmentServiceStatusLabels,
  AppointmentServiceStatusTagType,
} from '@/types/appointment'

const router = useRouter()

/** 搜索表单 */
const searchForm = reactive<AppointmentServiceListParams>({
  keyword: '',
  status: undefined,
})

/** 分页 */
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

/** 列表数据 */
const serviceList = ref<AppointmentService[]>([])
const loading = ref(false)
const serviceStatusOptions = Object.entries(AppointmentServiceStatusLabels).map(([key, label]) => ({
  value: Number(key),
  label,
}))

/** 获取状态标签 */
function getStatusLabel(status: number): string {
  return (AppointmentServiceStatusLabels as Record<string, string>)[status] || String(status)
}

/** 获取状态标签类型 */
function getStatusTagType(status: number): string {
  return (AppointmentServiceStatusTagType as Record<string, string>)[status] || 'info'
}

function normalizeService(raw: any): AppointmentService {
  return {
    id: Number(raw?.id || 0),
    name: raw?.name || '',
    description: raw?.description || '',
    duration: Number(raw?.duration || 0),
    price: raw?.price == null ? undefined : Number(raw.price),
    status: Number(raw?.status ?? 0) as AppointmentServiceStatus,
    slot_count: Number(raw?.slot_count ?? raw?.slotCount ?? 0),
    created_at: raw?.created_at || raw?.createTime || '',
    updated_at: raw?.updated_at || raw?.updateTime || '',
  }
}

/** 获取列表 */
async function fetchList() {
  loading.value = true
  try {
    const params: AppointmentServiceListParams = {
      page: pagination.page,
      page_size: pagination.pageSize,
      ...searchForm,
    }
    const res = await getAppointmentServiceList(params)
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    serviceList.value = Array.isArray(list) ? list.map((item: any) => normalizeService(item)) : []
    pagination.total = Number(data.total || 0)
  } catch {
    serviceList.value = []
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
  searchForm.status = undefined
  pagination.page = 1
  fetchList()
}

// ==================== 服务创建/编辑 ====================

const dialogVisible = ref(false)
const isEdit = ref(false)
const editId = ref(0)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  name: '',
  description: '',
  duration: 30,
  price: 0,
  status: AppointmentServiceStatus.Active,
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入服务名称', trigger: 'blur' }],
  duration: [{ required: true, message: '请输入服务时长', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

/** 创建服务 */
function handleCreate() {
  isEdit.value = false
  editId.value = 0
  formData.name = ''
  formData.description = ''
  formData.duration = 30
  formData.price = 0
  formData.status = AppointmentServiceStatus.Active
  dialogVisible.value = true
}

/** 编辑服务 */
function handleEdit(row: AppointmentService) {
  isEdit.value = true
  editId.value = row.id
  formData.name = row.name
  formData.description = row.description || ''
  formData.duration = row.duration
  formData.price = row.price || 0
  formData.status = row.status
  dialogVisible.value = true
}

/** 提交 */
async function handleSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      duration: formData.duration,
      price: formData.price || undefined,
      status: formData.status,
    }
    if (isEdit.value) {
      await updateAppointmentService(editId.value, payload)
      ElMessage.success('更新成功')
    } else {
      await createAppointmentService(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } finally {
    submitLoading.value = false
  }
}

/** 删除 */
async function handleDelete(row: AppointmentService) {
  await ElMessageBox.confirm(`确定删除服务「${row.name}」？此操作不可恢复`, '删除确认', { type: 'warning' })
  await deleteAppointmentService(row.id)
  ElMessage.success('删除成功')
  fetchList()
}

/** 查看时段 */
function handleViewSlots(row: AppointmentService) {
  router.push({ name: 'AppointmentSlot', query: { serviceId: row.id.toString() } })
}

onMounted(() => {
  fetchList()
})
</script>

<style lang="scss" scoped>
.appointment-service-container {
  .search-card {
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  }

  .pagination-wrapper {
    display: flex;
    justify-content: flex-end;
    margin-top: 16px;
  }
}
</style>
