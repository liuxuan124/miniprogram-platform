<template>
  <div class="activity-page">
    <div class="page-header">
      <div class="page-title">活动管理</div>
      <div class="page-desc">沙龙、课程、展会活动的报名、审核、核销。</div>
    </div>

    <div class="toolbar">
      <el-input
        v-model="search.keyword"
        class="toolbar-input"
        placeholder="搜索活动"
        clearable
        @keyup.enter="loadActivities"
      />
      <el-select v-model="search.type" class="toolbar-select" placeholder="类型：全部" clearable @change="loadActivities">
        <el-option label="活动报名" value="signup" />
        <el-option label="预约服务" value="booking" />
      </el-select>
      <div class="toolbar-spacer" />
      <el-button @click="openCheckinCenter">核销记录</el-button>
      <el-button type="primary" @click="openCreateDialog">+ 新建活动</el-button>
    </div>

    <div class="table-panel">
      <el-table :data="activities" stripe v-loading="loading">
        <el-table-column label="活动名称" min-width="190">
          <template #default="{ row }"><b>{{ row.name }}</b></template>
        </el-table-column>
        <el-table-column label="类型" width="110" align="center">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.typeLabel }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="日期" width="120" prop="dateText" />
        <el-table-column label="地点" min-width="160" prop="venue" />
        <el-table-column label="名额" width="90" align="center">
          <template #default="{ row }">{{ row.quota }}人</template>
        </el-table-column>
        <el-table-column label="报名进度" width="170">
          <template #default="{ row }">
            <div class="progress-wrap">
              <el-progress :percentage="row.progress" :stroke-width="8" :show-text="false" />
              <span class="progress-text">{{ row.signed }}/{{ row.quota }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="activityStatusTagType(row.status)" size="small">
              {{ activityStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openSignupDialog(row)">管理报名</el-button>
            <el-button link size="small" @click="openCheckinCodeDialog(row)">签到码</el-button>
            <el-button
              link
              :type="row.status === 1 ? 'warning' : 'success'"
              size="small"
              @click="toggleActivityStatus(row)"
            >
              {{ row.status === 1 ? '下架' : '发布' }}
            </el-button>
            <el-button link size="small" @click="exportActivity(row)">导出</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="createDialogVisible" title="新建活动" width="560px" destroy-on-close>
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px">
        <el-form-item label="活动名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入活动名称" />
        </el-form-item>
        <el-form-item label="活动类型" prop="type">
          <el-select v-model="createForm.type" style="width: 100%">
            <el-option label="活动报名" value="signup" />
            <el-option label="预约服务" value="booking" />
          </el-select>
        </el-form-item>
        <el-form-item label="活动日期" prop="date">
          <el-date-picker v-model="createForm.date" value-format="YYYY-MM-DD" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="活动地点" prop="venue">
          <el-input v-model="createForm.venue" placeholder="线下地址或线上链接" />
        </el-form-item>
        <el-form-item label="名额限制" prop="quota">
          <el-input-number v-model="createForm.quota" :min="0" :max="9999" style="width: 100%" />
        </el-form-item>
        <el-form-item label="活动封面">
          <el-input v-model="createForm.cover" placeholder="封面图片 URL（可选）" />
        </el-form-item>
        <el-form-item label="活动介绍">
          <el-input v-model="createForm.description" type="textarea" :rows="4" placeholder="请输入活动介绍..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">创建活动</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="signupDialogVisible" :title="`${currentActivity?.name || ''} · 报名管理`" width="820px" destroy-on-close>
      <div class="signup-stats" v-if="currentActivity">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-num">{{ currentActivity.signed }}</div>
          <div class="stat-label">报名人数 / {{ currentActivity.quota }} 名额</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-num">{{ approvedCount }}</div>
          <div class="stat-label">已审核</div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-num">{{ currentActivity.dateText }}</div>
          <div class="stat-label">{{ currentActivity.venue }}</div>
        </div>
      </div>
      <el-table :data="signups" stripe v-loading="signupLoading">
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="phone" label="手机号" />
        <el-table-column prop="session" label="场次" />
        <el-table-column label="报名时间" width="170">
          <template #default="{ row }">{{ row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="signupStatusTagType(row.status)" size="small">{{ signupStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="reviewSignup(row, true)">批准</el-button>
            <el-button link type="danger" size="small" @click="reviewSignup(row, false)">拒绝</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-dialog v-model="checkinCodeDialogVisible" title="签到码" width="460px" destroy-on-close>
      <div class="checkin-box" v-if="checkinActivity">
        <div class="checkin-name">{{ checkinActivity.name }}</div>
        <div class="checkin-code">{{ checkinCode }}</div>
        <el-button size="small" type="primary" @click="copyCheckinCode">复制签到码</el-button>
      </div>
      <div class="checkin-stats" v-loading="checkinStatsLoading">
        <el-descriptions v-if="checkinStats" :column="2" border size="small">
          <el-descriptions-item label="总签到">{{ checkinStats.total || 0 }}</el-descriptions-item>
          <el-descriptions-item label="已核销">{{ checkinStats.verified || 0 }}</el-descriptions-item>
          <el-descriptions-item label="待核销">{{ checkinStats.pending || 0 }}</el-descriptions-item>
          <el-descriptions-item label="签到率">{{ checkinStats.rate || '-' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <el-dialog v-model="checkinCenterVisible" title="核销记录" width="860px" destroy-on-close>
      <el-table :data="checkins" stripe v-loading="checkinLoading">
        <el-table-column label="活动ID" width="90" prop="activityId" />
        <el-table-column label="用户ID" width="90" prop="userId" />
        <el-table-column label="签到时间" width="170">
          <template #default="{ row }">{{ row.checkinTime || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="核验时间" width="170">
          <template #default="{ row }">{{ row.verifiedAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="核验方式" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ row.verifyMethod || '待核验' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'verified' ? 'success' : 'warning'" size="small">
              {{ row.status === 'verified' ? '已核销' : '待核销' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'verified'"
              link
              type="primary"
              size="small"
              :loading="verifyLoadingId === row.id"
              @click="verifyCheckin(row)"
            >核验</el-button>
            <span v-else class="done-text">已核销</span>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { getActivityList, createActivity as createActivityApi, updateActivityStatus, getActivitySignups, approveSignup as approveSignupApi, getCheckinStats, getCheckinList, verifyCheckin as verifyCheckinApi } from '@/api/activity'

interface ActivityRow {
  id: number
  name: string
  type: string
  typeLabel: string
  dateText: string
  venue: string
  quota: number
  signed: number
  progress: number
  status: number
}

interface SignupRow {
  id: number
  name: string
  phone: string
  session: string
  status: string
  createdAt: string
}

const loading = ref(false)
const activities = ref<ActivityRow[]>([])

const search = reactive({
  keyword: '',
  type: '',
})

function activityTypeLabel(type: string): string {
  if (type === 'booking') return '预约服务'
  return '活动报名'
}

function activityStatusLabel(status: number): string {
  if (status === 1) return '进行中'
  if (status === 2) return '已结束'
  return '草稿'
}

function activityStatusTagType(status: number): 'success' | 'warning' | 'info' {
  if (status === 1) return 'success'
  if (status === 2) return 'info'
  return 'warning'
}

function normalizeActivity(raw: any): ActivityRow {
  const quota = Number(raw.quota || 0)
  const signed = Number(raw.signed || 0)
  const progress = quota > 0 ? Math.min(100, Math.round((signed / quota) * 100)) : 50
  const status = Number(raw.status ?? 0)
  return {
    id: Number(raw.id),
    name: raw.name || '未命名活动',
    type: raw.type || 'signup',
    typeLabel: activityTypeLabel(raw.type || 'signup'),
    dateText: raw.date || '-',
    venue: raw.venue || '-',
    quota,
    signed,
    progress,
    status,
  }
}

async function loadActivities() {
  loading.value = true
  try {
    const res = await getActivityList({
      current: 1,
      size: 100,
      keyword: search.keyword || undefined,
      type: search.type || undefined,
    })
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    activities.value = Array.isArray(list) ? list.map((item: any) => normalizeActivity(item)) : []
  } catch {
    activities.value = []
  } finally {
    loading.value = false
  }
}

const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  name: '',
  type: 'signup',
  date: '',
  venue: '',
  quota: 0,
  cover: '',
  description: '',
})

const createRules: FormRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  date: [{ required: true, message: '请选择活动日期', trigger: 'change' }],
  venue: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
}

function openCreateDialog() {
  createForm.name = ''
  createForm.type = 'signup'
  createForm.date = ''
  createForm.venue = ''
  createForm.quota = 0
  createForm.cover = ''
  createForm.description = ''
  createDialogVisible.value = true
}

async function submitCreate() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  createSubmitting.value = true
  try {
    const created = await createActivityApi(createForm as any)
    const createdId = Number((created as any)?.data?.id || 0)
    if (createdId > 0) {
      await updateActivityStatus(createdId, 1)
    }
    ElMessage.success('活动创建成功')
    createDialogVisible.value = false
    loadActivities()
  } finally {
    createSubmitting.value = false
  }
}

async function toggleActivityStatus(row: ActivityRow) {
  const nextStatus = row.status === 1 ? 0 : 1
  await updateActivityStatus(row.id, nextStatus)
  ElMessage.success(nextStatus === 1 ? '活动已发布' : '活动已下架')
  loadActivities()
}

const signupDialogVisible = ref(false)
const signupLoading = ref(false)
const currentActivity = ref<ActivityRow | null>(null)
const signups = ref<SignupRow[]>([])

const approvedCount = computed(() => signups.value.filter((s) => s.status === 'approved').length)

function signupStatusLabel(status: string): string {
  if (status === 'approved') return '已批准'
  if (status === 'rejected') return '已拒绝'
  return '待审核'
}

function signupStatusTagType(status: string): 'success' | 'danger' | 'warning' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

function normalizeSignup(raw: any): SignupRow {
  return {
    id: Number(raw.id),
    name: raw.name || '-',
    phone: raw.phone || '-',
    session: raw.session || '-',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || raw.createTime || '-',
  }
}

async function openSignupDialog(row: ActivityRow) {
  currentActivity.value = row
  signupDialogVisible.value = true
  signupLoading.value = true
  try {
    const res = await getActivitySignups(row.id, { current: 1, size: 100 })
    const data = (res as any).data || {}
    const list = data.records || data.list || []
    signups.value = Array.isArray(list) ? list.map((s: any) => normalizeSignup(s)) : []
  } catch {
    signups.value = []
  } finally {
    signupLoading.value = false
  }
}

async function reviewSignup(row: SignupRow, approved: boolean) {
  await approveSignupApi(row.id, approved)
  ElMessage.success(approved ? '已批准' : '已拒绝')
  if (currentActivity.value) openSignupDialog(currentActivity.value)
}

const checkinCodeDialogVisible = ref(false)
const checkinActivity = ref<ActivityRow | null>(null)
const checkinCode = ref('')
const checkinStatsLoading = ref(false)
const checkinStats = ref<any>(null)

function makeCheckinCode(activityId: number) {
  const head = activityId.toString(36).toUpperCase().padStart(3, '0')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `CHK-${head}-${rand}`
}

async function openCheckinCodeDialog(row: ActivityRow) {
  checkinActivity.value = row
  checkinCode.value = makeCheckinCode(row.id)
  checkinStats.value = null
  checkinCodeDialogVisible.value = true
  checkinStatsLoading.value = true
  try {
    const res = await getCheckinStats(row.id)
    checkinStats.value = (res as any).data || null
  } catch {
    checkinStats.value = null
  } finally {
    checkinStatsLoading.value = false
  }
}

function copyCheckinCode() {
  navigator.clipboard.writeText(checkinCode.value).then(() => {
    ElMessage.success('签到码已复制')
  })
}

const checkinCenterVisible = ref(false)
const checkins = ref<any[]>([])
const checkinLoading = ref(false)
const verifyLoadingId = ref<number | null>(null)

async function openCheckinCenter() {
  checkinCenterVisible.value = true
  checkinLoading.value = true
  try {
    // 原型是统一“核销记录”入口，这里默认聚合最近活动记录（前端汇总）
    const collected: any[] = []
    for (const item of activities.value.slice(0, 8)) {
      const res = await getCheckinList({ activityId: item.id })
      const list = (res as any).data || []
      if (Array.isArray(list)) {
        list.forEach((x: any) => collected.push(x))
      }
    }
    checkins.value = collected.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  } catch {
    checkins.value = []
  } finally {
    checkinLoading.value = false
  }
}

async function verifyCheckin(row: any) {
  verifyLoadingId.value = Number(row.id)
  try {
    await verifyCheckinApi(row.id, 'manual')
    ElMessage.success('核验成功')
    openCheckinCenter()
  } finally {
    verifyLoadingId.value = null
  }
}

function exportActivity(row: ActivityRow) {
  const headers = ['活动ID', '活动名称', '类型', '日期', '地点', '名额', '报名人数', '状态']
  const lines = [
    headers.join(','),
    [
      row.id,
      `"${String(row.name).replace(/"/g, '""')}"`,
      row.typeLabel,
      row.dateText,
      `"${String(row.venue).replace(/"/g, '""')}"`,
      row.quota,
      row.signed,
      activityStatusLabel(row.status),
    ].join(','),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `活动数据-${row.name}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

onMounted(() => {
  loadActivities()
})
</script>

<style lang="scss" scoped>
.activity-page {
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
  }

  .toolbar-input {
    width: 180px;
  }

  .toolbar-select {
    width: 170px;
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

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .progress-text {
    font-size: 12px;
    color: #6b7b93;
    min-width: 46px;
  }

  .signup-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    border: 1px solid #e4e9f2;
    border-radius: 12px;
    padding: 14px;
    text-align: center;
    background: #f8faff;
  }

  .stat-icon {
    font-size: 22px;
    margin-bottom: 4px;
  }

  .stat-num {
    color: #1769ff;
    font-size: 20px;
    font-weight: 800;
  }

  .stat-label {
    font-size: 12px;
    color: #6b7b93;
    margin-top: 4px;
  }

  .checkin-box {
    border: 1px dashed #b8c9e6;
    border-radius: 12px;
    background: #f8faff;
    padding: 16px;
    text-align: center;
    margin-bottom: 14px;
  }

  .checkin-name {
    color: #6b7b93;
    font-size: 13px;
  }

  .checkin-code {
    margin: 10px 0;
    font-size: 28px;
    font-weight: 800;
    letter-spacing: 2px;
    color: #1769ff;
    font-family: 'Courier New', monospace;
  }

  .done-text {
    color: #0faa6e;
    font-size: 12px;
  }
}
</style>
