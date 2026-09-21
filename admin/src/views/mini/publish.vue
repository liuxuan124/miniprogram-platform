<template>
  <div class="mini-page" v-loading="loading">
    <header class="page-head">
      <div>
        <div class="page-head__kicker">小程序 · 发布</div>
        <h1>发布</h1>
        <p>把导航草稿与未上线页面一次推到用户可见。微信代码包推送在下方开发者区。</p>
      </div>
      <el-button @click="load">刷新</el-button>
    </header>

    <section class="hero-panel">
      <div class="hero-panel__copy">
        <div class="hero-label">当前线上</div>
        <div class="hero-value">
          <template v-if="site.liveReleaseNo != null">第 {{ site.liveReleaseNo }} 次</template>
          <template v-else>尚未发布</template>
        </div>
        <div class="hero-meta">
          <span v-if="site.liveReleaseAt">上次 {{ formatTime(site.liveReleaseAt) }}</span>
          <span v-else>还没有发布记录</span>
          <span v-if="highlightPageId"> · 来自装修器页 #{{ highlightPageId }}</span>
        </div>
      </div>
      <div class="hero-panel__actions">
        <div class="will-publish">将发布 {{ selectedCount }} 项</div>
        <el-button
          type="primary"
          size="large"
          class="btn-terracotta"
          :loading="publishing"
          :disabled="publishDisabled"
          @click="handlePublish"
        >
          发布第 {{ nextReleaseNo }} 次
        </el-button>
      </div>
    </section>

    <section class="panel">
      <div class="panel__head">
        <h2>发布前检查</h2>
        <el-button link type="primary" :loading="preflightLoading" @click="loadPreflight">重新检查</el-button>
      </div>
      <div v-if="preflightLoading && !preflight" class="muted">检查中…</div>
      <div v-else-if="preflightError" class="preflight-error">{{ preflightError }}</div>
      <template v-else-if="preflight">
        <div v-if="!blocking.length && !warnings.length" class="preflight-ok">检查通过，可以发布</div>
        <div v-if="blocking.length" class="issue-block blocking">
          <div class="issue-block__title">阻断 · {{ blocking.length }} 项</div>
          <div v-for="(item, i) in blocking" :key="'b' + i" class="issue-row blocking">{{ item }}</div>
        </div>
        <div v-if="warnings.length" class="issue-block warning">
          <div class="issue-block__title">提醒 · {{ warnings.length }} 项</div>
          <div v-for="(item, i) in warnings" :key="'w' + i" class="issue-row warning">{{ item }}</div>
        </div>
      </template>
      <div v-else class="muted">暂无检查结果</div>
    </section>

    <section class="panel">
      <div class="panel__head">
        <h2>待发布列表</h2>
        <span class="muted">
          <template v-if="pending.length">已选 {{ selectedCount }} / {{ pending.length }}</template>
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
          <div class="pending-row__main">
            <div class="pending-row__name">
              {{ item.type === 'site' ? '站点 / 导航' : (item.name || '页面') }}
              <span v-if="isSelected(item)" class="will-tag">本次将发</span>
            </div>
            <div class="pending-row__sum">{{ item.summary || item.path || '' }}</div>
          </div>
          <PageStatusTag :status="(item.status as any) || 'pending'" />
          <el-button
            v-if="item.pageId"
            size="small"
            link
            @click="router.push(`/mini/pages/${item.pageId}/editor`)"
          >
            装修
          </el-button>
        </div>
      </div>
      <div v-else class="empty-block">
        <el-empty description="没有待发布的改动" :image-size="72" />
        <div class="empty-block__meta">
          <template v-if="site.liveReleaseNo != null">
            上次发布：第 {{ site.liveReleaseNo }} 次
            <span v-if="site.liveReleaseAt"> · {{ formatTime(site.liveReleaseAt) }}</span>
          </template>
          <template v-else>还没有发布记录，线上尚未对用户开放内容更新。</template>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel__head">
        <h2>发布记录</h2>
        <span class="muted">回滚会生成待发布改动，需再次确认才对用户生效</span>
      </div>
      <div v-if="releases.length" class="timeline">
        <div v-for="row in releases" :key="String(row.id)" class="timeline-row">
          <div class="timeline-row__main">
            <div class="timeline-row__title">
              第 {{ row.releaseNo }} 次
              <span v-if="row.currentLive" class="live-badge">线上</span>
            </div>
            <div class="timeline-row__meta">
              {{ formatTime(row.publishedAt) }}
              <span v-if="row.publisherName"> · {{ row.publisherName }}</span>
              <span v-if="row.pageCount != null"> · {{ row.pageCount }} 页</span>
            </div>
            <div v-if="row.note" class="timeline-row__note">{{ row.note }}</div>
          </div>
          <el-button
            size="small"
            :disabled="!row.hasSnapshot || rollingId === row.id"
            :loading="rollingId === row.id"
            @click="handleRollback(row)"
          >
            回滚到此
          </el-button>
        </div>
      </div>
      <el-empty v-else description="暂无发布记录" :image-size="56" />
    </section>

    <el-collapse class="dev-collapse">
      <el-collapse-item title="开发者 · 微信代码版本（内容发布不需要动这里）" name="wx">
        <p class="dev-hint">仅技术更新小程序功能时使用；日常改页面与导航走上方「发布第 N 次」。</p>
        <el-button @click="router.push('/page-builder/wx-push')">打开微信推送</el-button>
        <el-button link type="primary" @click="router.push('/settings/wechat')">微信配置</el-button>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageStatusTag from '@/components/mini/PageStatusTag.vue'
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
import { getPublishPreflight, type PublishPreflight } from '@/api/version'

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
  if (on) {
    selectedKeys.value = new Set(pending.value.map(itemKey))
  } else {
    selectedKeys.value = new Set()
  }
}

function syncSelection(preferHighlight = false) {
  const keys = pending.value.map(itemKey)
  const next = new Set(keys)
  if (preferHighlight && highlightPageId.value) {
    // 装修器跳来时仍默认全选；高亮页确保在选中集合中（已全选无需额外处理）
  }
  selectedKeys.value = next
}

function formatTime(t?: string | null) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
}

async function loadPreflight() {
  preflightLoading.value = true
  preflightError.value = ''
  try {
    const res = await getPublishPreflight()
    preflight.value = (res as any)?.data ?? res ?? null
  } catch (e: any) {
    preflight.value = null
    preflightError.value = e?.message || '发布前检查暂不可用'
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
    })
    ElMessage.success(result.message || `已发布第 ${result.liveReleaseNo ?? nextReleaseNo.value} 次`)
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '发布失败')
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
    await load()
  } catch (e: any) {
    ElMessage.error(e?.message || '回滚失败')
  } finally {
    rollingId.value = null
  }
}

async function load() {
  loading.value = true
  try {
    const [s, p, r] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      listMiniContentReleases(),
    ])
    site.value = s
    pending.value = p.items || []
    releases.value = r || []
    syncSelection(true)
    await loadPreflight()
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => pending.value.map(itemKey).join('|'),
  () => {
    if (pending.value.length && selectedKeys.value.size === 0) {
      syncSelection()
    }
  },
)

onMounted(load)
</script>

<style scoped lang="scss">
.mini-page {
  --mini-bg: #f6f2ec;
  --mini-terracotta: #b4430f;
  --mini-ink: #2c241c;
  --mini-muted: #7a6e64;
  --mini-card: #fffcf8;
  --mini-border: #e5ddd2;
  min-height: 100%;
  margin: -16px;
  padding: 20px 24px 40px;
  background: var(--mini-bg);
  color: var(--mini-ink);
}
.page-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  h1 { margin: 4px 0; font-size: 24px; }
  p { margin: 0; color: var(--mini-muted); font-size: 13px; max-width: 560px; }
}
.page-head__kicker { font-size: 12px; color: var(--mini-muted); }
.btn-terracotta {
  --el-button-bg-color: var(--mini-terracotta);
  --el-button-border-color: var(--mini-terracotta);
  --el-button-hover-bg-color: #9a390d;
  --el-button-hover-border-color: #9a390d;
}

.hero-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 22px;
  margin-bottom: 16px;
  border-radius: 12px;
  background: linear-gradient(135deg, #f3e6d8 0%, #fffcf8 60%);
  border: 1px solid #e0d0c0;
}
.hero-label { font-size: 12px; color: var(--mini-muted); }
.hero-value { font-size: 28px; font-weight: 700; margin: 4px 0; letter-spacing: -0.02em; }
.hero-meta { font-size: 13px; color: var(--mini-muted); }
.hero-panel__actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
.will-publish {
  font-size: 13px;
  color: var(--mini-muted);
}

.panel {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 16px 18px;
  margin-bottom: 14px;
}
.panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  h2 { margin: 0; font-size: 15px; }
}
.muted { color: var(--mini-muted); font-size: 13px; }

.preflight-ok {
  font-size: 13px;
  color: #3d6b4f;
  padding: 8px 10px;
  background: #eef6f0;
  border-radius: 8px;
}
.preflight-error {
  font-size: 13px;
  color: #9a390d;
  padding: 8px 10px;
  background: #fbeadf;
  border-radius: 8px;
}
.issue-block { margin-bottom: 10px; }
.issue-block__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}
.issue-block.blocking .issue-block__title { color: #b42318; }
.issue-block.warning .issue-block__title { color: #b45309; }
.issue-row {
  font-size: 13px;
  padding: 8px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  line-height: 1.45;
}
.issue-row.blocking {
  background: #fef3f2;
  color: #912018;
  border: 1px solid #fecdca;
}
.issue-row.warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.pending-toolbar { margin-bottom: 8px; }
.pending-list { display: flex; flex-direction: column; gap: 8px; }
.pending-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #f8f4ee;
}
.pending-row.is-deselected {
  opacity: 0.55;
}
.pending-row__main { flex: 1; min-width: 0; }
.pending-row__name {
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.pending-row__sum { font-size: 12px; color: var(--mini-muted); }
.will-tag {
  font-size: 11px;
  font-weight: 500;
  color: var(--mini-terracotta);
  background: #fbeadf;
  padding: 1px 6px;
  border-radius: 4px;
}

.empty-block {
  text-align: center;
}
.empty-block__meta {
  margin-top: -8px;
  font-size: 13px;
  color: var(--mini-muted);
}

.timeline { display: flex; flex-direction: column; gap: 10px; }
.timeline-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  background: #f8f4ee;
  border: 1px solid var(--mini-border);
}
.timeline-row__title {
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.live-badge {
  font-size: 11px;
  font-weight: 500;
  color: #2f6b3a;
  background: #e8f2e9;
  border: 1px solid #b7d4bc;
  padding: 1px 8px;
  border-radius: 999px;
}
.timeline-row__meta, .timeline-row__note {
  font-size: 12px;
  color: var(--mini-muted);
  margin-top: 2px;
}

.dev-collapse {
  background: var(--mini-card);
  border: 1px solid var(--mini-border);
  border-radius: 12px;
  padding: 0 12px;
  :deep(.el-collapse-item__header) { background: transparent; border: 0; color: var(--mini-ink); }
  :deep(.el-collapse-item__wrap) { background: transparent; border: 0; }
}
.dev-hint { color: var(--mini-muted); font-size: 13px; margin: 0 0 12px; }
</style>
