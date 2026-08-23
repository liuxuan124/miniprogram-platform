<template>
  <div class="release-page">
    <PageHeader
      kicker="小程序 / 发布"
      title="发布与版本"
      description="这里管理小程序的版本存档与代码上传。日常改页面内容不用来这里。"
    >
      <template #actions>
        <el-button @click="router.push('/page-builder/overview')">返回总览</el-button>
        <el-button @click="loadAll">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 三步导航：先回答「我该点哪个」 -->
    <section class="guide">
      <div class="guide-title">你想做什么？</div>
      <div class="guide-grid">
        <div class="guide-card">
          <div class="guide-num">1</div>
          <div class="guide-body">
            <div class="guide-head">改了页面内容</div>
            <p>换图、加商品、改文案。在装修器点「上线」即可，<b>用户刷新小程序立刻看到</b>，不用来这一页。</p>
            <el-button size="small" @click="router.push('/page-builder/list')">去页面列表</el-button>
          </div>
        </div>
        <div class="guide-card guide-card--active">
          <div class="guide-num">2</div>
          <div class="guide-body">
            <div class="guide-head">存一个可回退的版本</div>
            <p>大改版之前存个档。万一改坏了，可以一键退回到这个版本。<b>就是本页下方的操作。</b></p>
            <el-button size="small" type="primary" plain @click="scrollToSave">去保存版本</el-button>
          </div>
        </div>
        <div class="guide-card">
          <div class="guide-num">3</div>
          <div class="guide-body">
            <div class="guide-head">小程序代码变了</div>
            <p>技术同事更新了小程序端功能时才需要。上传后<b>还要去微信公众平台提交审核</b>，审核通过才对用户生效。</p>
            <el-button size="small" @click="scrollToHistory">去版本记录</el-button>
          </div>
        </div>
      </div>
    </section>

    <!-- 主操作区：备注与按钮放在一起 -->
    <section id="save-block" class="save-block" v-loading="loading">
      <div class="save-current">
        <div class="save-label">当前版本</div>
        <div class="save-value">{{ currentSemver }}</div>
        <div v-if="latestRelease" class="save-meta">
          包含 {{ latestRelease.pageCount || 0 }} 个页面 · 保存于 {{ formatTime(latestRelease.publishedAt || latestRelease.createTime) }}
        </div>
        <div v-else class="save-meta">还没有保存过版本</div>
      </div>

      <div class="save-form">
        <label class="save-form-label" for="release-notes">这次改了什么？（选填，方便以后回看）</label>
        <el-input
          id="release-notes"
          v-model="releaseNotes"
          maxlength="200"
          show-word-limit
          placeholder="例如：新增 6 篇跨境内容，首页换了轮播图"
        />
        <div class="save-actions">
          <el-button
            type="primary"
            size="large"
            :loading="publishing"
            :disabled="!canPublish"
            @click="handlePublish"
          >
            保存当前版本
          </el-button>
          <el-button @click="openLivePreview">先预览一下</el-button>
          <span class="save-hint">版本号由系统自动生成（如 v1.2.0），不需要填写</span>
        </div>
      </div>
    </section>

    <!-- 按钮被禁用时，把原因说清楚并给出直达入口 -->
    <section v-if="!canPublish && blockingItems.length" class="issue-card blocking">
      <div class="issue-head">
        <span class="issue-badge">按钮为什么点不了</span>
        还有 {{ blockingItems.length }} 项需要先处理，处理完这里会自动变绿
      </div>
      <div v-for="item in blockingItems" :key="item.text" class="issue-row">
        <span class="issue-text">{{ item.text }}</span>
        <el-button v-if="item.to" size="small" @click="router.push(item.to)">{{ item.action }}</el-button>
      </div>
    </section>

    <section v-if="warningItems.length" class="issue-card warning">
      <div class="issue-head">
        <span class="issue-badge warn">提醒</span>
        不影响保存，但建议看一眼
      </div>
      <div v-for="text in warningItems" :key="text" class="issue-row">
        <span class="issue-text">{{ text }}</span>
      </div>
    </section>

    <section v-if="canPublish" class="issue-card ready">
      <div class="issue-head">
        <span class="issue-badge ok">检查通过</span>
        当前配置可以保存为新版本
      </div>
    </section>

    <section v-if="pushStatus?.message" class="issue-card" :class="pushStatus.uploadAvailable === false ? 'warning' : 'info'">
      <div class="issue-row">
        <span class="issue-text">
          上次上传代码到微信：{{ pushStatus.message }}
          <template v-if="pushStatus.uploadAvailable === false">
            　（当前服务器不能直接上传，需要技术同事用 GitHub Actions 推送）
          </template>
        </span>
      </div>
    </section>

    <section id="history-block" class="card">
      <div class="card-head">
        <h2>版本记录</h2>
        <span class="muted">
          「预览」看当时的样子；「回退到这个版本」会把线上页面和导航恢复成当时的状态；
          「上传代码到微信」只在小程序代码有更新时才用。
        </span>
      </div>
      <el-table v-loading="historyLoading" :data="history" size="small">
        <el-table-column label="版本" width="140">
          <template #default="{ row }">v{{ row.semver }}</template>
        </el-table-column>
        <el-table-column label="状态" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.status === 1" type="success" size="small">线上使用中</el-tag>
            <el-tag v-else-if="row.status === 2" type="info" size="small">历史版本</el-tag>
            <el-tag v-else size="small">草稿</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="pageCount" label="页面数" width="90" />
        <el-table-column label="保存时间" min-width="160">
          <template #default="{ row }">{{ formatTime(row.publishedAt || row.createTime) }}</template>
        </el-table-column>
        <el-table-column prop="releaseNotes" label="这次改了什么" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openPreview(row)">预览</el-button>
            <el-button
              v-if="row.status === 2"
              link
              type="warning"
              @click="handleRollback(row)"
            >
              回退到这个版本
            </el-button>
            <el-tooltip
              v-if="row.status === 1"
              :disabled="pushStatus?.uploadAvailable !== false"
              content="当前服务器未配置上传密钥，请联系技术同事处理"
              placement="top"
            >
              <span>
                <el-button
                  link
                  type="primary"
                  :loading="pushing"
                  :disabled="pushStatus?.uploadAvailable === false"
                  @click="handlePushPreview(row)"
                >
                  上传代码到微信
                </el-button>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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

const canPublish = computed(() => Boolean(preflight.value?.canPublish))
const currentSemver = computed(() => {
  const v = preflight.value?.latestSemver || latestRelease.value?.semver
  return v ? `v${String(v).replace(/^v/, '')}` : '尚未保存过版本'
})
const warningItems = computed(() => preflight.value?.warnings || [])

/** 把后端的阻断文案翻译成「问题 + 去哪处理」 */
const blockingItems = computed(() => {
  const list = preflight.value?.blocking || []
  return list.map((text) => {
    if (text.includes('首页') || text.includes('导航') || text.includes('外观')) {
      return { text, to: '/page-builder/start', action: '去外观设置' }
    }
    if (text.includes('装修') || text.includes('页面') || text.includes('内容')) {
      return { text, to: '/page-builder/list', action: '去页面列表' }
    }
    return { text, to: '', action: '' }
  })
})

function scrollToSave() {
  document.getElementById('save-block')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function scrollToHistory() {
  document.getElementById('history-block')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  if (!canPublish.value) return
  try {
    await ElMessageBox.confirm(
      '会把当前的导航配置和所有已上线页面存成一个版本，方便以后回退。\n这一步不会上传代码到微信，也不影响用户现在看到的内容。',
      '保存当前版本',
      { type: 'info', confirmButtonText: '确认保存', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }
  publishing.value = true
  try {
    const res = await createRelease({
      mode: 'publish',
      releaseNotes: releaseNotes.value || '保存版本：导航配置 + 已上线页面',
    })
    const semver = (res as any)?.data?.semver || preflight.value?.latestSemver
    ElMessage.success(semver ? `已保存为版本 v${String(semver).replace(/^v/, '')}` : '已保存当前版本')
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
    const action = await ElMessageBox.confirm(
      `会把线上的页面和导航恢复成 v${row.semver} 当时的样子，用户刷新后即可看到。\n如果这个版本之后新建过页面，可以选择把它们一并下线。`,
      `回退到 v${row.semver}`,
      {
        type: 'warning',
        distinguishCancelAndClose: true,
        confirmButtonText: '回退并下线新增页面',
        cancelButtonText: '只回退，保留新增页面',
      },
    )
    offlineExtraPages = action === 'confirm'
  } catch (action: any) {
    if (action === 'cancel') {
      offlineExtraPages = false
    } else {
      ElMessage.info('已取消回退')
      return
    }
  }
  try {
    await rollbackRelease({
      targetSemver: row.semver,
      reason: `回退到 ${row.semver}`,
      offlineExtraPages,
    })
    ElMessage.success(`已回退到 v${row.semver}${offlineExtraPages ? '（新增页面已下线）' : ''}`)
    await loadAll()
  } catch (err: any) {
    ElMessage.error(err?.response?.data?.message || err?.message || '回退失败')
  }
}

async function handlePushPreview(row: ReleaseRecord) {
  try {
    await ElMessageBox.confirm(
      '这一步是把「小程序代码」上传到微信的体验版，只有技术同事更新了小程序功能时才需要。\n日常改页面内容不用做这一步。',
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
    await ElMessageBox.alert(
      `${message || '代码已上传到微信体验版'}\n\n下一步：请登录微信公众平台（mp.weixin.qq.com）→ 版本管理 → 把体验版提交审核，审核通过后点「发布」，用户才会看到新版本。`,
      '上传完成',
      { confirmButtonText: '我知道了' },
    )
    await loadPushStatus()
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

.guide {
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.guide-title {
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 12px;
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.guide-card {
  display: flex;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
}

.guide-card--active {
  border-color: var(--brand, #1d4ed8);
  background: rgba(29, 78, 216, 0.04);
}

.guide-num {
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--brand, #1d4ed8);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.guide-head {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
}

.guide-body p {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}

.save-block {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 16px;
  padding: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}

.save-current {
  min-width: 200px;
}

.save-label {
  color: var(--text-muted);
  font-size: 12px;
}

.save-value {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 700;
}

.save-meta {
  margin-top: 6px;
  color: var(--text-muted);
  font-size: 12px;
}

.save-form {
  flex: 1;
  min-width: 320px;
}

.save-form-label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 600;
}

.save-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.save-hint {
  color: var(--text-muted);
  font-size: 12px;
}

.issue-card {
  margin-bottom: 16px;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid transparent;
}

.issue-card.blocking {
  background: #fef2f2;
  border-color: #fbcaca;
  color: #b91c1c;
}

.issue-card.warning {
  background: #fffbeb;
  border-color: #fde3a7;
  color: #92400e;
}

.issue-card.info {
  background: #f5f7fa;
  border-color: var(--border);
  color: var(--text-muted);
}

.issue-card.ready {
  background: #f0fdf9;
  border-color: #b7e4d5;
  color: #0f766e;
}

.issue-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  font-weight: 600;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.issue-badge {
  padding: 2px 9px;
  border-radius: 999px;
  background: #b91c1c;
  color: #fff;
  font-size: 12px;
}

.issue-badge.warn {
  background: #b45309;
}

.issue-badge.ok {
  background: #0f766e;
}

.issue-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  font-size: 13.5px;
}

.issue-text {
  flex: 1;
}

.card {
  margin-bottom: 16px;
  padding: 18px 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: var(--radius);
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
  line-height: 1.7;
}
</style>
