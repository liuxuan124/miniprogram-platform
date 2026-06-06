<template>
  <div class="version-management">
    <!-- 顶部工具栏 -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <h2 class="page-title">版本管理</h2>
        <el-tag v-if="latestRelease" type="success" effect="dark" size="large" round>
          当前版本：v{{ latestRelease.semver }}
        </el-tag>
      </div>
      <div class="toolbar-right">
        <el-button :icon="Refresh" @click="fetchData">刷新</el-button>
      </div>
    </div>

    <!-- 提示信息 -->
    <div class="info-banner">
      <el-icon :size="18"><InfoFilled /></el-icon>
      <span>专业版本控制台：查看所有版本历史（含模板、已发布、已替换），执行回滚操作，审计操作日志。日常模板管理请前往「<strong>小程序搭建</strong>」页面。</span>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" class="main-tabs">
      <!-- 版本记录 -->
      <el-tab-pane label="版本记录" name="records">
        <!-- 统计卡片 -->
        <div class="stats-row">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2)">
                <el-icon :size="24"><Document /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.total }}</div>
                <div class="stat-label">总版本数</div>
              </div>
            </div>
          </el-card>
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #0faa6e, #38ef7d)">
                <el-icon :size="24"><CircleCheck /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.published }}</div>
                <div class="stat-label">已发布版本</div>
              </div>
            </div>
          </el-card>
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-icon" style="background: linear-gradient(135deg, #1769ff, #5b8def)">
                <el-icon :size="24"><Flag /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.current }}</div>
                <div class="stat-label">当前版本</div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 版本时间线 -->
        <el-card shadow="hover" class="timeline-card">
          <div v-loading="recordsLoading" class="timeline-wrapper">
            <el-empty v-if="!recordsLoading && releaseList.length === 0" description="暂无版本记录">
              <p class="empty-hint">暂无版本记录。前往「小程序搭建」页面保存模板或发布上线后，版本记录将在此处显示。</p>
              <el-button type="primary" @click="$router.push('/page-builder/miniapp')">
                前往小程序搭建
              </el-button>
            </el-empty>
            <el-timeline v-else>
              <el-timeline-item
                v-for="item in releaseList"
                :key="item.id"
                :timestamp="formatTime(item.createTime)"
                placement="top"
                :color="getTimelineColor(item)"
                size="large"
              >
                <div class="version-node" :class="{ 'is-expanded': expandedId === item.id }">
                  <div class="version-header" @click="toggleExpand(item.id)">
                    <div class="version-header-left">
                      <el-tag
                        :color="getChangeTypeColor(item.changeType)"
                        effect="dark"
                        class="semver-tag"
                        round
                      >
                        v{{ item.semver }}
                      </el-tag>
                      <el-tag
                        :type="getStatusTagType(item.status)"
                        size="small"
                        effect="plain"
                        round
                      >
                        {{ getStatusLabel(item.status) }}
                      </el-tag>
                      <span class="change-type-label" :style="{ color: getChangeTypeColor(item.changeType) }">
                        {{ getChangeTypeLabel(item.changeType) }}
                      </span>
                    </div>
                    <div class="version-header-right">
                      <span v-if="item.publisherName" class="publisher">
                        <el-icon><User /></el-icon>
                        {{ item.publisherName }}
                      </span>
                      <el-icon class="expand-icon" :class="{ 'is-rotated': expandedId === item.id }">
                        <ArrowDown />
                      </el-icon>
                    </div>
                  </div>
                  <div v-if="item.releaseNotes" class="version-notes-preview">
                    {{ truncateNotes(item.releaseNotes) }}
                  </div>

                  <!-- 展开详情 -->
                  <transition name="expand">
                    <div v-if="expandedId === item.id" class="version-detail">
                      <el-descriptions :column="2" border size="small">
                        <el-descriptions-item label="版本号">v{{ item.semver }}</el-descriptions-item>
                        <el-descriptions-item label="变更类型">
                          <el-tag :color="getChangeTypeColor(item.changeType)" effect="dark" size="small" round>
                            {{ getChangeTypeLabel(item.changeType) }}
                          </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="状态">
                          <el-tag :type="getStatusTagType(item.status)" size="small" round>
                            {{ getStatusLabel(item.status) }}
                          </el-tag>
                        </el-descriptions-item>
                        <el-descriptions-item label="页面数量">{{ item.pageCount }}</el-descriptions-item>
                        <el-descriptions-item label="发布人">{{ item.publisherName || '-' }}</el-descriptions-item>
                        <el-descriptions-item label="发布时间">{{ item.publishedAt || '-' }}</el-descriptions-item>
                        <el-descriptions-item v-if="item.status === 2" label="回滚人">
                          {{ item.rolledBackBy || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item v-if="item.status === 2" label="回滚时间">
                          {{ item.rolledBackAt || '-' }}
                        </el-descriptions-item>
                        <el-descriptions-item label="创建时间" :span="2">
                          {{ formatTime(item.createTime) }}
                        </el-descriptions-item>
                        <el-descriptions-item v-if="item.releaseNotes" label="发布说明" :span="2">
                          {{ item.releaseNotes }}
                        </el-descriptions-item>
                      </el-descriptions>

                      <div class="version-actions">
                        <el-button
                          v-if="item.status === 1"
                          type="warning"
                          size="small"
                          :icon="RefreshLeft"
                          @click.stop="openRollbackDialog(item)"
                        >
                          回滚到此版本
                        </el-button>
                        <el-button
                          size="small"
                          :icon="View"
                          @click.stop="handleViewSnapshot(item)"
                        >
                          查看快照
                        </el-button>
                      </div>
                    </div>
                  </transition>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-card>
      </el-tab-pane>

      <!-- 操作日志 -->
      <el-tab-pane label="操作日志" name="logs">
        <el-card shadow="hover">
          <!-- 日志筛选 -->
          <div class="log-filters">
            <el-select v-model="logFilter.operation" placeholder="操作类型" clearable style="width: 160px">
              <el-option label="创建" value="create" />
              <el-option label="发布" value="publish" />
              <el-option label="回滚" value="rollback" />
            </el-select>
            <el-date-picker
              v-model="logFilter.timeRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 280px"
            />
            <el-button type="primary" :icon="Search" @click="fetchLogs">查询</el-button>
            <el-button :icon="Refresh" @click="resetLogFilter">重置</el-button>
          </div>

          <el-table
            v-loading="logsLoading"
            :data="operationLogs"
            border
            stripe
            style="width: 100%"
          >
            <el-table-column prop="createTime" label="时间" width="170" align="center">
              <template #default="{ row }">
                {{ formatTime(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="operation" label="操作类型" width="120" align="center">
              <template #default="{ row }">
                <div class="operation-cell">
                  <el-icon :color="getOperationColor(row.operation)" :size="16">
                    <component :is="getOperationIcon(row.operation)" />
                  </el-icon>
                  <span :style="{ color: getOperationColor(row.operation) }">
                    {{ getOperationLabel(row.operation) }}
                  </span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="operatorName" label="操作人" width="120" align="center" />
            <el-table-column prop="semver" label="版本" width="120" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.semver" size="small" round>v{{ row.semver }}</el-tag>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
            <el-table-column prop="status" label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small" round>
                  {{ row.status === 1 ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="耗时" width="100" align="center">
              <template #default="{ row }">
                {{ row.duration ? `${row.duration}ms` : '-' }}
              </template>
            </el-table-column>
            <el-table-column prop="ip" label="IP" width="140" align="center" />
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="logPagination.page"
              v-model:page-size="logPagination.pageSize"
              :total="logPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @size-change="fetchLogs"
              @current-change="fetchLogs"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 回滚确认弹窗 -->
    <el-dialog
      v-model="rollbackDialogVisible"
      title="版本回滚确认"
      width="520px"
      destroy-on-close
      :close-on-click-modal="false"
    >
      <el-alert
        type="warning"
        :closable="false"
        show-icon
        style="margin-bottom: 20px"
      >
        <template #title>
          <strong>回滚操作将改变小程序的线上版本</strong>
        </template>
        回滚后，当前线上版本将被替换为目标版本的内容，请确认操作。
      </el-alert>

      <el-descriptions :column="1" border size="small" style="margin-bottom: 20px">
        <el-descriptions-item label="当前版本">
          <el-tag v-if="latestRelease" type="success" effect="dark" round>
            v{{ latestRelease.semver }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="目标版本">
          <el-tag
            v-if="rollbackTarget"
            :color="getChangeTypeColor(rollbackTarget.changeType)"
            effect="dark"
            round
          >
            v{{ rollbackTarget.semver }}
          </el-tag>
        </el-descriptions-item>
      </el-descriptions>

      <el-form ref="rollbackFormRef" :model="rollbackForm" :rules="rollbackRules" label-width="80px">
        <el-form-item label="回滚原因" prop="reason">
          <el-input
            v-model="rollbackForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请说明回滚原因..."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="rollbackDialogVisible = false">取消</el-button>
        <el-button type="danger" :loading="rollbackLoading" @click="handleRollback">
          确认回滚
        </el-button>
      </template>
    </el-dialog>

    <!-- 快照查看弹窗 -->
    <el-dialog
      v-model="snapshotDialogVisible"
      :title="snapshotTitle"
      width="700px"
      destroy-on-close
    >
      <el-input
        :model-value="snapshotContent"
        type="textarea"
        :rows="20"
        readonly
        style="font-family: monospace"
      />
      <template #footer>
        <el-button @click="snapshotDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleCopySnapshot">复制</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Refresh,
  Document,
  CircleCheck,
  Flag,
  User,
  ArrowDown,
  RefreshLeft,
  View,
  Search,
  CirclePlus,
  SwitchButton,
  InfoFilled,
} from '@element-plus/icons-vue'
import {
  getReleaseList,
  getLatestRelease,
  rollbackRelease,
  getVersionOperationLogs,
} from '@/api/version'
import type { ReleaseRecord, VersionOperationLog } from '@/types/page'

/** ====== 状态 ====== */

const activeTab = ref('records')
const recordsLoading = ref(false)
const logsLoading = ref(false)
const rollbackLoading = ref(false)

const releaseList = ref<ReleaseRecord[]>([])
const latestRelease = ref<ReleaseRecord | null>(null)
const operationLogs = ref<VersionOperationLog[]>([])
const expandedId = ref<number | null>(null)

/** 统计数据 */
const stats = computed(() => ({
  total: releaseList.value.length,
  published: releaseList.value.filter(r => r.status === 1).length,
  current: latestRelease.value ? `v${latestRelease.value.semver}` : '-',
}))

/** 回滚 */
const rollbackDialogVisible = ref(false)
const rollbackFormRef = ref<FormInstance>()
const rollbackTarget = ref<ReleaseRecord | null>(null)
const rollbackForm = reactive({
  reason: '',
})
const rollbackRules: FormRules = {
  reason: [{ required: true, message: '请输入回滚原因', trigger: 'blur' }],
}

/** 快照查看 */
const snapshotDialogVisible = ref(false)
const snapshotContent = ref('')
const snapshotTitle = ref('')

/** 日志筛选 */
const logFilter = reactive({
  operation: '',
  timeRange: null as string[] | null,
})
const logPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

/** ====== 方法 ====== */

/** 获取版本列表 */
async function fetchReleaseList() {
  recordsLoading.value = true
  try {
    const res = await getReleaseList()
    const data = res.data
    if (Array.isArray(data)) {
      releaseList.value = data
    } else if (data && typeof data === 'object') {
      releaseList.value = (data as any).records || (data as any).list || (data as any).items || []
    }
  } catch {
    releaseList.value = []
  } finally {
    recordsLoading.value = false
  }
}

/** 获取最新版本 */
async function fetchLatestRelease() {
  try {
    const res = await getLatestRelease()
    latestRelease.value = res.data || null
  } catch {
    latestRelease.value = null
  }
}

/** 获取操作日志 */
async function fetchLogs() {
  logsLoading.value = true
  try {
    const params: Record<string, any> = {
      page: logPagination.page,
      pageSize: logPagination.pageSize,
    }
    if (logFilter.operation) params.operation = logFilter.operation
    if (logFilter.timeRange && logFilter.timeRange.length === 2) {
      params.startTime = logFilter.timeRange[0]
      params.endTime = logFilter.timeRange[1]
    }
    const res = await getVersionOperationLogs(params)
    const data = res.data
    if (Array.isArray(data)) {
      operationLogs.value = data
      logPagination.total = data.length
    } else if (data && typeof data === 'object') {
      operationLogs.value = (data as any).records || (data as any).list || (data as any).items || []
      logPagination.total = (data as any).total || operationLogs.value.length
    }
  } catch {
    operationLogs.value = []
  } finally {
    logsLoading.value = false
  }
}

/** 刷新所有数据 */
function fetchData() {
  fetchReleaseList()
  fetchLatestRelease()
  if (activeTab.value === 'logs') fetchLogs()
}

/** 展开/收起版本详情 */
function toggleExpand(id: number) {
  expandedId.value = expandedId.value === id ? null : id
}

/** 打开回滚弹窗 */
function openRollbackDialog(item: ReleaseRecord) {
  rollbackTarget.value = item
  rollbackForm.reason = ''
  rollbackDialogVisible.value = true
}

/** 执行回滚 */
async function handleRollback() {
  if (!rollbackFormRef.value || !rollbackTarget.value) return
  await rollbackFormRef.value.validate()
  rollbackLoading.value = true
  try {
    await rollbackRelease({
      targetSemver: rollbackTarget.value.semver,
      reason: rollbackForm.reason,
    })
    ElMessage.success('版本回滚成功')
    rollbackDialogVisible.value = false
    fetchData()
  } catch {
  } finally {
    rollbackLoading.value = false
  }
}

/** 查看快照 */
function handleViewSnapshot(item: ReleaseRecord) {
  snapshotTitle.value = `版本 v${item.semver} 快照`
  try {
    const snapshot = item.snapshot ? JSON.parse(item.snapshot) : null
    snapshotContent.value = snapshot ? JSON.stringify(snapshot, null, 2) : '暂无快照数据'
  } catch {
    snapshotContent.value = item.snapshot || '暂无快照数据'
  }
  snapshotDialogVisible.value = true
}

/** 复制快照 */
function handleCopySnapshot() {
  navigator.clipboard.writeText(snapshotContent.value).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败')
  })
}

/** 重置日志筛选 */
function resetLogFilter() {
  logFilter.operation = ''
  logFilter.timeRange = null
  logPagination.page = 1
  fetchLogs()
}

/** ====== 工具函数 ====== */

function formatTime(time?: string) {
  if (!time) return '-'
  return time.replace('T', ' ').substring(0, 19)
}

function truncateNotes(notes: string, max = 80) {
  return notes.length > max ? notes.substring(0, max) + '...' : notes
}

function getChangeTypeColor(type: string) {
  const map: Record<string, string> = { major: '#e11d48', minor: '#1769ff', patch: '#0faa6e' }
  return map[type] || '#909399'
}

function getChangeTypeLabel(type: string) {
  const map: Record<string, string> = { major: '主版本', minor: '次版本', patch: '修订版' }
  return map[type] || type
}

function getStatusTagType(status: number) {
  const map: Record<number, string> = { 0: 'info', 1: 'success', 2: 'warning' }
  return map[status] || 'info'
}

function getStatusLabel(status: number) {
  const map: Record<number, string> = { 0: '模板', 1: '已发布', 2: '已替换' }
  return map[status] || '未知'
}

function getTimelineColor(item: ReleaseRecord) {
  if (item.status === 1) return '#0faa6e'
  if (item.status === 2) return '#e6a23c'
  return '#909399'
}

function getOperationColor(operation: string) {
  const map: Record<string, string> = { create: '#1769ff', publish: '#0faa6e', rollback: '#e11d48' }
  return map[operation] || '#909399'
}

function getOperationIcon(operation: string) {
  const map: Record<string, any> = { create: CirclePlus, publish: Flag, rollback: SwitchButton }
  return map[operation] || Document
}

function getOperationLabel(operation: string) {
  const map: Record<string, string> = { create: '创建', publish: '发布', rollback: '回滚' }
  return map[operation] || operation
}

onMounted(() => {
  fetchData()
})
</script>

<style lang="scss" scoped>
.version-management {
  padding: 20px;
}

.info-banner {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 14px 18px; background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 10px; margin-bottom: 20px; font-size: 13px; color: #3b82f6;
  line-height: 1.6;

  .el-icon { margin-top: 2px; flex-shrink: 0; color: #2563eb; }
}

.empty-hint {
  font-size: 13px; color: #86909c; margin-bottom: 16px; line-height: 1.5; max-width: 320px;
}

.page-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-title {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #1d2129;
  }
}

.main-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 20px;
  }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: grid; place-items: center; color: #fff; flex-shrink: 0;
}

.stat-info {
  .stat-value { font-size: 24px; font-weight: 700; color: #1d2129; line-height: 1.2; }
  .stat-label { font-size: 13px; color: #86909c; margin-top: 4px; }
}

.timeline-card {
  :deep(.el-card__body) {
    padding: 24px;
  }
}

.timeline-wrapper { min-height: 200px; }

.version-node {
  background: #fafbfc; border-radius: 10px; padding: 16px;
  transition: all 0.2s ease;
  &:hover { background: #f2f3f5; }
  &.is-expanded { background: #f2f3f5; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
}

.version-header {
  display: flex; justify-content: space-between; align-items: center; cursor: pointer;
  .version-header-left { display: flex; align-items: center; gap: 8px; }
  .version-header-right { display: flex; align-items: center; gap: 12px; color: #86909c; }
}

.semver-tag { font-weight: 600; font-size: 14px; border: none; }
.change-type-label { font-size: 12px; font-weight: 500; }
.publisher { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.expand-icon { transition: transform 0.2s ease; &.is-rotated { transform: rotate(180deg); } }
.version-notes-preview { margin-top: 8px; font-size: 13px; color: #86909c; line-height: 1.5; }

.version-detail {
  margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e6eb;
}
.version-actions { margin-top: 16px; display: flex; gap: 8px; }

.expand-enter-active, .expand-leave-active {
  transition: all 0.25s ease; overflow: hidden;
}
.expand-enter-from, .expand-leave-to { opacity: 0; max-height: 0; margin-top: 0; padding-top: 0; }
.expand-enter-to, .expand-leave-from { opacity: 1; max-height: 500px; }

.log-filters {
  display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;
}
.operation-cell {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; font-size: 13px; font-weight: 500;
}
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 16px; }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: 1fr; }
  .page-toolbar { flex-direction: column; align-items: flex-start; gap: 12px; }
  .version-header { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>
