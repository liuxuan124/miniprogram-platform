<template>
  <div class="release-page builder-studio">
    <StudioHeader title="发布中心" section="发布" description="确认改动与生效范围，再选择单页更新、配置发布或代码上传。">
      <template #actions><el-button :loading="loading" @click="loadAll"><el-icon><Refresh /></el-icon>重新检查</el-button><el-button @click="openLivePreview"><el-icon><View /></el-icon>完整预览</el-button></template>
    </StudioHeader>
    <div v-if="releaseError" class="studio-feedback is-error" role="alert"><span>{{ releaseError }}</span><el-button size="small" @click="loadPreflight">重试检查</el-button></div>
    <section class="release-summary studio-surface">
      <div><span>待更新的绑定页面</span><strong>{{ preflight ? pendingPages.length : '—' }}</strong><small>更新页面后，小程序刷新生效</small></div>
      <div><span>最新配置版本</span><strong>{{ currentSemver }}</strong><small>版本号不代表微信审核状态</small></div>
      <div><span>代码上传</span><strong>{{ pushStatus?.version || pushStatus?.releaseSemver || '暂无版本记录' }}</strong><small>上传之后仍需提交审核与发布</small></div>
    </section>
    <el-tabs v-model="activeReleaseTab" class="release-workflow-tabs">
      <el-tab-pane label="页面更新" name="pages" /><el-tab-pane label="版本与回滚" name="versions" /><el-tab-pane label="代码上传" name="code" />
    </el-tabs>
    <section v-show="activeReleaseTab === 'pages'" class="studio-surface release-pages">
      <div class="studio-section-head"><div><h2>绑定页面检查</h2><p>进入编辑器，预览并确认后更新。未绑定的页面在页面设计中管理。</p></div><el-button link type="primary" @click="router.push('/page-builder/list')">全部页面</el-button></div>
      <el-table :data="preflight?.pages || []" v-loading="loading" empty-text="尚未读取到绑定页面" row-key="id">
        <el-table-column prop="name" label="页面" min-width="160" />
        <el-table-column label="状态" width="130"><template #default="{ row }"><span class="studio-state" :data-status="row.action === 'publish' ? 'dirty' : (row.action === 'empty' ? 'empty' : (row.action === 'builtin' ? 'builtin' : 'live'))">{{ row.action === 'publish' ? '待更新' : (row.action === 'empty' ? '暂无内容' : (row.action === 'builtin' ? '系统页面' : '已上线')) }}</span></template></el-table-column>
        <el-table-column prop="path" label="访问路径" min-width="220" show-overflow-tooltip />
        <el-table-column label="操作" width="145"><template #default="{ row }"><el-button v-if="Number(row.id) > 0" link type="primary" @click="router.push('/page-builder/editor/' + row.id)">{{ row.action === 'publish' ? '检查并更新' : '编辑页面' }}</el-button><el-button v-else link type="primary" @click="router.push('/page-builder/start')">查看配置</el-button></template></el-table-column>
      </el-table>
      <div class="release-context-note"><el-icon><InfoFilled /></el-icon>仅修改图片、文案或组件内容，无需上传代码或重新提交审核。</div>
    </section>
    <section v-show="activeReleaseTab === 'code'" class="studio-surface release-code">
      <div class="studio-section-head"><div><h2>上传小程序代码</h2><p>用于小程序端功能更新，不是日常内容发布。</p></div><el-icon><Upload /></el-icon></div>
      <div class="release-code-body">
        <ol class="release-code-steps"><li><span>1</span><div><strong>上传体验版</strong><p>将当前小程序代码上传到微信。</p></div></li><li><span>2</span><div><strong>提交审核</strong><p>在微信公众平台确认版本并提交审核。</p></div></li><li><span>3</span><div><strong>审核通过后发布</strong><p>正式发布后，新功能才对用户生效。</p></div></li></ol>
        <div v-if="pushStatus?.message" class="release-upload-status">{{ pushStatus.message }}</div>
        <div v-if="pushStatus?.uploadAvailable === false" class="studio-feedback">当前服务没有可用的上传能力，请使用现有技术发布流程。</div>
        <div class="release-code-actions">
          <el-button type="primary" :loading="pushing" :disabled="!latestRelease || latestRelease.status !== 1 || pushStatus?.uploadAvailable === false" @click="latestRelease && handlePushPreview(latestRelease)">上传当前版本代码</el-button>
          <el-button @click="activeReleaseTab = 'versions'">查看配置版本</el-button>
          <el-link href="https://mp.weixin.qq.com" target="_blank" rel="noopener noreferrer">前往微信公众平台</el-link>
        </div>
        <p class="studio-muted">请核对上传版本与代码内容；后台无法替你确认审核是否通过。</p>
      </div>
    </section>

    <!-- 主操作区：备注与按钮放在一起 -->
    <section v-show="activeReleaseTab === 'versions'" id="save-block" class="save-block" v-loading="loading">
      <div class="save-current">
        <div class="save-label">当前配置版本</div>
        <div class="save-value">{{ currentSemver }}</div>
        <div v-if="latestRelease" class="save-meta">
          包含 {{ latestRelease.pageCount || 0 }} 个页面 · 保存于 {{ formatTime(latestRelease.publishedAt || latestRelease.createTime) }}
        </div>
        <div v-else class="save-meta">还没有保存过版本</div>
      </div>

      <div class="save-form">
        <label class="save-form-label" for="release-notes">版本说明（选填）</label>
        <el-input
          id="release-notes"
          v-model="releaseNotes"
          maxlength="200"
          show-word-limit
          placeholder="例如：更新内容与首页轮播"
        />
        <div class="save-actions">
          <el-button
            type="primary"
            size="large"
            :loading="publishing"
            :disabled="!canPublish"
            @click="handlePublish"
          >
            发布绑定页面并创建版本
          </el-button>
          <el-button @click="openLivePreview">先预览一下</el-button>
          <span class="save-hint">此操作会更新绑定页面，不只是保存快照；不会上传代码。</span>
        </div>
      </div>
    </section>

    <!-- 按钮被禁用时，把原因说清楚并给出直达入口 -->
    <section v-if="activeReleaseTab !== 'code' && !canPublish && blockingItems.length" class="issue-card blocking">
      <div class="issue-head">
        <span class="issue-badge">按钮为什么点不了</span>
        还有 {{ blockingItems.length }} 项需要先处理。修改后点击「重新检查」。
      </div>
      <div v-for="item in blockingItems" :key="item.text" class="issue-row">
        <span class="issue-text">{{ item.text }}</span>
        <el-button v-if="item.to" size="small" @click="router.push(item.to)">{{ item.action }}</el-button>
      </div>
    </section>

    <section v-if="activeReleaseTab !== 'code' && warningItems.length" class="issue-card warning">
      <div class="issue-head">
        <span class="issue-badge warn">提醒</span>
        不影响保存，但建议看一眼
      </div>
      <div v-for="text in warningItems" :key="text" class="issue-row">
        <span class="issue-text">{{ text }}</span>
      </div>
    </section>

    <section v-if="activeReleaseTab === 'versions' && canPublish" class="issue-card ready">
      <div class="issue-head">
        <span class="issue-badge ok">检查通过</span>
        当前配置已通过检查，可以发布绑定页面并创建版本
      </div>
    </section>

    <section v-show="activeReleaseTab !== 'pages'" id="history-block" class="card">
      <div class="card-head">
        <h2>配置版本记录</h2>
        <span class="muted">
          「预览」看当时的样子；「回退到这个版本」会把线上页面和导航恢复成当时的状态；
          「上传代码到微信」只在小程序代码有更新时才用。
        </span>
      </div>
      <div v-if="historyError" class="studio-feedback is-error" role="alert">{{ historyError }}<el-button size="small" @click="loadHistory">重试</el-button></div>
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
import { computed, onMounted, onActivated, ref } from 'vue'
import { Refresh, View, InfoFilled, Upload } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import StudioHeader from '@/components/builder-studio/StudioHeader.vue'
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
const activeReleaseTab = ref('pages')
const releaseError = ref('')
const historyError = ref('')
const pendingPages = computed(() => (preflight.value?.pages || []).filter(p => p.action === 'publish'))
let loadedOnce = false
onActivated(() => { if (loadedOnce) loadAll() })
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
  version?: string
  releaseSemver?: string
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
  releaseError.value = ''
  try {
    const res = await getPublishPreflight()
    preflight.value = res.data || null
  } catch {
    releaseError.value = '发布检查未能完成。请重新检查后再发布配置版本。'
    preflight.value = null
  } finally {
    loading.value = false
  }
}

async function loadHistory() {
  historyLoading.value = true
  historyError.value = ''
  try {
    const res = await getAllReleases()
    history.value = ((res as any)?.data || []) as ReleaseRecord[]
  } catch {
    historyError.value = '版本记录未能读取，请重试。'
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
  loadedOnce = true
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
      '此操作会发布当前绑定页面的最新草稿，并将页面和导航配置记录为一个版本。\n用户刷新小程序后会看到更新；未绑定页面不会自动发布。\n这一步不会上传小程序代码到微信。',
      '发布绑定页面并创建版本',
      { type: 'info', confirmButtonText: '确认发布并创建版本', cancelButtonText: '再想想' },
    )
  } catch {
    return
  }
  publishing.value = true
  try {
    const res = await createRelease({
      mode: 'publish',
      releaseNotes: releaseNotes.value || '发布配置版本：导航配置 + 绑定页面',
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

/* Design studio: explicit publish boundaries */
.release-summary { display: grid; grid-template-columns: .8fr 1.1fr 1.1fr; margin-bottom: 24px; padding: 24px; gap: 24px; }
.release-summary > div { display: grid; gap: 6px; padding-left: 24px; border-left: 1px solid var(--studio-line); }
.release-summary > div:first-child { border: 0; padding: 0; }
.release-summary span { font-size: .8125rem; color: var(--studio-muted); }
.release-summary strong { font-size: 1.25rem; font-weight: 600; overflow-wrap: anywhere; }
.release-summary small { font-size: .75rem; color: var(--studio-muted); }
.release-workflow-tabs :deep(.el-tabs__item) { height: 44px; font-size: .9375rem; padding: 0 24px; }
.release-workflow-tabs :deep(.el-tabs__header) { margin-bottom: 20px; }
.release-workflow-tabs :deep(.el-tabs__content) { display: none; }
.release-pages .el-table { padding: 0 12px; font-size: .875rem; }
.release-pages :deep(th.el-table__cell) { background: #fafbfd; font-weight: 500; font-size: .8125rem; color: var(--studio-muted); }
.release-pages :deep(.el-table__cell) { padding: 16px 8px; }
.release-context-note { display: flex; align-items: center; gap: 8px; background: #fafbfd; border-top: 1px solid var(--studio-line); padding: 16px 24px; color: var(--studio-muted); font-size: .8125rem; }
.release-code-body { padding: 24px; }
.release-code-steps { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; padding: 0; margin: 0 0 24px; }
.release-code-steps li { display: flex; gap: 12px; }
.release-code-steps li > span { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 6px; background: var(--studio-soft); color: var(--studio-blue); font-size: .875rem; flex: none; }
.release-code-steps strong { font-size: .875rem; font-weight: 600; }
.release-code-steps p { margin: 6px 0 0; font-size: .8125rem; color: var(--studio-muted); }
.release-upload-status { padding: 12px 16px; background: #f5f7fb; border-radius: 8px; font-size: .875rem; color: #41516b; margin-bottom: 16px; }
.release-code-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; }
.release-page .save-block { border-color: var(--studio-line); border-radius: 12px; padding: 24px; gap: 24px; }
.release-page .save-current { flex-basis: 220px; min-width: 0; }
.release-page .save-label, .release-page .save-form-label { font-size: .875rem; }
.release-page .save-value { font-size: 1.25rem; font-weight: 600; }
.release-page .save-meta, .release-page .save-hint { font-size: .8125rem; line-height: 1.6; }
.release-page .save-actions { flex-wrap: wrap; }
.release-page .issue-card { padding: 16px 20px; border-radius: 8px; font-size: .875rem; }
.release-page .card { border-color: var(--studio-line); border-radius: 12px; box-shadow: none; overflow: hidden; }
.release-page .card-head { align-items: flex-start; gap: 12px; padding: 20px 24px; }
.release-page .card-head h2 { font-size: 1rem; white-space: nowrap; }
.release-page .card-head .muted { font-size: .8125rem; line-height: 1.6; max-width: 680px; }
.release-page .card .el-table { font-size: .875rem; }
.release-page .card :deep(.el-table__cell) { padding: 14px 12px; }
@media (max-width: 900px) { .release-code-steps { grid-template-columns: 1fr; gap: 20px; } .release-page .save-block { flex-direction: column; align-items: stretch; } .release-page .save-current { flex-basis: auto; } }
@media (max-width: 650px) { .release-summary { grid-template-columns: 1fr; gap: 16px; } .release-summary > div { border-left: 0; border-top: 1px solid var(--studio-line); padding: 16px 0 0; } }
</style>
