<template>
  <div class="drafts-page">
    <PageHeader
      kicker="小程序 / 草稿"
      title="草稿"
      description="外观配置的草稿与历史快照。点「编辑」回到外观继续调整；确认无误后到「发布与版本」发布。"
    >
      <template #actions>
        <el-button type="success" plain @click="openFullMiniappPreview()">
          <el-icon><Cellphone /></el-icon> 小程序预览
        </el-button>
        <el-button type="primary" @click="handleNewBuild">
          <el-icon><Plus /></el-icon> 新建草稿
        </el-button>
        <el-button :loading="galleryLoading" @click="loadGalleryData">
          <el-icon><Refresh /></el-icon> 刷新
        </el-button>
      </template>
    </PageHeader>

    <div class="gallery-body">
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ templateCount }}</span>
            <span class="stat-label">草稿</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ latestPublished ? latestPublished.semver : '无' }}</span>
            <span class="stat-label">当前已发布</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-info">
            <span class="stat-value">{{ releases.length }}</span>
            <span class="stat-label">总版本数</span>
          </div>
        </div>
      </div>

      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab.value"
          class="filter-tab"
          :class="{ active: galleryFilter === tab.value }"
          @click="galleryFilter = tab.value"
        >{{ tab.label }}</button>
      </div>

      <div v-if="filteredReleases.length > 0" v-loading="galleryLoading" class="template-grid">
        <div
          v-for="item in filteredReleases"
          :key="item.id"
          class="template-card"
          :class="{
            'card-published': item.status === 1,
            'card-template': item.mode === 'template' || item.status === 0,
          }"
        >
          <div class="card-header">
            <div class="card-badges">
              <el-tag v-if="item.status === 1" type="success" size="small" effect="dark">
                已发布
                <span v-if="item.isCurrentPublished" class="current-live-badge">★ 当前线上</span>
              </el-tag>
              <el-tag v-else-if="item.mode === 'template' || item.status === 0" type="primary" size="small" effect="dark">草稿</el-tag>
              <el-tag v-else-if="item.status === 2" type="info" size="small" effect="dark">已替换</el-tag>
            </div>
            <span class="card-semver" :style="{ color: getChangeTypeColor(item.changeType) }">
              {{ item.semver }}
            </span>
          </div>

          <div class="card-notes">{{ item.releaseNotes || '暂无说明' }}</div>

          <div class="card-meta">
            <span><el-icon><Document /></el-icon> {{ item.pageCount }} 页面</span>
            <span>{{ formatTime(item.createTime) }}</span>
          </div>

          <div class="card-actions">
            <el-button size="small" type="primary" @click="handleEditTemplate(item)">编辑</el-button>
            <el-button
              v-if="item.status !== 1"
              size="small"
              type="danger"
              plain
              @click="handleDelete(item)"
            >
              删除
            </el-button>
            <el-button
              v-if="item.mode === 'template' || item.status === 0"
              size="small"
              type="success"
              plain
              @click="$router.push('/page-builder/release')"
            >
              去发布
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="small">更多</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openFullMiniappPreview(item)">小程序预览（本版本配置）</el-dropdown-item>
                  <el-dropdown-item @click="openH5Preview(item)">仅首页 H5</el-dropdown-item>
                  <el-dropdown-item @click="openPrototypeDemo">设计原型演示（22屏）</el-dropdown-item>
                  <el-dropdown-item :disabled="pushingReleaseId === item.id" @click="handlePushPreview(item)">
                    上传代码到微信
                  </el-dropdown-item>
                  <el-dropdown-item @click="copyFullPreviewLink(item)">复制预览链接</el-dropdown-item>
                  <el-dropdown-item v-if="item.status === 2" divided @click="handleRollback(item)">回滚到此版本</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>

      <div v-else class="empty-gallery">
        <el-empty :description="galleryLoading ? '加载中…' : '暂无草稿。可新建草稿，或在外观编辑器里保存当前配置。'">
          <el-button type="primary" @click="$router.push('/page-builder/list')">去创建页面</el-button>
          <el-button @click="handleNewBuild">
            <el-icon><Plus /></el-icon> 新建草稿
          </el-button>
        </el-empty>
      </div>
    </div>

    <!-- 上传代码到微信结果弹窗 -->
    <el-dialog v-model="pushPreviewVisible" title="推送微信小程序体验版" width="560px" :close-on-click-modal="false">
      <el-alert
        type="info"
        :closable="false"
        show-icon
        title="页面/配置变更会自动同步到小程序，无需推送。仅在 miniapp 代码变更或平台要求重新上传代码时使用。"
        style="margin-bottom: 16px"
      />
      <el-alert
        v-if="pushPreviewResult && isPushPreviewFailure(pushPreviewResult.message)"
        type="error"
        :closable="false"
        show-icon
        :title="pushPreviewResult.message"
        style="margin-bottom: 16px"
      />
      <el-descriptions v-if="pushPreviewResult" :column="1" border size="small">
        <el-descriptions-item label="版本号">{{ pushPreviewResult.version }}</el-descriptions-item>
        <el-descriptions-item label="描述">{{ pushPreviewResult.versionDesc }}</el-descriptions-item>
        <el-descriptions-item label="结果">{{ pushPreviewResult.message }}</el-descriptions-item>
      </el-descriptions>
      <div v-if="pushPreviewResult?.manageUrl" class="push-preview-footer">
        <el-link type="primary" :href="pushPreviewResult.manageUrl" target="_blank">前往微信公众平台查看体验版</el-link>
      </div>
      <template #footer>
        <el-button @click="pushPreviewVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Refresh, Document, Cellphone } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  getAllReleases,
  getLatestRelease,
  deleteRelease as deleteReleaseApi,
  rollbackRelease,
  pushPreviewRelease,
} from '@/api/version'
import type { ReleaseRecord } from '@/types/page'

const router = useRouter()
const galleryLoading = ref(false)
const releases = ref<ReleaseRecord[]>([])
const latestPublished = ref<ReleaseRecord | null>(null)
const galleryFilter = ref<'all' | 'published' | 'template'>('all')

const pushingReleaseId = ref<number | null>(null)
const pushPreviewVisible = ref(false)
const pushPreviewResult = ref<any>(null)

const filterTabs: { label: string; value: 'all' | 'published' | 'template' }[] = [
  { label: '全部', value: 'all' },
  { label: '已发布', value: 'published' },
  { label: '草稿', value: 'template' },
]

const templateCount = computed(() => releases.value.filter(r => r.status === 0 || r.mode === 'template').length)

const filteredReleases = computed(() => {
  if (galleryFilter.value === 'published') return releases.value.filter(r => r.status === 1)
  if (galleryFilter.value === 'template') return releases.value.filter(r => r.mode === 'template' || r.status === 0)
  return releases.value
})

// ==================== 数据加载 ====================
async function loadGalleryData() {
  galleryLoading.value = true
  try {
    const [allRes, latestRes] = await Promise.all([
      getAllReleases(),
      getLatestRelease().catch(() => null),
    ])
    const data = (allRes.data as any)?.data || allRes.data || []
    releases.value = Array.isArray(data) ? data : []
    if (latestRes) {
      const ld = (latestRes as any).data || latestRes
      latestPublished.value = ld ? { ...ld, isCurrentPublished: true } : null
    }
    releases.value.forEach((r: any) => {
      if (latestPublished.value && r.id === latestPublished.value.id) {
        r.isCurrentPublished = true
      }
    })
  } catch (err) {
    console.error('加载草稿数据失败:', err)
    ElMessage.error('加载草稿数据失败')
  } finally {
    galleryLoading.value = false
  }
}

// ==================== 编辑/新建 ====================
function handleNewBuild() {
  router.push({ path: '/page-builder/start', query: { new: '1' } })
}

function handleEditTemplate(item: ReleaseRecord) {
  router.push({ path: '/page-builder/start', query: { releaseId: String(item.id) } })
}

// ==================== 删除/回滚 ====================
async function handleDelete(item: ReleaseRecord) {
  try {
    await ElMessageBox.confirm('确认删除此配置？删除后不可恢复。', '删除确认', {
      type: 'warning',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消',
    })
    await deleteReleaseApi(item.id)
    ElMessage.success('已删除')
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('删除失败，请重试')
  }
}

async function handleRollback(item: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(`确认回滚到 ${item.semver}？`, '回滚确认', {
      type: 'warning',
      confirmButtonText: '确认回滚',
      cancelButtonText: '取消',
    })
    await rollbackRelease({ targetSemver: item.semver, reason: `回滚到 ${item.semver}` })
    ElMessage.success(`已回滚到 ${item.semver}`)
    await loadGalleryData()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('回滚失败，请重试')
  }
}

// ==================== 预览 ====================
function buildH5PreviewUrl(item: ReleaseRecord) {
  const { href } = router.resolve({
    path: '/h5/preview',
    query: {
      releaseId: String(item.id),
      semver: item.semver,
      path: 'pages/index/index',
      mode: item.mode === 'template' || item.status === 0 ? 'template' : 'release',
    },
  })
  return `${window.location.origin}${href}`
}

function buildFullPreviewUrl(item?: ReleaseRecord | null, view: 'prototype' | 'config' = 'config') {
  const query: Record<string, string> = { view }
  if (item?.id) {
    query.releaseId = String(item.id)
    if (item.semver) query.semver = item.semver
  } else {
    query.source = 'live'
  }
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  return `${window.location.origin}${href}`
}

function openH5Preview(item: ReleaseRecord) {
  window.open(buildH5PreviewUrl(item), '_blank', 'noopener,noreferrer')
}

/** 无参=当前已保存配置；传入 release=该版本快照 */
function openFullMiniappPreview(item?: ReleaseRecord) {
  window.open(buildFullPreviewUrl(item || null, 'config'), '_blank', 'noopener,noreferrer')
}

function openPrototypeDemo() {
  window.open('/prototype/chuhai-notes.html', '_blank', 'noopener,noreferrer')
}

async function copyFullPreviewLink(item: ReleaseRecord) {
  const url = buildFullPreviewUrl(item, 'config')
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('小程序预览链接已复制')
  } catch {
    ElMessage.info(url)
  }
}

// ==================== 上传代码到微信 ====================
async function handlePushPreview(item: ReleaseRecord) {
  const releaseId = Number(item.id)
  if (!Number.isFinite(releaseId) || releaseId <= 0) {
    ElMessage.warning('请先保存版本后再上传代码到微信')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认将版本 v${item.semver} 对应的代码包上传到微信体验版吗？\n\n这只会上传代码包，不会替你上线页面内容。`,
      '上传代码到微信',
      {
        confirmButtonText: '确认上传',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  pushingReleaseId.value = item.id
  pushPreviewResult.value = null
  const loadingMsg = ElMessage({
    message: '正在上传代码到微信，请稍候（约 10–60 秒）…',
    type: 'info',
    duration: 0,
    showClose: false,
  })
  try {
    const res = await pushPreviewRelease(releaseId, {
      versionDesc: item.releaseNotes || `后台上传体验版 v${item.semver}`,
      confirmCodeChange: true,
    })
    pushPreviewResult.value = (res as any).data || res
    pushPreviewVisible.value = true
    ElMessage.success('体验版推送成功，请到微信公众平台「版本管理 → 开发版本」查看')
  } catch (error: any) {
    const message = formatPushPreviewError(error)
    pushPreviewResult.value = { message, version: item.semver, manageUrl: 'https://mp.weixin.qq.com/' }
    pushPreviewVisible.value = true
    ElMessage.error(message)
  } finally {
    loadingMsg.close()
    pushingReleaseId.value = null
  }
}

function formatPushPreviewError(error: any): string {
  const apiMessage = String(error?.response?.data?.message || error?.message || '')
  const code = error?.response?.data?.code
  if (code === 5005 || apiMessage.includes('上传密钥')) {
    return '请先在「系统设置 → 基础配置」保存代码上传密钥，并确认提示「上传密钥已入库」'
  }
  if (apiMessage.includes('invalid ip') || apiMessage.includes('-10008')) {
    const ipMatch = apiMessage.match(/invalid ip:\s*([0-9.]+)/i)
    const ip = ipMatch?.[1] || '124.220.11.79'
    return `微信拒绝上传：服务器 IP ${ip} 未加入代码上传白名单。请到 mp.weixin.qq.com → 开发 → 开发设置 → IP白名单 添加后重试`
  }
  if (code === 400 || apiMessage.includes('参数格式错误')) {
    return '版本记录无效，请刷新页面后重试'
  }
  if (apiMessage.includes('signature fail') || apiMessage.includes('DECODER')) {
    return '代码上传密钥格式有误，请从微信公众平台重新下载并完整粘贴后保存'
  }
  return apiMessage || '体验版推送失败，请稍后重试'
}

function isPushPreviewFailure(message?: string) {
  if (!message) return false
  return !message.includes('成功') && !message.includes('最近一次体验版推送版本')
}

// ==================== 展示辅助 ====================
function formatTime(t: string | Date | null | undefined): string {
  if (!t) return '-'
  const d = typeof t === 'string' ? new Date(t) : t
  if (isNaN(d.getTime())) return '-'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function getChangeTypeColor(type: string): string {
  const map: Record<string, string> = { major: 'var(--danger)', minor: 'var(--warning)', patch: 'var(--success)' }
  return map[type] || 'var(--text-muted)'
}

onMounted(() => {
  loadGalleryData()
})
</script>

<style lang="scss" scoped>
.drafts-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--bg-page);
}

.gallery-body {
  flex: 1;
  padding: 4px 24px 24px;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 22px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition: 0.16s;

  &:hover {
    box-shadow: var(--shadow-sm);
    border-color: var(--brand);
  }

  .stat-info {
    display: flex;
    flex-direction: column;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 800;
    color: var(--text);
    line-height: 1.2;
  }

  .stat-label {
    font-size: 13px;
    color: var(--text-muted);
    margin-top: 2px;
  }
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.filter-tab {
  padding: 7px 20px;
  border: 1px solid var(--border);
  border-radius: 99px;
  background: var(--bg-elevated);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: 0.15s;

  &:hover {
    border-color: var(--brand);
    color: var(--brand);
  }

  &.active {
    background: var(--brand);
    color: #fff;
    border-color: var(--brand);
  }
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .template-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }
}

.template-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: 0.18s;
  position: relative;
  overflow: hidden;

  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--brand);
  }

  &.card-published {
    border-left: 3px solid var(--success);
  }

  &.card-template {
    border-left: 3px solid var(--brand);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.current-live-badge {
  margin-left: 4px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.card-semver {
  font-size: 18px;
  font-weight: 800;
  white-space: nowrap;
}

.card-notes {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 38px;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--text-muted);
  gap: 8px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.card-actions {
  display: flex;
  gap: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border);
  flex-wrap: wrap;
}

.push-preview-footer {
  margin-top: 12px;
}

.empty-gallery {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 360px;
}
</style>
