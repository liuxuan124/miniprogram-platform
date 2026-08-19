<template>
  <div class="release-page">
    <PageHeader
      kicker="小程序 / 发布"
      title="发布到小程序"
      description="会保存当前已写入的导航配置，并把已绑定页面的最新草稿设为线上内容。这不会把代码上传到微信。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/start')">导航与外观</el-button>
        <el-button @click="loadAll">刷新检查</el-button>
        <el-button
          type="primary"
          :loading="publishing"
          :disabled="!preflight?.canPublish"
          @click="handlePublish"
        >
          发布到小程序
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      class="hint"
      type="info"
      show-icon
      :closable="false"
      title="微信里打开的「跨境墨太白」就是下面这些装修页。改完点「进入装修」，再回到这里「发布到小程序」。这不会把代码上传到微信。"
    />

    <section class="live-bar">
      <div>
        <div class="live-label">当前线上版本</div>
        <div class="live-value">{{ preflight?.latestSemver || latestRelease?.semver || '尚未发布过' }}</div>
        <div v-if="latestRelease" class="live-meta">
          {{ latestRelease.pageCount || 0 }} 个页面 · {{ formatTime(latestRelease.publishedAt || latestRelease.createTime) }}
        </div>
      </div>
      <el-button v-if="latestRelease" type="primary" @click="openPreview(latestRelease)">预览当前版本</el-button>
    </section>

    <section v-loading="loading" class="card">
      <h2>微信线上页面</h2>
      <p class="muted section-desc">对应小程序底部导航绑定的页面，可直接进入装修器修改。</p>
      <div v-if="preflight?.blocking?.length" class="issue-list blocking">
        <div v-for="item in preflight.blocking" :key="item" class="issue">{{ item }}</div>
      </div>
      <div v-if="preflight?.warnings?.length" class="issue-list warning">
        <div v-for="item in preflight.warnings" :key="item" class="issue">{{ item }}</div>
      </div>
      <el-empty v-if="!loading && !preflight?.pages?.length" description="还没有绑定可发布的页面" />
      <el-table v-else :data="preflight?.pages || []" size="small">
        <el-table-column prop="name" label="页面" min-width="140" />
        <el-table-column prop="path" label="路径" min-width="160" />
        <el-table-column label="本次动作" width="160">
          <template #default="{ row }">{{ actionLabel(row.action) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.id && row.action !== 'builtin'"
              link
              type="primary"
              @click="openEditor(row)"
            >
              进入装修
            </el-button>
            <span v-else class="muted">系统内置</span>
          </template>
        </el-table-column>
      </el-table>
      <el-input
        v-model="releaseNotes"
        class="notes"
        type="textarea"
        :rows="3"
        maxlength="200"
        show-word-limit
        placeholder="发布说明（可选）"
      />
    </section>

    <section class="card">
      <div class="card-head">
        <h2>发布记录</h2>
        <span class="muted">点「预览」看该版本当时的页面快照。回滚会把当时的页面和导航恢复为线上。</span>
      </div>
      <el-table v-loading="historyLoading" :data="history" size="small">
        <el-table-column label="版本" width="140">
          <template #default="{ row }">v{{ row.semver }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">当前线上</el-tag>
            <el-tag v-else-if="row.status === 2" type="info" size="small">已替换</el-tag>
            <el-tag v-else size="small">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pageCount" label="页面数" width="90" />
        <el-table-column label="时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.publishedAt || row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="releaseNotes" label="说明" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPreview(row)">预览</el-button>
            <el-button
              v-if="row.status === 2"
              link
              type="warning"
              @click="handleRollback(row)"
            >
              回滚到此版本
            </el-button>
            <el-button
              v-if="row.status === 1"
              link
              type="primary"
              :loading="pushing"
              @click="handlePushPreview(row)"
            >
              推送到微信
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

function actionLabel(action: string) {
  if (action === 'publish') return '将发布最新草稿'
  if (action === 'already_live') return '已与线上一致'
  if (action === 'empty') return '画布为空，无法发布'
  if (action === 'builtin') return '内置页，跳过'
  return action || '—'
}

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
    const [listRes, latestRes] = await Promise.all([
      getAllReleases(),
      getLatestRelease().catch(() => null),
    ])
    const list = Array.isArray(listRes.data) ? listRes.data : []
    history.value = list.filter((item: ReleaseRecord) => item.status === 1 || item.status === 2)
    latestRelease.value = (latestRes as any)?.data || list.find((item: ReleaseRecord) => item.status === 1) || null
  } catch {
    history.value = []
  } finally {
    historyLoading.value = false
  }
}

function loadAll() {
  loadPreflight()
  loadHistory()
}

function openPreview(row: ReleaseRecord) {
  if (!row?.id) {
    ElMessage.warning('该版本无法预览')
    return
  }
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

function openEditor(row: { id?: number | string; action?: string }) {
  if (!row?.id || row.action === 'builtin') return
  router.push(`/page-builder/editor/${row.id}`)
}

async function handlePublish() {
  if (!preflight.value?.canPublish) return
  try {
    await ElMessageBox.confirm(
      '将把已绑定页面的最新草稿设为线上内容，并生成一版整包记录。不会上传代码到微信。',
      '发布到小程序',
      { type: 'warning', confirmButtonText: '确认发布', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  publishing.value = true
  try {
    const res = await createRelease({
      mode: 'publish',
      releaseNotes: releaseNotes.value || '整包发布：导航配置 + 绑定页面最新草稿',
    })
    const semver = (res as any)?.data?.semver || preflight.value.latestSemver
    ElMessage.success(semver ? `已发布 ${semver}。用户打开小程序即可看到绑定页最新内容。` : '已发布到小程序')
    releaseNotes.value = ''
    await loadAll()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

async function handleRollback(row: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(
      `确认把线上内容回滚到 v${row.semver}？当前线上会被替换。`,
      '回滚整包',
      { type: 'warning', confirmButtonText: '确认回滚', cancelButtonText: '取消' },
    )
    await rollbackRelease({
      targetSemver: row.semver,
      reason: `回滚到 ${row.semver}`,
    })
    ElMessage.success(`已回滚到 ${row.semver}`)
    await loadAll()
  } catch (err: any) {
    if (err !== 'cancel') ElMessage.error(err?.response?.data?.message || '回滚失败')
  }
}

async function handlePushPreview(row: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(
      '这会尝试把小程序代码上传到微信体验版，需要已配置上传密钥。日常改页面内容不必走这一步。',
      '推送到微信',
      { type: 'info', confirmButtonText: '继续推送', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  pushing.value = true
  try {
    const res = await pushPreviewRelease(row.id, {
      versionDesc: row.releaseNotes || `后台推送体验版 v${row.semver}`,
    })
    const message = (res as any)?.data?.message || (res as any)?.message
    ElMessage.success(message || '已提交微信推送')
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '推送失败')
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

.hint {
  margin-bottom: 16px;
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
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.live-label {
  color: var(--text-muted);
  font-size: 12px;
}

.live-value {
  margin-top: 4px;
  font-size: 22px;
  font-weight: 600;
}

.live-meta {
  margin-top: 8px;
  color: var(--text-muted);
}

.card h2 {
  margin: 0 0 12px;
  font-size: 16px;
}

.card-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 12px;
}

.card-head h2 {
  margin: 0;
}

.muted {
  color: var(--text-muted);
  font-size: 13px;
}

.section-desc {
  margin: -4px 0 12px;
}

.issue-list {
  margin-bottom: 12px;
}

.issue {
  padding: 8px 10px;
  border-radius: 6px;
  margin-bottom: 6px;
}

.blocking .issue {
  background: #fef2f2;
  color: #b91c1c;
}

.warning .issue {
  background: #fffbeb;
  color: #92400e;
}

.notes {
  margin-top: 16px;
}
</style>
