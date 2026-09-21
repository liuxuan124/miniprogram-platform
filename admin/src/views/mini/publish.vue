<template>
  <div class="mini-wb mw-page publish" v-loading="loading">
    <header class="mw-head">
      <div>
        <h1 class="mw-title">发布</h1>
        <p class="mw-sub">确认改动 → 发布，用户刷新即可看到；每次发布自动存为可回滚的版本</p>
      </div>
    </header>

    <div class="publish-grid">
      <div class="col-main">
        <section class="mw-panel">
          <div class="panel-head">
            <h2>本次要发布的改动</h2>
            <span class="muted">
              <template v-if="pending.length">{{ selectedCount }} 项 · 未勾选将留在待发布</template>
              <template v-else>0 项</template>
            </span>
          </div>

          <div v-if="pending.length" class="pending-list">
            <div class="pending-toolbar">
              <el-checkbox
                :model-value="allSelected"
                :indeterminate="someSelected && !allSelected"
                @change="toggleAll"
              >
                全选
              </el-checkbox>
            </div>
            <div
              v-for="item in pending"
              :key="String(item.id || item.name)"
              class="pending-row"
              :class="{ 'is-deselected': !isSelected(item) }"
            >
              <el-checkbox
                :model-value="isSelected(item)"
                @change="(v: boolean | string | number) => setSelected(item, Boolean(v))"
              />
              <span :class="changeKindClass(item)">{{ changeKindLabel(item) }}</span>
              <div class="pending-row__main">
                <div class="pending-row__name">
                  {{ item.type === 'site' ? '站点 / 导航' : (item.name || '页面') }}
                </div>
                <div class="pending-row__sum">{{ item.summary || item.path || '' }}</div>
              </div>
              <button type="button" class="mw-link" @click="goCompare(item)">对比</button>
            </div>
          </div>
          <div v-else class="empty-block">
            <p>没有待发布的改动</p>
            <p class="muted">
              <template v-if="site.liveReleaseNo != null">
                上次发布：第 {{ site.liveReleaseNo }} 次
                <span v-if="site.liveReleaseAt"> · {{ formatTime(site.liveReleaseAt) }}</span>
              </template>
              <template v-else>还没有发布记录。</template>
            </p>
          </div>

          <div class="checklist">
            <div class="checklist__head">
              <span>发布前检查</span>
              <button type="button" class="mw-link" :disabled="preflightLoading" @click="loadPreflight">
                重新检查
              </button>
            </div>
            <div v-if="preflightLoading && !preflight" class="muted">检查中…</div>
            <div v-else-if="preflightError" class="mw-check-bad">{{ preflightError }}</div>
            <template v-else-if="preflight">
              <div v-if="!blocking.length" class="pass-box">
                <div v-for="(line, i) in passLines" :key="'p' + i" class="mw-check-ok">✓ {{ line }}</div>
              </div>
              <div v-for="(item, i) in blocking" :key="'b' + i" class="mw-check-bad">✗ {{ item }}</div>
              <div v-for="(item, i) in warnings" :key="'w' + i" class="warn-line">! {{ item }}</div>
            </template>
          </div>

          <div class="publish-bar">
            <el-input
              v-model="publishNote"
              placeholder="发布说明，例如：中秋读书节上线 + 首页活动入口"
              maxlength="120"
              show-word-limit
            />
            <el-button @click="openPreview">扫码预览</el-button>
            <el-button
              type="primary"
              class="mw-btn-primary"
              :loading="publishing"
              :disabled="publishDisabled"
              @click="handlePublish"
            >
              发布第 {{ nextReleaseNo }} 次
            </el-button>
          </div>
        </section>

        <section class="mw-panel">
          <div class="panel-head">
            <h2>推送到微信生态</h2>
          </div>
          <div class="eco-rows">
            <div v-for="row in ecoRows" :key="row.key" class="eco-row">
              <div>
                <div class="eco-row__title">{{ row.title }}</div>
                <div class="eco-row__sub">{{ row.sub }}</div>
              </div>
              <el-button size="small" @click="row.action">{{ row.actionLabel }}</el-button>
            </div>
          </div>
        </section>
      </div>

      <aside class="col-side">
        <section class="mw-panel">
          <div class="panel-head">
            <h2>发布记录</h2>
          </div>
          <div v-if="visibleReleases.length" class="timeline">
            <div v-for="row in visibleReleases" :key="String(row.id)" class="timeline-item">
              <div class="dot" :class="{ live: row.currentLive }" />
              <div class="timeline-item__body">
                <div class="timeline-item__title">
                  第 {{ row.releaseNo }} 次
                  <span v-if="row.currentLive" class="live-badge">线上</span>
                </div>
                <div class="timeline-item__meta">
                  {{ formatTime(row.publishedAt) }}
                  <span v-if="row.publisherName"> · {{ row.publisherName }}</span>
                </div>
                <div v-if="row.note" class="timeline-item__note">{{ row.note }}</div>
                <button
                  v-if="!row.currentLive"
                  type="button"
                  class="mw-link rollback"
                  :disabled="!row.hasSnapshot || rollingId === row.id"
                  @click="handleRollback(row)"
                >
                  {{ rollingId === row.id ? '处理中…' : '回滚到此' }}
                </button>
              </div>
            </div>
          </div>
          <p v-else class="muted">暂无发布记录</p>
          <button
            v-if="releases.length > timelineLimit"
            type="button"
            class="mw-link more-link"
            @click="showAllReleases = !showAllReleases"
          >
            {{ showAllReleases ? '收起' : `查看全部 ${releases.length} 次 ›` }}
          </button>
        </section>

        <section class="mw-panel wx-panel">
          <button type="button" class="wx-toggle" @click="wxOpen = !wxOpen">
            <span>微信代码版本</span>
            <span class="chevron">{{ wxOpen ? '▴' : '▾' }}</span>
          </button>
          <div v-if="wxOpen" class="wx-body">
            <div class="steps">
              <div v-for="(s, i) in wxSteps" :key="s.label" class="step">
                <div class="step__n">{{ i + 1 }}</div>
                <div class="step__label">{{ s.label }}</div>
                <div class="step__val">{{ s.value }}</div>
              </div>
            </div>
            <p class="wx-ok">✓ 正式版运行正常，内容发布不需要动这里</p>
            <div class="wx-actions">
              <el-button size="small" @click="router.push('/page-builder/wx-push')">打开微信推送</el-button>
              <el-button size="small" link type="primary" @click="router.push('/settings/wechat')">
                微信配置
              </el-button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <el-dialog
      v-model="compareVisible"
      title="对比线上"
      width="90%"
      top="4vh"
      destroy-on-close
      class="compare-live-dialog"
    >
      <div class="compare-live-panes">
        <div class="compare-live-pane">
          <div class="compare-live-pane__label">改动后（草稿）</div>
          <iframe
            v-if="compareDraftUrl"
            class="compare-live-pane__frame"
            :src="compareDraftUrl"
            title="草稿预览"
          />
          <div v-else class="compare-live-pane__empty">暂无草稿预览</div>
        </div>
        <div class="compare-live-pane">
          <div class="compare-live-pane__label">线上</div>
          <iframe
            v-if="compareLiveUrl"
            class="compare-live-pane__frame"
            :src="compareLiveUrl"
            title="线上预览"
          />
          <div v-else class="compare-live-pane__empty">暂无线上版本</div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMiniSite,
  getPendingChanges,
  listMiniContentReleases,
  prepareMiniRollback,
  publishMiniSite,
  type MiniContentReleaseVO,
  type MiniSiteVO,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPublishPreflight, getLatestRelease, type PublishPreflight } from '@/api/version'
import { refreshMiniPending } from '@/composables/useMiniPending'

defineOptions({ name: 'MiniPublish' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const publishing = ref(false)
const rollingId = ref<number | null>(null)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const selectedKeys = ref<Set<string>>(new Set())
const releases = ref<MiniContentReleaseVO[]>([])
const publishNote = ref('')
const showAllReleases = ref(false)
const timelineLimit = 4
const wxOpen = ref(true)
const compareVisible = ref(false)
const compareDraftUrl = ref('')
const compareLiveUrl = ref('')
const wechatSemver = ref('')

const preflight = ref<PublishPreflight | null>(null)
const preflightLoading = ref(false)
const preflightError = ref('')

const highlightPageId = computed(() => {
  const raw = route.query.pageId
  return raw != null && String(raw) !== '' ? String(raw) : ''
})

const nextReleaseNo = computed(() => Number(site.value.liveReleaseNo || 0) + 1)
const blocking = computed(() => preflight.value?.blocking || [])
const warnings = computed(() => preflight.value?.warnings || [])
const hasBlocking = computed(() => blocking.value.length > 0 || preflight.value?.canPublish === false)

const passLines = computed(() => {
  const tabN = site.value.tabBar?.length || 0
  const lines = [
    tabN ? `底部导航已绑定（${tabN} 项）` : '底部导航可在概览配置',
    '图片建议压缩（单图 <500KB）',
    '无空组件 / 断链（以检查结果为准）',
    '新页面建议配置分享卡片',
  ]
  if (warnings.value.length) {
    return lines.filter((_, i) => i < 2)
  }
  return lines
})

const selectedCount = computed(() => {
  let n = 0
  for (const item of pending.value) {
    if (isSelected(item)) n += 1
  }
  return n
})

const allSelected = computed(() => pending.value.length > 0 && selectedCount.value === pending.value.length)
const someSelected = computed(() => selectedCount.value > 0)

const publishDisabled = computed(() => {
  if (publishing.value) return true
  if (hasBlocking.value) return true
  if (!pending.value.length && !site.value.pendingCount) return true
  if (pending.value.length && selectedCount.value === 0) return true
  return false
})

const visibleReleases = computed(() =>
  showAllReleases.value ? releases.value : releases.value.slice(0, timelineLimit),
)

const wxSteps = computed(() => {
  const ver = site.value.wechatCodeVersion || wechatSemver.value || '—'
  return [
    { label: '上传代码', value: ver },
    { label: '体验版', value: '已创建' },
    { label: '提交审核', value: '已通过' },
    { label: '正式版', value: `${ver} 线上` },
  ]
})

const ecoRows = [
  {
    key: 'menu',
    title: '公众号菜单',
    sub: '把「进入小程序」链到首页',
    actionLabel: '设置',
    action: () => router.push('/settings/wechat'),
  },
  {
    key: 'qr',
    title: '小程序码',
    sub: '为指定页面生成带参码',
    actionLabel: '生成',
    action: () => ElMessage.info('请到微信配置或微信公众平台生成小程序码'),
  },
  {
    key: 'article',
    title: '公众号文章卡片',
    sub: '复制页面路径插入图文',
    actionLabel: '复制路径',
    action: async () => {
      const path = site.value.tabBar?.[0]?.pagePath || 'pages/index/index'
      try {
        await navigator.clipboard.writeText(path)
        ElMessage.success('已复制首页路径')
      } catch {
        ElMessage.info(path)
      }
    },
  },
  {
    key: 'notify',
    title: '服务通知',
    sub: '用户关键动作触发提醒',
    actionLabel: '配置',
    action: () => ElMessage.info('服务通知模板需在微信公众平台配置'),
  },
]

function itemKey(item: PendingChangeItem): string {
  return String(item.id ?? item.pageId ?? `${item.type}-${item.name}-${item.path}`)
}

function isSelected(item: PendingChangeItem): boolean {
  return selectedKeys.value.has(itemKey(item))
}

function setSelected(item: PendingChangeItem, on: boolean) {
  const next = new Set(selectedKeys.value)
  const key = itemKey(item)
  if (on) next.add(key)
  else next.delete(key)
  selectedKeys.value = next
}

function toggleAll(on: boolean | string | number) {
  if (on) selectedKeys.value = new Set(pending.value.map(itemKey))
  else selectedKeys.value = new Set()
}

function syncSelection() {
  selectedKeys.value = new Set(pending.value.map(itemKey))
}

function formatTime(t?: string | null) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
}

function changeKindLabel(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  const st = String(item.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
  return '修改'
}

function changeKindClass(item: PendingChangeItem) {
  return changeKindLabel(item) === '新增' ? 'mw-tag-new' : 'mw-tag-mod'
}

function goCompare(item: PendingChangeItem) {
  if (item.pageId) {
    const draft = router.resolve({ path: `/page-builder/preview/${item.pageId}` })
    const live = router.resolve({
      path: '/h5/miniapp-preview',
      query: { source: 'live', view: 'config' },
    })
    compareDraftUrl.value = draft.href
    compareLiveUrl.value = live.href
    compareVisible.value = true
    return
  }
  // 站点级改动：全站草稿 vs 线上
  const draft = router.resolve({
    path: '/h5/miniapp-preview',
    query: { source: 'draft', view: 'config' },
  })
  const live = router.resolve({
    path: '/h5/miniapp-preview',
    query: { source: 'live', view: 'config' },
  })
  compareDraftUrl.value = draft.href
  compareLiveUrl.value = live.href
  compareVisible.value = true
}

function openPreview() {
  const { href } = router.resolve({
    path: '/h5/miniapp-preview',
    query: { view: 'config', source: 'draft' },
  })
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function loadPreflight() {
  preflightLoading.value = true
  preflightError.value = ''
  try {
    const res = await getPublishPreflight()
    const payload = res as unknown as { data?: PublishPreflight } & Partial<PublishPreflight>
    preflight.value = payload.data ?? (payload.canPublish != null ? (payload as PublishPreflight) : null)
  } catch (e: unknown) {
    preflight.value = null
    preflightError.value = e instanceof Error ? e.message : '发布前检查暂不可用'
  } finally {
    preflightLoading.value = false
  }
}

async function handlePublish() {
  if (hasBlocking.value) {
    ElMessage.warning('请先处理阻断项')
    return
  }
  publishing.value = true
  try {
    const pageIds = pending.value
      .filter((item) => isSelected(item) && item.pageId != null && item.pageId !== '')
      .map((item) => item.pageId as string | number)
    const hasSitePending = pending.value.some((item) => item.type === 'site')
    const includeSite = hasSitePending
      ? pending.value.some((item) => item.type === 'site' && isSelected(item))
      : true
    const result = await publishMiniSite({
      pageId: highlightPageId.value || undefined,
      pageIds,
      includeSite,
      notes: publishNote.value.trim() || undefined,
    })
    ElMessage.success(result.message || `已发布第 ${result.liveReleaseNo ?? nextReleaseNo.value} 次`)
    publishNote.value = ''
    await refreshMiniPending(true)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '发布失败')
  } finally {
    publishing.value = false
  }
}

async function handleRollback(row: MiniContentReleaseVO) {
  if (!row.id || !row.hasSnapshot) {
    ElMessage.warning('该记录无快照，无法回滚')
    return
  }
  try {
    await ElMessageBox.confirm(
      `将第 ${row.releaseNo} 次的内容还原为「待发布」改动，不会立刻改线上。确认后请再到本页勾选发布。`,
      '回滚到此版本',
      { type: 'warning', confirmButtonText: '还原为待发布' },
    )
  } catch {
    return
  }
  rollingId.value = Number(row.id)
  try {
    const result = await prepareMiniRollback(row.id)
    ElMessage.success(result.message || '已生成待发布改动')
    await refreshMiniPending(true)
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '回滚失败')
  } finally {
    rollingId.value = null
  }
}

async function load() {
  loading.value = true
  try {
    const [s, p, r, latestRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      listMiniContentReleases(),
      getLatestRelease().catch(() => null),
    ])
    site.value = s
    pending.value = p.items || []
    releases.value = r || []
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatSemver.value = String(latest?.semver || latest?.version || '')
    syncSelection()
    await loadPreflight()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => pending.value.map(itemKey).join('|'),
  () => {
    if (pending.value.length && selectedKeys.value.size === 0) syncSelection()
  },
)

onMounted(load)
</script>

<style scoped lang="scss">
.publish-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 1fr);
  gap: 16px;
  align-items: start;
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  h2 { margin: 0; font-size: 15px; font-weight: 650; }
}
.muted { color: var(--mw-muted); font-size: 13px; }

.pending-toolbar { margin-bottom: 8px; }
.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: #f8f4ee;
  border: 1px solid transparent;
}
.pending-row.is-deselected { opacity: 0.55; }
.pending-row__main { flex: 1; min-width: 0; }
.pending-row__name { font-weight: 650; font-size: 14px; }
.pending-row__sum { font-size: 12px; color: var(--mw-muted); margin-top: 2px; }

.empty-block {
  text-align: center;
  padding: 20px 0;
  p { margin: 0 0 6px; }
}

.checklist {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--mw-border);
}
.checklist__head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
}
.pass-box {
  padding: 12px 14px;
  border-radius: 10px;
  background: var(--mw-green-bg);
  border: 1px solid rgba(31, 122, 77, 0.18);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.warn-line {
  color: var(--mw-amber);
  font-size: 13px;
  line-height: 1.6;
}

.compare-live-panes {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  min-height: 70vh;
}
.compare-live-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  &__label {
    font-size: 13px;
    font-weight: 650;
    color: var(--mw-ink);
  }
  &__frame {
    flex: 1;
    width: 100%;
    min-height: 64vh;
    border: 1px solid var(--mw-border);
    border-radius: 12px;
    background: #fff;
  }
  &__empty {
    flex: 1;
    display: grid;
    place-items: center;
    border: 1px dashed var(--mw-border);
    border-radius: 12px;
    color: var(--mw-muted);
    font-size: 13px;
  }
}

.publish-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 10px;
  margin-top: 16px;
  align-items: center;
}

.eco-rows { display: flex; flex-direction: column; gap: 4px; }
.eco-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--mw-border);
  &:last-child { border-bottom: 0; }
}
.eco-row__title { font-size: 14px; font-weight: 600; }
.eco-row__sub { font-size: 12px; color: var(--mw-muted); margin-top: 2px; }

.timeline { display: flex; flex-direction: column; gap: 0; }
.timeline-item {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 10px;
  padding-bottom: 16px;
  position: relative;
  &:not(:last-child)::before {
    content: '';
    position: absolute;
    left: 7px;
    top: 14px;
    bottom: 0;
    width: 1px;
    background: var(--mw-border);
  }
}
.dot {
  width: 10px;
  height: 10px;
  margin-top: 4px;
  border-radius: 50%;
  background: #cbbfb0;
  &.live { background: var(--mw-green); box-shadow: 0 0 0 3px rgba(31, 122, 77, 0.15); }
}
.timeline-item__title {
  font-weight: 650;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.live-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--mw-green);
  background: var(--mw-green-bg);
  padding: 1px 8px;
  border-radius: 999px;
}
.timeline-item__meta,
.timeline-item__note {
  font-size: 12px;
  color: var(--mw-muted);
  margin-top: 2px;
}
.rollback { margin-top: 6px; display: inline-block; }
.more-link { margin-top: 4px; }

.wx-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 15px;
  font-weight: 650;
  color: inherit;
  cursor: pointer;
}
.wx-body { margin-top: 14px; }
.steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.step {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: #f8f4ee;
  border: 1px solid var(--mw-border);
}
.step__n {
  width: 18px;
  height: 18px;
  margin: 0 auto 4px;
  border-radius: 50%;
  background: var(--mw-terracotta);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
}
.step__label { font-size: 11px; color: var(--mw-muted); }
.step__val { font-size: 12px; font-weight: 600; margin-top: 2px; word-break: break-all; }
.wx-ok {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--mw-green);
}
.wx-actions { margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }

@media (max-width: 1100px) {
  .publish-grid { grid-template-columns: 1fr; }
  .publish-bar { grid-template-columns: 1fr; }
  .steps { grid-template-columns: repeat(2, 1fr); }
}
</style>
