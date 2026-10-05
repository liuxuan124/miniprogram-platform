<template>
  <div class="ops-page">
    <PageHeader
      kicker="运营中心 / 审核中心"
      title="审核中心"
      description="处理用户举报与账号封禁。举报来自小程序端的「举报」入口；封禁会立即吊销该用户已签发的登录凭证。"
    >
      <template #actions>
        <el-button @click="load">刷新</el-button>
      </template>
    </PageHeader>

    <el-alert type="warning" :closable="false" show-icon class="notice-alert">
      <template #title>封禁会立即让该用户下线</template>
      <div class="notice-alert__body">
        封禁操作会：① 把账号状态改为 <code>banned</code> ② <strong>吊销其已签发的登录凭证</strong>（含未过期的 token）。
        用户重新登录时也会被拦截。解封后恢复为 <code>active</code>，但封禁期间签发的凭证仍然失效。
      </div>
    </el-alert>

    <div class="stat-row">
      <div class="stat-card stat-card--alert">
        <div class="stat-card__k">待处理</div>
        <div class="stat-card__v">{{ pendingCount }}</div>
        <div class="stat-card__d">需尽快处理</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__k">当前筛选</div>
        <div class="stat-card__v">{{ rows.length }}</div>
        <div class="stat-card__d">{{ currentStatusLabel }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-card__k">累计</div>
        <div class="stat-card__v">{{ total }}</div>
        <div class="stat-card__d">全部举报</div>
      </div>
    </div>

    <el-card shadow="never" class="panel">
      <template #header>
        <div class="panel__head">
          <span>举报列表</span>
          <el-radio-group v-model="status" size="small" @change="reload">
            <el-radio-button label="pending">待处理</el-radio-button>
            <el-radio-button label="accepted">已受理</el-radio-button>
            <el-radio-button label="rejected">已驳回</el-radio-button>
            <el-radio-button label="all">全部</el-radio-button>
          </el-radio-group>
        </div>
      </template>

      <el-table :data="rows" v-loading="loading" size="small" border empty-text="暂无举报记录">
        <el-table-column label="类型" width="96">
          <template #default="{ row }">
            <el-tag size="small" effect="plain">{{ targetLabel(row.targetType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="对象" width="110" prop="targetLabel" />
        <el-table-column label="举报理由" min-width="180" prop="reason" show-overflow-tooltip />
        <el-table-column label="证据" width="80">
          <template #default="{ row }">
            <el-popover v-if="(row.evidenceUrls || []).length" placement="top" trigger="click" :width="240">
              <template #reference>
                <el-button link type="primary">{{ (row.evidenceUrls || []).length }} 张</el-button>
              </template>
              <div class="evi-grid">
                <img v-for="(u, i) in row.evidenceUrls" :key="i" :src="u" class="evi-img" alt="证据" />
              </div>
            </el-popover>
            <span v-else class="muted">无</span>
          </template>
        </el-table-column>
        <el-table-column label="举报人" width="120">
          <template #default="{ row }">
            <span v-if="row.reporterUserId">#{{ row.reporterUserId }}</span>
            <span v-else class="muted">未登录</span>
            <div v-if="row.contact" class="muted">{{ row.contact }}</div>
          </template>
        </el-table-column>
        <el-table-column label="时间" width="150">
          <template #default="{ row }">
            <span class="muted">{{ row.createdAt || '' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="86">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">
              {{ statusLabel(row.status) }}
            </el-tag>
            <div v-if="row.handledAt" class="muted">{{ row.handledAt }}</div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center" fixed="right">
          <template #default="{ row }">
            <template v-if="row.status === 'pending'">
              <el-button type="primary" link @click="openHandle(row, 'accepted')">受理</el-button>
              <el-button type="info" link @click="openHandle(row, 'rejected')">驳回</el-button>
            </template>
            <span v-else class="muted">
              {{ row.status === 'accepted' ? '已受理' : '已驳回' }}
            </span>
          </template>
        </el-table-column>
      </el-table>

      <div class="pager">
        <el-pagination
          v-model:current-page="page"
          :page-size="size"
          :total="total"
          layout="total, prev, pager, next"
          background
          @current-change="load"
        />
      </div>
    </el-card>

    <!-- 处理弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'accepted' ? '受理举报' : '驳回举报'"
      width="520px"
    >
      <div v-if="current" class="dlg-body">
        <el-descriptions :column="1" size="small" border>
          <el-descriptions-item label="举报对象">
            {{ current.targetLabel || targetLabel(current.targetType) }}
          </el-descriptions-item>
          <el-descriptions-item label="举报理由">{{ current.reason }}</el-descriptions-item>
          <el-descriptions-item v-if="current.contact" label="联系方式">
            {{ current.contact }}
          </el-descriptions-item>
        </el-descriptions>

        <el-form label-position="top" class="dlg-form">
          <el-form-item label="处理备注" :required="dialogMode === 'rejected'">
            <el-input
              v-model="note"
              type="textarea"
              :rows="3"
              :maxlength="500"
              show-word-limit
              :placeholder="dialogMode === 'rejected' ? '驳回必须写明理由（会展示给用户）' : '可选，会记入台账'"
            />
          </el-form-item>
          <el-form-item v-if="dialogMode === 'accepted'">
            <el-checkbox v-model="banTarget">
              同时封禁被举报作者（仅「作者」类型可用，会立即吊销其登录凭证）
            </el-checkbox>
            <div v-if="banTarget && current.targetType !== 'author'" class="warn-text">
              当前举报对象不是作者，无法自动定位到用户，请到用户管理处手动处理
            </div>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitHandle">
          {{ dialogMode === 'accepted' ? '确认受理' : '确认驳回' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  listComplaints,
  handleComplaint,
  getPendingComplaintCount,
  type ComplaintRecord,
} from '@/api/moderation'

const TARGET_LABELS: Record<string, string> = {
  content: '内容',
  moment: '动态',
  comment: '评论',
  planet_post: '星球动态',
  product: '商品',
  author: '作者',
}
const STATUS_LABELS: Record<string, string> = {
  pending: '待处理',
  accepted: '已受理',
  rejected: '已驳回',
}

const rows = ref<ComplaintRecord[]>([])
const total = ref(0)
const page = ref(1)
const size = 20
const status = ref('pending')
const loading = ref(false)
const pendingCount = ref(0)

const dialogVisible = ref(false)
const submitting = ref(false)
const dialogMode = ref<'accepted' | 'rejected'>('accepted')
const current = ref<ComplaintRecord | null>(null)
const note = ref('')
const banTarget = ref(false)

const currentStatusLabel = computed(
  () => STATUS_LABELS[status.value] || '全部'
)

function targetLabel(t?: string) {
  return t ? TARGET_LABELS[t] || t : ''
}
function statusLabel(s?: string) {
  return s ? STATUS_LABELS[s] || s : ''
}
function statusTagType(s?: string): 'warning' | 'success' | 'info' {
  if (s === 'accepted') return 'success'
  if (s === 'rejected') return 'info'
  return 'warning'
}

async function load() {
  loading.value = true
  try {
    const res = await listComplaints({
      status: status.value,
      current: page.value,
      size,
    })
    const d: any = res?.data || {}
    rows.value = Array.isArray(d.records) ? d.records : []
    total.value = Number(d.total || 0)
  } catch (e) {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function loadPending() {
  try {
    const res = await getPendingComplaintCount()
    pendingCount.value = Number(res?.data || 0)
  } catch (e) {
    pendingCount.value = 0
  }
}

function reload() {
  page.value = 1
  load()
}

function openHandle(row: ComplaintRecord, mode: 'accepted' | 'rejected') {
  current.value = row
  dialogMode.value = mode
  note.value = ''
  // 非「作者」类型无法自动定位用户，勾选也没用，直接禁用
  banTarget.value = false
  dialogVisible.value = true
}

async function submitHandle() {
  if (!current.value) return
  if (dialogMode.value === 'rejected' && !note.value.trim()) {
    ElMessage.warning('驳回必须填写理由')
    return
  }
  submitting.value = true
  try {
    await handleComplaint(current.value.id, {
      status: dialogMode.value,
      note: note.value.trim() || undefined,
      banTarget: dialogMode.value === 'accepted' && banTarget.value,
    })
    ElMessage.success(dialogMode.value === 'accepted' ? '已受理' : '已驳回')
    dialogVisible.value = false
    load()
    loadPending()
  } catch (e) {
    ElMessage.error('处理失败')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  load()
  loadPending()
})
</script>

<style scoped>
.notice-alert {
  margin-bottom: 16px;
}
.notice-alert__body {
  font-size: 12px;
  line-height: 1.7;
}
.notice-alert__body code {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--bg-subtle);
}

.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.stat-card {
  padding: 16px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.stat-card--alert {
  border-color: var(--el-color-warning-light-5, #e6c88a);
}
.stat-card__k {
  font-size: 12px;
  color: var(--text-muted);
}
.stat-card__v {
  margin: 6px 0 2px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.1;
}
.stat-card__d {
  font-size: 12px;
  color: var(--text-muted);
}

.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.muted {
  color: var(--text-muted);
  font-size: 12px;
}

.evi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.evi-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
}

.dlg-body {
  max-height: 62vh;
  overflow: auto;
}
.dlg-form {
  margin-top: 14px;
}
.warn-text {
  font-size: 12px;
  color: var(--el-color-warning);
  line-height: 1.6;
}
</style>
