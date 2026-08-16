<template>
  <div class="activity-page">
    <PageHeader
      kicker="活动与预约 / 活动管理"
      title="活动管理"
      description="沙龙、课程、展会活动的报名、审核、核销。"
    >
      <template #actions>
        <el-button @click="openCheckinCenter">核销记录</el-button>
        <el-button type="primary" @click="openCreateDialog">新建活动</el-button>
      </template>
    </PageHeader>

    <section class="filter-panel">
      <div class="filter-grid">
        <el-input
          v-model="search.keyword"
          placeholder="搜索活动名称"
          clearable
          @keyup.enter="loadActivities"
        />
        <el-select v-model="search.type" placeholder="全部类型" clearable @change="loadActivities">
          <el-option label="活动报名" value="signup" />
          <el-option label="预约服务" value="booking" />
        </el-select>
      </div>
      <div class="filter-actions">
        <el-button @click="resetSearch">重置</el-button>
        <el-button type="primary" @click="loadActivities">查询</el-button>
      </div>
    </section>

    <section class="table-panel">
      <div class="table-toolbar">
        <div>
          <strong>活动列表</strong>
          <span>共 {{ activities.length }} 场</span>
        </div>
      </div>

      <ListStateWrap
        :loading="loading"
        :empty="!loading && activities.length === 0"
        empty-text="暂无活动数据"
        empty-description="可以新建活动，或调整筛选条件后重新查询"
        :skeleton-rows="6"
        @retry="loadActivities"
      >
        <el-table :data="activities" stripe row-key="id" class="activity-table" table-layout="auto">
          <el-table-column label="活动名称" min-width="180">
            <template #default="{ row }">
              <span class="activity-name" :title="row.name">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="100" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" :type="row.type === 'booking' ? 'warning' : 'primary'">
                {{ row.typeLabel }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="日期" width="120">
            <template #default="{ row }">
              <span class="meta-text">{{ row.dateText }}</span>
            </template>
          </el-table-column>
          <el-table-column label="地点" min-width="140">
            <template #default="{ row }">
              <span class="meta-text" :title="row.venue">{{ row.venue }}</span>
            </template>
          </el-table-column>
          <el-table-column label="名额" width="80" align="center">
            <template #default="{ row }">{{ row.quota }}人</template>
          </el-table-column>
          <el-table-column label="报名进度" min-width="150">
            <template #default="{ row }">
              <div class="progress-wrap">
                <el-progress :percentage="row.progress" :stroke-width="8" :show-text="false" />
                <span class="progress-text">{{ row.signed }}/{{ row.quota }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <el-tag :type="activityStatusTagType(row.status)" size="small" effect="plain">
                {{ activityStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="280">
            <template #default="{ row }">
              <div class="row-actions">
                <el-button link type="primary" size="small" @click="openEditDialog(row)">编辑</el-button>
                <el-button link type="primary" size="small" @click="openSignupDialog(row)">管理报名</el-button>
                <el-button link size="small" @click="openScanDialog(row)">扫码核销</el-button>
                <el-button
                  link
                  :type="row.status === 1 ? 'warning' : 'success'"
                  size="small"
                  @click="toggleActivityStatus(row)"
                >
                  {{ row.status === 1 ? '下架' : '发布' }}
                </el-button>
                <el-button link size="small" @click="exportActivity(row)">导出</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </ListStateWrap>
    </section>

    <el-dialog v-model="createDialogVisible" :title="formDialogTitle" width="720px" destroy-on-close>
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
          <div
            class="cover-uploader"
            tabindex="0"
            @paste="onCoverPaste"
          >
            <div v-if="createForm.cover" class="cover-preview">
              <el-image :src="createForm.cover" fit="cover" />
              <div class="cover-actions">
                <el-upload
                  :show-file-list="false"
                  accept="image/*"
                  :disabled="coverUploading"
                  :http-request="handleCoverUpload"
                >
                  <el-button size="small" :loading="coverUploading">更换</el-button>
                </el-upload>
                <el-button size="small" @click="createForm.cover = ''">移除</el-button>
              </div>
            </div>
            <el-upload
              v-else
              class="cover-upload-trigger"
              drag
              :show-file-list="false"
              accept="image/*"
              :disabled="coverUploading"
              :http-request="handleCoverUpload"
            >
              <div class="cover-empty">
                <p>{{ coverUploading ? '上传中…' : '点击 / 拖拽上传封面' }}</p>
                <p class="tip">建议比例 16:9（如 750×422），也可 Ctrl+V 粘贴</p>
              </div>
            </el-upload>
          </div>
          <div class="form-tip">封面建议比例 16:9（推荐 750×422 像素）</div>
        </el-form-item>
        <el-form-item label="活动介绍">
          <PageRichTextEditor v-model="createForm.description" seamless-images class="activity-rich-editor" />
          <div class="form-tip">支持本地上传与粘贴图片；多图上下无缝拼接、无圆角</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button @click="openActivityPreview">预览</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitForm">
          {{ editingId ? '保存修改' : '创建活动' }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="previewVisible"
      title="活动预览"
      width="420px"
      append-to-body
      destroy-on-close
      class="activity-preview-dialog"
    >
      <div class="preview-phone">
        <div class="preview-notch" />
        <div class="preview-scroll">
          <div
            class="pv-cover"
            :class="{ 'has-image': !!createForm.cover }"
            :style="createForm.cover ? undefined : { background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }"
          >
            <img v-if="createForm.cover" :src="createForm.cover" alt="" />
            <template v-else>
              <span class="pv-cover-icon">🎪</span>
            </template>
            <span class="pv-cover-type">{{ previewTypeLabel }}</span>
          </div>

          <div class="pv-section">
            <div class="pv-title">{{ createForm.name || '未命名活动' }}</div>
            <div class="pv-row"><span>📅</span><span>{{ createForm.date || '待定' }}</span></div>
            <div class="pv-row"><span>📍</span><span>{{ createForm.venue || '待定' }}</span></div>
            <div v-if="createForm.quota" class="pv-row">
              <span>👥</span>
              <span>名额 {{ previewSigned }} / {{ createForm.quota }} 人</span>
            </div>
            <div v-if="createForm.quota" class="pv-progress">
              <div class="pv-progress-bar">
                <div class="pv-progress-fill" :style="{ width: `${previewProgress}%` }" />
              </div>
              <span>{{ previewProgress }}%</span>
            </div>
          </div>

          <div class="pv-section">
            <div class="pv-section-title">活动介绍</div>
            <div
              v-if="createForm.description"
              class="pv-rich is-seamless"
              v-html="createForm.description"
            />
            <div v-else class="pv-empty">暂无介绍</div>
          </div>

          <div class="pv-section">
            <div class="pv-section-title">报名信息</div>
            <div class="pv-form-label">姓名</div>
            <div class="pv-form-fake">请输入您的姓名</div>
            <div class="pv-form-label">手机号</div>
            <div class="pv-form-fake">请输入手机号</div>
          </div>
        </div>
        <div class="pv-bottom-bar">
          <div class="pv-submit">立即报名</div>
        </div>
      </div>
      <p class="preview-hint">模拟小程序活动详情，样式供参考，实际以端上为准。</p>
    </el-dialog>

    <el-dialog v-model="signupDialogVisible" :title="`${currentActivity?.name || ''} · 报名管理`" width="960px" destroy-on-close>
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
        <el-table-column prop="name" label="姓名" min-width="90" />
        <el-table-column prop="wxNickname" label="微信昵称" min-width="100">
          <template #default="{ row }">{{ row.wxNickname || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="手机号" min-width="120" />
        <el-table-column prop="session" label="场次" min-width="90" />
        <el-table-column label="报名时间" width="170">
          <template #default="{ row }">{{ row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="signupStatusTagType(row.status)" size="small">{{ signupStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="签到状态" width="100">
          <template #default="{ row }">
            <el-tag :type="checkInStatusTagType(row.checkInStatus)" size="small" effect="plain">
              {{ checkInStatusLabel(row.checkInStatus) }}
            </el-tag>
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

    <el-dialog v-model="scanDialogVisible" title="扫码核销" width="460px" destroy-on-close @opened="focusScanInput">
      <div class="checkin-box" v-if="checkinActivity">
        <div class="checkin-name">{{ checkinActivity.name }}</div>
        <el-input
          ref="scanInputRef"
          v-model="scanRaw"
          clearable
          placeholder="扫码枪录入或粘贴二维码原文 / 签到码"
          @keyup.enter="submitScan"
        />
        <el-button
          size="small"
          type="primary"
          :loading="scanLoading"
          :disabled="!String(scanRaw).trim()"
          style="margin-top: 12px"
          @click="submitScan"
        >核销</el-button>
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
          <template #default="{ row }">{{ row.checkInTime || row.createdAt || '-' }}</template>
        </el-table-column>
        <el-table-column label="核验时间" width="170">
          <template #default="{ row }">{{ row.verifiedAt || row.checkInTime || '-' }}</template>
        </el-table-column>
        <el-table-column label="核验方式" width="120">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ verifyMethodLabel(row.verifyMethod) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="checkInStatusTagType(row.status)" size="small">
              {{ checkInStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100">
          <template #default="{ row }">
            <el-button
              v-if="!isCheckInVerified(row.status)"
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
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ListStateWrap from '@/components/ListStateWrap.vue'
import PageRichTextEditor from '@/components/page-builder/props/PageRichTextEditor.vue'
import { uploadFile, normalizeUploadUrl } from '@/api/system'
import {
  getActivityList,
  createActivity as createActivityApi,
  updateActivity as updateActivityApi,
  updateActivityStatus,
  getActivitySignups,
  approveSignup as approveSignupApi,
  getCheckinStats,
  getCheckinList,
  verifyCheckin as verifyCheckinApi,
  scanCheckIn,
} from '@/api/activity'

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
  cover: string
  description: string
}

interface SignupRow {
  id: number
  name: string
  phone: string
  session: string
  status: string
  createdAt: string
  wxNickname: string
  checkInStatus: string
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
  const labels: Record<number, string> = {
    0: '草稿',
    1: '报名中',
    2: '进行中',
    3: '已结束',
    4: '已取消',
  }
  return labels[status] ?? '草稿'
}

function activityStatusTagType(status: number): 'success' | 'warning' | 'info' | 'danger' {
  if (status === 1 || status === 2) return 'success'
  if (status === 3) return 'info'
  if (status === 4) return 'danger'
  return 'warning'
}

function normalizeActivity(raw: any): ActivityRow {
  const quota = Number(raw.quota || 0)
  const signed = Number(raw.signed || 0)
  const progress = quota > 0 ? Math.min(100, Math.round((signed / quota) * 100)) : 0
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
    cover: raw.cover || '',
    description: raw.description || '',
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

function resetSearch() {
  search.keyword = ''
  search.type = ''
  loadActivities()
}

const createDialogVisible = ref(false)
const createSubmitting = ref(false)
const coverUploading = ref(false)
const editingId = ref<number | null>(null)
const previewVisible = ref(false)
const previewSigned = ref(0)
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

const formDialogTitle = computed(() => (editingId.value ? '编辑活动' : '新建活动'))
const previewTypeLabel = computed(() => activityTypeLabel(createForm.type))
const previewProgress = computed(() => {
  const quota = Number(createForm.quota || 0)
  if (quota <= 0) return 0
  return Math.min(100, Math.round((previewSigned.value / quota) * 100))
})

const createRules: FormRules = {
  name: [{ required: true, message: '请输入活动名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择活动类型', trigger: 'change' }],
  date: [{ required: true, message: '请选择活动日期', trigger: 'change' }],
  venue: [{ required: true, message: '请输入活动地点', trigger: 'blur' }],
}

function resolveUploadUrl(url: string) {
  if (!url) return ''
  try {
    return normalizeUploadUrl(url)
  } catch {
    if (/^(https?:\/\/|data:image\/)/i.test(url)) return url
    if (url.startsWith('/')) return `${window.location.origin}${url}`
    return url
  }
}

async function uploadCoverFile(file: File) {
  if (!file.type.startsWith('image/')) {
    ElMessage.warning('请上传图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('封面图不能超过 5MB')
    return
  }
  coverUploading.value = true
  try {
    const res = await uploadFile(file)
    const url = resolveUploadUrl((res.data as any)?.url || '')
    if (!url) throw new Error('上传返回地址为空')
    createForm.cover = url
    ElMessage.success('封面上传成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '封面上传失败')
  } finally {
    coverUploading.value = false
  }
}

async function handleCoverUpload(options: { file: File }) {
  await uploadCoverFile(options.file)
}

function onCoverPaste(e: ClipboardEvent) {
  const items = Array.from(e.clipboardData?.items || [])
  const imageItem = items.find((it) => it.type.startsWith('image/'))
  if (!imageItem) return
  e.preventDefault()
  const file = imageItem.getAsFile()
  if (file) void uploadCoverFile(file)
}

function resetCreateForm() {
  createForm.name = ''
  createForm.type = 'signup'
  createForm.date = ''
  createForm.venue = ''
  createForm.quota = 0
  createForm.cover = ''
  createForm.description = ''
  previewSigned.value = 0
}

function openCreateDialog() {
  editingId.value = null
  resetCreateForm()
  createDialogVisible.value = true
}

function openEditDialog(row: ActivityRow) {
  editingId.value = row.id
  createForm.name = row.name
  createForm.type = row.type || 'signup'
  createForm.date = row.dateText === '-' ? '' : row.dateText
  createForm.venue = row.venue === '-' ? '' : row.venue
  createForm.quota = row.quota
  createForm.cover = row.cover || ''
  createForm.description = row.description || ''
  previewSigned.value = row.signed || 0
  createDialogVisible.value = true
}

function openActivityPreview() {
  previewVisible.value = true
}

async function submitForm() {
  const valid = await createFormRef.value?.validate().catch(() => false)
  if (!valid) return
  createSubmitting.value = true
  try {
    const payload = {
      name: createForm.name,
      type: createForm.type,
      date: createForm.date,
      venue: createForm.venue,
      quota: createForm.quota,
      cover: createForm.cover || '',
      description: createForm.description || '',
    }
    if (editingId.value) {
      await updateActivityApi(editingId.value, payload)
      ElMessage.success('活动已保存')
    } else {
      const created = await createActivityApi(payload)
      const createdId = Number((created as any)?.data?.id || 0)
      if (createdId > 0) {
        await updateActivityStatus(createdId, 1)
      }
      ElMessage.success('活动创建成功')
    }
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

function checkInStatusKey(status: string): string {
  return String(status || '').toUpperCase()
}

function isCheckInVerified(status: string): boolean {
  return checkInStatusKey(status) === 'VERIFIED'
}

function checkInStatusLabel(status: string): string {
  const key = checkInStatusKey(status)
  if (key === 'VERIFIED') return '已核销'
  if (key === 'PENDING') return '待核销'
  if (key === 'INVALID') return '已失效'
  if (key === 'NONE') return '未签到'
  return '-'
}

function checkInStatusTagType(status: string): 'success' | 'warning' | 'info' | 'danger' {
  const key = checkInStatusKey(status)
  if (key === 'VERIFIED') return 'success'
  if (key === 'PENDING') return 'warning'
  if (key === 'INVALID') return 'danger'
  return 'info'
}

function verifyMethodLabel(method: string): string {
  const key = String(method || '').toUpperCase()
  if (key === 'SCAN') return '扫码'
  if (key === 'MANUAL') return '手动'
  return '待核验'
}

function normalizeSignup(raw: any): SignupRow {
  return {
    id: Number(raw.id),
    name: raw.name || '-',
    phone: raw.phone || '-',
    session: raw.session || '-',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || raw.createTime || '-',
    wxNickname: raw.wxNickname || '',
    checkInStatus: raw.checkInStatus || '',
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

const scanDialogVisible = ref(false)
const checkinActivity = ref<ActivityRow | null>(null)
const scanRaw = ref('')
const scanLoading = ref(false)
const scanInputRef = ref<{ focus: () => void } | null>(null)
const checkinStatsLoading = ref(false)
const checkinStats = ref<any>(null)

async function loadCheckinStats(activityId: number) {
  checkinStatsLoading.value = true
  try {
    const res = await getCheckinStats(activityId)
    checkinStats.value = (res as any).data || null
  } catch {
    checkinStats.value = null
  } finally {
    checkinStatsLoading.value = false
  }
}

function focusScanInput() {
  nextTick(() => scanInputRef.value?.focus())
}

async function openScanDialog(row: ActivityRow) {
  checkinActivity.value = row
  scanRaw.value = ''
  checkinStats.value = null
  scanDialogVisible.value = true
  await loadCheckinStats(row.id)
}

async function submitScan() {
  const raw = String(scanRaw.value || '').trim()
  if (!raw) {
    ElMessage.warning('请录入或粘贴签到码')
    return
  }
  if (!checkinActivity.value || scanLoading.value) return
  scanLoading.value = true
  try {
    const res = await scanCheckIn(raw, checkinActivity.value.id)
    const data = (res as any).data || {}
    const name = data.signupName || '-'
    const phone = data.phone || '-'
    ElMessage.success(`核销成功：${name} ${phone}`)
    scanRaw.value = ''
    await loadCheckinStats(checkinActivity.value.id)
    focusScanInput()
  } catch {
    // 错误由 request 拦截器提示（已核销 / 非本场等）
  } finally {
    scanLoading.value = false
  }
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
    await verifyCheckinApi(row.id, 'MANUAL')
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
  padding: 4px 4px 24px;
  background: transparent;

  .filter-panel,
  .table-panel {
    border: 1px solid var(--border);
    border-radius: var(--radius);
    background: var(--bg-elevated);
  }

  .filter-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 14px 0;
    padding: 14px;
  }

  .filter-grid {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    flex: 1;
    min-width: 0;

    :deep(.el-input) {
      width: 240px;
      max-width: 100%;
    }

    :deep(.el-select) {
      width: 160px;
      max-width: 100%;
    }
  }

  .filter-actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    flex: none;
  }

  .table-panel {
    padding: 14px;
    overflow-x: auto;
  }

  .table-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 12px;

    strong {
      color: var(--text);
      font-size: var(--font-h3);
    }

    span {
      margin-left: var(--space-2);
      color: var(--text-muted);
      font-size: var(--font-caption);
    }
  }

  .activity-table {
    width: 100%;

    :deep(.el-table__inner-wrapper::before) {
      display: none;
    }
  }

  .activity-name {
    color: var(--text);
    font-weight: 700;
  }

  .meta-text {
    color: var(--text-muted);
    font-size: 13px;
  }

  .progress-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .progress-text {
    flex: none;
    min-width: 46px;
    color: var(--text-muted);
    font-size: 12px;
  }

  .row-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
  }

  .signup-stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .stat-card {
    border: 1px solid var(--border, #e4e9f2);
    border-radius: var(--radius, 12px);
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
    margin-bottom: 12px;
  }

  .done-text {
    color: #0faa6e;
    font-size: 12px;
  }

  .cover-uploader {
    width: 100%;
    outline: none;
  }

  .cover-upload-trigger {
    width: 100%;

    :deep(.el-upload),
    :deep(.el-upload-dragger) {
      width: 100%;
      padding: 0;
      border-radius: 10px;
    }
  }

  .cover-empty {
    padding: 28px 16px;
    color: var(--text-muted);
    font-size: 13px;
    line-height: 1.5;

    .tip {
      margin-top: 6px;
      font-size: 12px;
      color: #99a3b5;
    }
  }

  .cover-preview {
    position: relative;
    width: 100%;
    max-width: 360px;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid var(--border, #e4e9f2);
    border-radius: 10px;
    background: #f5f7fb;

    :deep(.el-image) {
      width: 100%;
      height: 100%;
    }
  }

  .cover-actions {
    position: absolute;
    right: 10px;
    bottom: 10px;
    display: flex;
    gap: 8px;
  }

  .activity-rich-editor {
    width: 100%;
    border: 1px solid var(--border, #e4e9f2);
    border-radius: 10px;
    overflow: hidden;
    background: #fff;
  }

  .form-tip {
    margin-top: 6px;
    color: #99a3b5;
    font-size: 12px;
  }
}

.preview-phone {
  position: relative;
  width: 360px;
  margin: 0 auto;
  border: 10px solid #1a1a1a;
  border-radius: 28px;
  background: #f5f5f5;
  overflow: hidden;
}

.preview-notch {
  width: 120px;
  height: 18px;
  margin: 8px auto 0;
  border-radius: 10px;
  background: #111;
}

.preview-scroll {
  max-height: 560px;
  overflow: auto;
  padding-bottom: 72px;
  background: #f5f5f5;
}

.pv-cover {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: linear-gradient(135deg, #7c3aed, #a855f7);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.pv-cover-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.pv-cover-type {
  position: absolute;
  left: 50%;
  bottom: 14px;
  transform: translateX(-50%);
  padding: 3px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
}

.pv-section {
  margin-top: 10px;
  padding: 14px 14px 16px;
  background: #fff;
}

.pv-title {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 10px;
  line-height: 1.35;
}

.pv-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
  color: #666;
  font-size: 13px;
  line-height: 1.4;
}

.pv-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  color: #999;
  font-size: 12px;
}

.pv-progress-bar {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: #eee;
  overflow: hidden;
}

.pv-progress-fill {
  height: 100%;
  border-radius: 999px;
  background: #7c3aed;
}

.pv-section-title {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 10px;
}

.pv-rich {
  color: #333;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;

  :deep(img) {
    max-width: 100%;
    height: auto;
    display: block;
  }

  &.is-seamless {
    :deep(p) {
      margin: 0;
      padding: 0;
      line-height: 0;
      font-size: 0;
    }

    :deep(img) {
      width: 100%;
      border-radius: 0;
      margin: 0;
      vertical-align: top;
    }
  }
}

.pv-empty {
  color: #99a3b5;
  font-size: 13px;
}

.pv-form-label {
  margin: 10px 0 6px;
  color: #333;
  font-size: 13px;
}

.pv-form-fake {
  padding: 10px 12px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  color: #bbb;
  font-size: 13px;
  background: #fafafa;
}

.pv-bottom-bar {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 10px 14px calc(10px + env(safe-area-inset-bottom, 0));
  background: #fff;
  border-top: 1px solid #eee;
}

.pv-submit {
  height: 42px;
  border-radius: 999px;
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-hint {
  margin: 12px 0 0;
  text-align: center;
  color: #99a3b5;
  font-size: 12px;
}

@media (max-width: 900px) {
  .activity-page {
    .filter-panel {
      flex-direction: column;
      align-items: stretch;
    }

    .filter-grid {
      :deep(.el-input),
      :deep(.el-select) {
        width: 100%;
      }
    }
  }
}
</style>
