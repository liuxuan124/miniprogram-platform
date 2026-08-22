<template>
  <div class="release-page">
    <PageHeader
      kicker="小程序 / 版本"
      title="还原点"
      description="为大改版存一个可回滚的存档。日常改页面内容：装修器点「上线」即可，不必每次来这里。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/overview')">总览</el-button>
        <el-button @click="loadAll">刷新</el-button>
        <el-button
          type="primary"
          :loading="publishing"
          :disabled="!preflight?.canPublish"
          @click="handlePublish"
        >
          保存还原点
        </el-button>
      </template>
    </PageHeader>

    <section class="live-bar">
      <div>
        <div class="live-label">当前还原点</div>
        <div class="live-value">{{ preflight?.latestSemver || latestRelease?.semver || '尚未创建' }}</div>
        <div v-if="latestRelease" class="live-meta">
          {{ latestRelease.pageCount || 0 }} 个页面 · {{ formatTime(latestRelease.publishedAt || latestRelease.createTime) }}
        </div>
      </div>
      <div class="live-actions">
        <el-input
          v-model="releaseNotes"
          class="notes-inline"
          maxlength="200"
          show-word-limit
          placeholder="备注说明（可选）"
        />
        <el-button @click="openLivePreview">预览当前配置</el-button>
      </div>
    </section>

    <div v-if="preflight?.blocking?.length" class="issue-list blocking">
      <div v-for="item in preflight.blocking" :key="item" class="issue">{{ item }}</div>
    </div>
    <div v-if="preflight?.warnings?.length" class="issue-list warning">
      <div v-for="item in preflight.warnings" :key="item" class="issue">{{ item }}</div>
    </div>

    <div v-if="pushStatus" class="issue-list warning" style="margin-top: 12px">
      <div class="issue">
        体验版推送：{{ pushStatus.message || '—' }}
        <template v-if="pushStatus.uploadAvailable === false">
          · 本机上传不可用（{{ pushStatus.capabilityReason || '缺源码/脚本/密钥' }}），请用 GitHub Actions「push-miniprogram-preview」
        </template>
        <template v-else-if="pushStatus.preferCi">
          · 推荐改走 CI，避免生产机持有上传私钥
        </template>
      </div>
    </div>

    <section class="card">
      <div class="card-head">
        <h2>还原点记录</h2>
        <span class="muted">预览看快照；回滚会恢复当时的页面与导航。上传代码到微信仅在需要发版时使用。</span>
      </div>
      <el-table v-loading="historyLoading" :data="history" size="small">
        <el-table-column label="版本" width="140">
          <template #default="{ row }">v{{ row.semver }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">当前</el-tag>
            <el-tag v-else-if="row.status === 2" type="info" size="small">已替换</el-tag>
            <el-tag v-else size="small">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pageCount" label="页面数" width="90" />
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.publishedAt || row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="releaseNotes" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="300" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPreview(row)">预览</el-button>
            <el-button
              v-if="row.status === 2"
              link
              type="warning"
              @click="handleRollback(row)"
            >
              回滚
            </el-button>
            <el-button
              v-if="row.status === 1"
              link
              type="primary"
              :loading="pushing"
              :disabled="pushStatus?.uploadAvailable === false"
              :title="pushStatus?.uploadAvailable === false ? (pushStatus.capabilityReason || '请用 CI 推送') : ''"
              @click="handlePushPreview(row)"
            >
              上传代码到微信
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import {
  getPublishPreflight,
  createRelease,
  getAllReleases,
  getLatestRelease,
  rollbackRelease,
  pushPreviewRelease,
  getPushPreviewStatus,
  type PublishPreflight,
} from '@/api/version'
import type { ReleaseRecord } from '@/types/page'

const router = useRouter()
const loading = ref(false)
const publishing = ref(false)
const historyLoading = ref(false)
const pushing = ref(false)
const preflight = ref<PublishPreflight | null>(null)
const latestRelease = ref<ReleaseRecord | null>(null)
const history = ref<ReleaseRecord[]>([])
const releaseNotes = ref('')
const pushStatus = ref<{
  message?: string
  uploadAvailable?: boolean
  preferCi?: boolean
  capabilityReason?: string
} | null>(null)

function formatTime(value?: string) {
  if (!value) return '—'
  return String(value).replace('T', ' ').slice(0, 19)
}

async function loadPreflight() {
  loading.value = true
  try {
    const res = await getPublishPreflight()
    preflight.value = res.data || null
  } catch {
    preflight.value = null
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  try {
    const res = await getAllReleases()
    history.value = ((res as any)?.data || []) as ReleaseRecord[]
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

async function loadLatest() {
  try {
    const res = await getLatestRelease()
    latestRelease.value = (res as any)?.data || null
  } catch {
    latestRelease.value = null
  }
}

async function loadPushStatus() {
  try {
    const res = await getPushPreviewStatus()
    pushStatus.value = (res as any)?.data || null
  } catch {
    pushStatus.value = null
  }
}

async function loadAll() {
  await Promise.all([loadPreflight(), loadHistory(), loadLatest(), loadPushStatus()])
}

function openLivePreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

function openPreview(row: ReleaseRecord) {
  const { href } = router.resolve({
    path: '/h5/miniapp-preview',
    query: {
      view: 'config',
      releaseId: String(row.id),
      semver: row.semver || '',
    },
  })
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function handlePublish() {
  if (!preflight.value?.canPublish) return
  try {
    await ElMessageBox.confirm(
      '将把当前配置与已绑定页面存为一个可回滚的还原点。不会上传代码到微信。',
      '保存还原点',
      { type: 'warning', confirmButtonText: '确认保存', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  publishing.value = true
  try {
    const res = await createRelease({
      mode: 'publish',
      releaseNotes: releaseNotes.value || '保存还原点：导航配置 + 绑定页面最新草稿',
    })
    const semver = (res as any)?.data?.semver || preflight.value.latestSemver
    ElMessage.success(semver ? `已保存还原点 ${semver}` : '已保存还原点')
    releaseNotes.value = ''
    await loadAll()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '保存失败')
  } finally {
    publishing.value = false
  }
}

async function handleRollback(row: ReleaseRecord) {
  let offlineExtraPages = false
  try {
    await ElMessageBox.confirm(
      `确认回滚到 v${row.semver}？当前线上内容会被替换。\n若存在快照之后新建的已发布页面，可选择一并下线。`,
      '回滚还原点',
      {
        type: 'warning',
        distinguishCancelAndClose: true,
        confirmButtonText: '回滚并下线多余页面',
        cancelButtonText: '仅回滚',
      },
    )
    offlineExtraPages = true
  } catch (action) {
    if (action === 'close') return
    if (action !== 'cancel') {
      ElMessage.error((action as any)?.message || '回滚取消')
      return
    }
    offlineExtraPages = false
  }

  try {
    await rollbackRelease({
      targetSemver: row.semver,
      reason: `回滚到 ${row.semver}`,
      offlineExtraPages,
    })
    ElMessage.success(`已回滚到 ${row.semver}${offlineExtraPages ? '（已下线快照外页面）' : ''}`)
    await loadAll()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || '回滚失败')
  }
}

async function handlePushPreview(row: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(
      '这会上传小程序代码到微信体验版，需要已配置上传密钥。日常改页面内容不必走这一步。',
      '上传代码到微信',
      { type: 'info', confirmButtonText: '继续上传', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  pushing.value = true
  try {
    const res = await pushPreviewRelease(row.id, {
      versionDesc: row.releaseNotes || `后台上传体验版 v${row.semver}`,
    })
    const message = (res as any)?.data?.message || (res as any)?.message
    ElMessage.success(message || '已提交微信上传')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '上传失败')
  } finally {
    pushing.value = false
  }
}

onMounted(loadAll)
</script>

<style scoped lang="scss">
.release-page {
  padding-bottom: 24px;
}

.live-bar,
.card {
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.live-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.live-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex: 1;
  justify-content: flex-end;
  min-width: 280px;
}

.notes-inline {
  max-width: 320px;
  flex: 1;
}

.live-label {
  color: var(--text-muted);
  font-size: 12px;
}

.live-value {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 700;
}

.live-meta {
  margin-top: 4px;
  color: var(--text-muted);
  font-size: 12px;
}

.card-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;
}

.card-head h2 {
  margin: 0;
  font-size: 16px;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}

.issue-list {
  margin-bottom: 12px;
  padding: 10px 14px;
  border-radius: 8px;
}

.issue-list.blocking {
  background: #fef2f2;
  color: #b91c1c;
}

.issue-list.warning {
  background: #fffbeb;
  color: #92400e;
}

.issue + .issue {
  margin-top: 4px;
}
</style>
