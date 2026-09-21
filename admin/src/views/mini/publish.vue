<template>
  <div class="mini-wb mw-page pub-view" v-loading="loading">
    <div class="pub">
      <div class="pub-main">
        <div>
          <h1 class="h1">发布</h1>
          <div class="sub">确认改动 → 发布，用户刷新即可看到；每次发布自动存为可回滚的版本</div>
        </div>

        <section class="card">
          <div class="head">
            <div>
              <h2 class="h2">本次要发布的改动</h2>
              <div class="sub">
                <template v-if="pending.length">
                  {{ pending.length }} 项 · 取消勾选的改动保留为待发布，不会丢
                </template>
                <template v-else>
                  没有待发布的改动。
                  <template v-if="site.liveReleaseNo != null">
                    线上是第 {{ site.liveReleaseNo }} 次发布
                    <template v-if="site.liveReleaseAt">（{{ formatTime(site.liveReleaseAt) }}）</template>。
                  </template>
                </template>
              </div>
            </div>
          </div>

          <div v-if="pending.length" class="pending-list" style="margin-top: 10px">
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
              class="list-row"
              :class="{ dim: !isSelected(item) }"
            >
              <el-checkbox
                :model-value="isSelected(item)"
                @change="(v: boolean | string | number) => setSelected(item, Boolean(v))"
              />
              <b style="font-weight: 500">
                {{ item.type === 'site' ? '站点 / 导航' : (item.name || '页面') }}
              </b>
              <span class="faint" style="margin-left: auto">{{ item.summary || item.path || '' }}</span>
              <button
                v-if="item.pageId"
                type="button"
                class="link"
                style="font-size: 12px"
                @click="router.push(`/mini/pages/${item.pageId}/editor`)"
              >
                查看
              </button>
            </div>
          </div>

          <div class="checks" :class="hasBlocking ? 'checks-err' : 'checks-ok'">
            <div v-if="preflightLoading && !preflight" class="chk muted">检查中…</div>
            <div v-else-if="preflightError" class="chk">⚠ {{ preflightError }}</div>
            <template v-else-if="preflight">
              <div v-if="!blocking.length && !warnings.length" class="chk">✓ 检查通过，可以发布</div>
              <div v-for="(item, i) in blocking" :key="'b' + i" class="chk">✗ {{ item }}</div>
              <div v-for="(item, i) in warnings" :key="'w' + i" class="chk">· {{ item }}</div>
            </template>
            <div v-else class="chk muted">暂无检查结果</div>
          </div>

          <div v-if="hasBlocking" class="note err" style="margin-top: 12px">
            有阻断项未通过，处理后才能发布。去「概览 → 底部导航」检查绑定。
          </div>

          <div class="pub-bar">
            <input
              v-model="publishNote"
              class="input"
              placeholder="这次改了什么（选填，方便以后回看）"
            />
            <button type="button" class="btn sm" @click="openPreview">扫码预览</button>
            <button
              type="button"
              class="btn primary"
              :disabled="publishDisabled"
              @click="handlePublish"
            >
              {{ publishing ? '发布中…' : `发布第 ${nextReleaseNo} 次` }}
            </button>
          </div>
        </section>

        <section class="card">
          <h2 class="h2">推送到微信生态</h2>
          <div class="sub">让用户从公众号、群、线下找到这个小程序</div>
          <div class="eco-rows">
            <div class="eco-row">
              <div class="dist-ic">微</div>
              <div class="eco-main">
                <b>公众号菜单</b>
                <span class="faint">进入小程序 → 首页</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/settings/wechat')">设置</button>
            </div>
            <div class="eco-row">
              <div class="dist-ic">码</div>
              <div class="eco-main">
                <b>小程序码</b>
                <span class="faint">为任意页面生成带参数的码</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/settings/wechat')">生成</button>
            </div>
            <div class="eco-row">
              <div class="dist-ic">文</div>
              <div class="eco-main">
                <b>公众号文章卡片</b>
                <span class="faint">复制页面路径，插入推文</span>
              </div>
              <button type="button" class="btn sm" @click="copyHomePath">复制路径</button>
            </div>
            <div class="eco-row">
              <div class="dist-ic">通</div>
              <div class="eco-main">
                <b>服务通知</b>
                <span class="faint">报名成功后推送活动提醒</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/settings/wechat')">配置</button>
            </div>
          </div>
        </section>
      </div>

      <div class="pub-side">
        <section class="card">
          <div class="head">
            <div>
              <h2 class="h2">发布记录</h2>
              <div class="sub">回滚会先变成待发布，确认后才生效</div>
            </div>
          </div>
          <div v-if="releases.length" class="tl-stack">
            <div v-for="row in releases" :key="String(row.id)" class="tl">
              <div class="tl-rail">
                <div class="tl-dot" :class="{ on: row.currentLive }" />
                <div class="tl-line" />
              </div>
              <div class="tl-body">
                <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
                  <b style="font-weight: 600">第 {{ row.releaseNo }} 次发布</b>
                  <span v-if="row.currentLive" class="tag t-live">线上</span>
                </div>
                <div class="faint">
                  {{ formatTime(row.publishedAt) }}
                  <template v-if="row.publisherName"> · {{ row.publisherName }}</template>
                </div>
                <div v-if="row.note" class="faint">{{ row.note }}</div>
                <button
                  type="button"
                  class="btn sm"
                  style="margin-top: 6px"
                  :disabled="!row.hasSnapshot || rollingId === row.id"
                  @click="handleRollback(row)"
                >
                  回滚到此
                </button>
              </div>
            </div>
          </div>
          <div v-else class="muted" style="padding: 12px 0">暂无发布记录</div>
        </section>

        <section class="card">
          <h2 class="h2">微信代码版本</h2>
          <div class="sub">开发者选项 · 仅技术更新小程序功能时使用</div>
          <div class="steps">
            <div><i /><span class="faint">上传代码</span></div>
            <div><i /><span class="faint">体验版</span></div>
            <div><i /><span class="faint">提交审核</span></div>
            <div><i /><span class="faint">正式版</span></div>
          </div>
          <div class="note ok" style="margin: 12px 0">正式版运行正常。内容发布不需要动这里。</div>
          <button type="button" class="btn sm" @click="router.push('/page-builder/wx-push')">
            上传新代码包
          </button>
        </section>
      </div>
    </div>
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
const publishNote = ref('')

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

function syncSelection() {
  selectedKeys.value = new Set(pending.value.map(itemKey))
}

function formatTime(t?: string | null) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
}

function openPreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source: 'draft' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

async function copyHomePath() {
  const path = site.value.tabBar?.[0]?.pagePath || 'pages/index/index'
  try {
    await navigator.clipboard.writeText(path)
    ElMessage.success('路径已复制')
  } catch {
    ElMessage.info(path)
  }
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
      notes: publishNote.value.trim() || undefined,
    })
    ElMessage.success(result.message || `已发布第 ${result.liveReleaseNo ?? nextReleaseNo.value} 次`)
    publishNote.value = ''
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
    syncSelection()
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
.pub-view.mw-page {
  margin: -16px;
}
.pub-main,
.pub-side {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line2);
  &.dim { opacity: 0.55; }
  &:last-child { border-bottom: 0; }
}
.checks {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
  padding: 14px;
  border-radius: 10px;
  margin-top: 14px;
  &.checks-ok { background: var(--gs); }
  &.checks-err { background: var(--rs); }
}
.chk {
  display: flex;
  gap: 8px;
  font-size: 13px;
  align-items: flex-start;
}
.pub-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 14px;
  flex-wrap: wrap;
  .input { flex: 1; min-width: 180px; }
}
.eco-rows {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.eco-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.eco-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  b { font-weight: 500; }
}
.dist-ic {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--gs);
  color: var(--g);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 600;
}
.tl-stack { margin-top: 10px; }
.tl {
  display: flex;
  gap: 12px;
}
.tl-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #d9cfc3;
  margin-top: 5px;
  &.on { background: var(--g); }
}
.tl-line {
  width: 2px;
  flex: 1;
  background: #efe6da;
  min-height: 20px;
}
.tl-body {
  flex: 1;
  padding-bottom: 14px;
}
.steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
  div i {
    display: block;
    height: 4px;
    border-radius: 2px;
    background: var(--g);
    margin-bottom: 6px;
  }
}
@media (max-width: 1180px) {
  .checks, .steps { grid-template-columns: minmax(0, 1fr); }
}
</style>
