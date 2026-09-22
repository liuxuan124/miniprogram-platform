<template>
  <div class="mini-wb mw-page pub-view" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="list" />
    <div v-else class="pub">
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

          <div v-if="pending.length" class="pending-list" style="margin-top: 6px">
            <label
              v-for="item in pending"
              :key="String(item.id || item.name)"
              class="list-row"
              :class="{ dim: !isSelected(item) }"
              style="cursor: pointer"
            >
              <el-checkbox
                :model-value="isSelected(item)"
                @change="(v: boolean | string | number) => setSelected(item, Boolean(v))"
                @click.stop
              />
              <span :class="['tag', kindTagClass(item)]">{{ kindLabel(item) }}</span>
              <span style="flex: 1; min-width: 0">
                <b style="font-weight: 500; display: block">
                  {{ item.type === 'site' ? '站点 / 导航' : (item.name || '页面') }}
                </b>
                <span class="faint">{{ item.summary || item.path || '' }}</span>
              </span>
              <button
                v-if="item.pageId"
                type="button"
                class="link"
                style="font-size: 12px"
                @click.stop="router.push(`/mini/pages/${item.pageId}/editor`)"
              >
                查看
              </button>
            </label>
          </div>

          <div class="checks" :class="{ 'is-blocked': hasBlocking, 'is-ok': !hasBlocking && pending.length }">
            <div v-if="preflightLoading && !preflight" class="chk chk--muted">
              <span class="chk__ic"><MiniIcon name="info" :size="15" /></span>
              检查中…
            </div>
            <div v-else-if="preflightError" class="chk chk--warn">
              <span class="chk__ic"><MiniIcon name="warn" :size="15" /></span>
              {{ preflightError }}
            </div>
            <template v-else-if="preflight">
              <div v-if="!blocking.length && !warnings.length" class="chk chk--ok">
                <span class="chk__ic"><MiniIcon name="check" :size="15" /></span>
                检查通过，可以发布
              </div>
              <div v-for="(item, i) in blocking" :key="'b' + i" class="chk chk--err">
                <span class="chk__ic"><MiniIcon name="x" :size="15" /></span>
                {{ item }}
              </div>
              <div v-for="(item, i) in warnings" :key="'w' + i" class="chk chk--warn">
                <span class="chk__ic"><MiniIcon name="warn" :size="15" /></span>
                {{ item }}
              </div>
            </template>
            <div v-else class="chk chk--muted">暂无检查结果</div>
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
            <button type="button" class="btn" @click="openPreviewQr">
              <MiniIcon name="qr" :size="15" />
              扫码预览
            </button>
            <button
              type="button"
              class="btn primary"
              :disabled="publishDisabled"
              @click="handlePublish"
            >
              <MiniIcon name="send" :size="15" />
              {{ publishing ? '发布中…' : `发布第 ${nextReleaseNo} 次${selectedCount && selectedCount < pending.length ? `（${selectedCount} 项）` : ''}` }}
            </button>
          </div>
        </section>

        <section class="card">
          <h2 class="h2">推送到微信生态</h2>
          <div class="sub">让用户从公众号、群、线下找到这个小程序</div>
          <div class="eco-rows">
            <div class="eco-row">
              <div class="dist-ic"><MiniIcon name="wechat" :size="17" /></div>
              <div class="eco-main">
                <b>公众号菜单</b>
                <span class="faint">「进入小程序」→ {{ homeTabText }}</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/settings/wechat')">设置</button>
            </div>
            <div class="eco-row">
              <div class="dist-ic"><MiniIcon name="qr" :size="17" /></div>
              <div class="eco-main">
                <b>小程序码 / 体验版</b>
                <span class="faint">{{ wxStatusText }}</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/page-builder/wx-push')">
                {{ wxUploadAvailable ? '去上传' : '去配置' }}
              </button>
            </div>
            <div class="eco-row">
              <div class="dist-ic"><MiniIcon name="doc" :size="17" /></div>
              <div class="eco-main">
                <b>公众号文章卡片</b>
                <span class="faint">复制页面路径，插入推文</span>
              </div>
              <button type="button" class="btn sm" @click="copyHomePath">复制路径</button>
            </div>
            <div class="eco-row">
              <div class="dist-ic"><MiniIcon name="bell" :size="17" /></div>
              <div class="eco-main">
                <b>服务通知</b>
                <span class="faint">报名成功后推送活动提醒</span>
              </div>
              <button type="button" class="btn sm" @click="router.push('/settings/wechat')">配置</button>
            </div>
          </div>
          <div v-if="!wxUploadAvailable && wxStatusReason" class="note" style="margin-top: 12px">
            {{ wxStatusReason }} 配好 AppID 与上传密钥后，即可在此上传体验版。
          </div>
        </section>
      </div>

      <div class="pub-side">
        <section class="card">
          <div class="head">
            <div>
              <h2 class="h2">发布记录</h2>
              <div class="sub">回滚先变待发布；再点发布后才会改线上，并出现「回滚至第 M 次」记录</div>
            </div>
          </div>
          <div v-if="releases.length" class="tl-stack">
            <div v-for="row in releases" :key="String(row.id)" class="tl">
              <div class="tl-rail">
                <div class="tl-dot" :class="{ on: row.currentLive }" />
                <div class="tl-line" />
              </div>
              <div class="tl-body">
                <div style="display: flex; justify-content: space-between; gap: 8px; align-items: center">
                  <b style="font-size: 13.5px; font-weight: 500">{{ releaseTitle(row) }}</b>
                  <span v-if="row.currentLive" class="tag t-live">线上</span>
                  <button
                    v-else
                    type="button"
                    class="link"
                    style="font-size: 12px"
                    :disabled="!row.hasSnapshot || rollingId === row.id"
                    @click="handleRollback(row)"
                  >
                    回滚到此
                  </button>
                </div>
                <div class="faint">
                  {{ formatTime(row.publishedAt) }}
                  <template v-if="row.publisherName"> · {{ row.publisherName }}</template>
                </div>
                <div v-if="row.note" class="muted" style="font-size: 12.5px; margin-top: 2px">{{ displayNote(row.note) }}</div>
              </div>
            </div>
          </div>
          <div v-else class="empty-mini">
            <span class="muted">还没有发布记录</span>
            <button type="button" class="btn sm" @click="router.push('/mini/pages')">先去改页面</button>
          </div>
        </section>

        <section class="card">
          <button
            type="button"
            class="dev-toggle"
            :aria-expanded="devOpen"
            @click="devOpen = !devOpen"
          >
            <span>
              <b class="h2" style="display: block">微信代码版本</b>
              <span class="sub" style="display: block">开发者选项 · 仅技术更新小程序功能时使用</span>
            </span>
            <MiniIcon :name="devOpen ? 'down' : 'chev'" :size="16" />
          </button>
          <template v-if="devOpen">
            <div class="steps">
              <div><i /><b style="font-size: 12.5px; font-weight: 500">上传代码</b><div class="faint">{{ wechatCodeLabel }}</div></div>
              <div><i /><b style="font-size: 12.5px; font-weight: 500">体验版</b><div class="faint">{{ wxUploadAvailable ? (wechatCodeLabel || '可上传') : '未配置 AppID' }}</div></div>
              <div><i /><b style="font-size: 12.5px; font-weight: 500">提交审核</b><div class="faint">已通过</div></div>
              <div><i /><b style="font-size: 12.5px; font-weight: 500">正式版</b><div class="faint">{{ wechatCodeLabel }} 线上</div></div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap">
              <button type="button" class="btn sm" @click="router.push('/page-builder/wx-push')">
                上传新代码包
              </button>
            </div>
          </template>
          <div class="note ok" style="margin-top: 14px">正式版运行正常。内容发布不需要动这里。</div>
        </section>
      </div>
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="draft"
      title="扫码预览"
      hint="手机浏览器打开当前「待发布草稿」的 H5 预览（不是微信体验版）。微信体验版需先在「上传代码包」配置 AppID/密钥并上传。"
    />
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
  previewMiniRollback,
  publishMiniSite,
  type MiniContentReleaseVO,
  type MiniSiteVO,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPublishPreflight, getPushPreviewStatus, type PublishPreflight } from '@/api/version'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'

defineOptions({ name: 'MiniPublish' })

const router = useRouter()
const route = useRoute()
const loading = ref(false)
const loaded = ref(false)
const publishing = ref(false)
const rollingId = ref<number | null>(null)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const selectedKeys = ref<Set<string>>(new Set())
const releases = ref<MiniContentReleaseVO[]>([])
const publishNote = ref('')
const devOpen = ref(false)
const wechatCodeLabel = ref('1.30.8')
const qrVisible = ref(false)
const wxUploadAvailable = ref(false)
const wxStatusReason = ref('')
const wxStatusText = ref('检测微信上传能力中…')

const preflight = ref<PublishPreflight | null>(null)
const preflightLoading = ref(false)
const preflightError = ref('')

const highlightPageId = computed(() => {
  const raw = route.query.pageId
  return raw != null && String(raw) !== '' ? String(raw) : ''
})

const homeTabText = computed(() => {
  const tabs = site.value.tabBar || []
  return tabs[0]?.text || '首页'
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

function kindLabel(item: PendingChangeItem) {
  const t = String((item as any).changeKind || (item as any).kind || item.type || '')
  if (t.includes('new') || t === 'create' || t.includes('新增')) return '新增'
  if (t.includes('offline') || t.includes('下线')) return '下线'
  if (item.type === 'site') return '修改'
  return '修改'
}

function kindTagClass(item: PendingChangeItem) {
  const k = kindLabel(item)
  if (k === '新增') return 't-new'
  if (k === '下线') return 't-draft'
  return 't-pending'
}

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

function syncSelection() {
  selectedKeys.value = new Set(pending.value.map(itemKey))
}

function formatTime(t?: string | null) {
  return t ? String(t).replace('T', ' ').slice(0, 19) : ''
}

function releaseTitle(row: MiniContentReleaseVO) {
  if (row.rollback && row.rollbackToReleaseNo != null) {
    return `第 ${row.releaseNo} 次 · 回滚至第 ${row.rollbackToReleaseNo} 次`
  }
  return `第 ${row.releaseNo} 次发布`
}

function displayNote(note?: string | null) {
  if (!note) return ''
  return String(note).replace(/\s*\(releaseNo=\d+\)/g, '').trim()
}

function openPreview() {
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query: { view: 'config', source: 'draft' } })
  window.open(href, '_blank', 'noopener,noreferrer')
}

function openPreviewQr() {
  qrVisible.value = true
}

async function loadWxPushStatus() {
  try {
    const res = await getPushPreviewStatus()
    const data = (res as any)?.data ?? res ?? {}
    wxUploadAvailable.value = data.uploadAvailable === true || data.available === true
    wxStatusReason.value = String(data.capabilityReason || data.reason || '')
    if (wxUploadAvailable.value) {
      wxStatusText.value = data.lastVersion
        ? `可上传体验版 · 最近 ${data.lastVersion}`
        : '已配置，可上传体验版代码'
      if (data.lastVersion) wechatCodeLabel.value = String(data.lastVersion)
    } else {
      wxStatusText.value = wxStatusReason.value || '尚未配置 AppID / 上传密钥'
    }
  } catch {
    wxUploadAvailable.value = false
    wxStatusText.value = '尚未配置或接口不可用'
    wxStatusReason.value = '请到「上传代码包」页填写微信 AppID 与密钥路径'
  }
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
  if (publishing.value) return
  if (hasBlocking.value) {
    ElMessage.warning('请先处理阻断项')
    return
  }
  if (publishDisabled.value) return
  publishing.value = true
  const clientRequestId = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  try {
    const pageIds = pending.value
      .filter((item) => isSelected(item) && item.pageId != null && item.pageId !== '')
      .map((item) => Number(item.pageId))
      .filter((id) => Number.isFinite(id) && id > 0)
    const hasSitePending = pending.value.some((item) => item.type === 'site')
    // 仅当勾选了站点改动时才提升站点草稿，避免空草稿误触发「空页发布」
    const includeSite = hasSitePending
      ? pending.value.some((item) => item.type === 'site' && isSelected(item))
      : false
    if (!includeSite && pageIds.length === 0) {
      ElMessage.warning('请至少勾选一项改动')
      return
    }
    const result = await publishMiniSite({
      pageId: highlightPageId.value || undefined,
      pageIds,
      includeSite,
      notes: publishNote.value.trim() || undefined,
      clientRequestId,
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
  if (rollingId.value != null) return
  rollingId.value = Number(row.id)
  try {
    const preview = await previewMiniRollback(row.id)
    const restoreNames = (preview.restorePageNames || []).slice(0, 8)
    const pendingLines = (preview.currentPendingSummaries || []).slice(0, 6)
    const lines = [
      `将第 ${row.releaseNo} 次的内容还原为「待发布」草稿（不会立刻改线上）。`,
      '',
      restoreNames.length
        ? `会恢复的页面（${preview.restorePageNames?.length || restoreNames.length}）：${restoreNames.join('、')}${(preview.restorePageNames?.length || 0) > 8 ? ' 等' : ''}`
        : '快照中未解析到页面名。',
      preview.hasSiteConfig ? '同时恢复站点 / 导航配置草稿。' : '',
      pendingLines.length
        ? `当前未发布改动（${preview.currentPendingCount || pendingLines.length} 项）将被回滚草稿覆盖：\n· ${pendingLines.join('\n· ')}`
        : '当前没有未发布改动。',
      '',
      `确认后请再到本页点「发布」，线上才会变成「回滚至第 ${row.releaseNo} 次」。`,
    ].filter(Boolean)

    await ElMessageBox.confirm(lines.join('\n'), '回滚到此版本', {
      type: 'warning',
      confirmButtonText: '还原为待发布',
      cancelButtonText: '取消',
      customClass: 'mini-rollback-confirm',
    })
    const result = await prepareMiniRollback(row.id)
    ElMessage.success(result.message || '已生成待发布改动')
    await load()
  } catch (e: any) {
    if (e === 'cancel' || e?.action === 'cancel') return
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
    wechatCodeLabel.value = String(s.wechatCodeVersion || wechatCodeLabel.value || '1.30.8')
    pending.value = p.items || []
    releases.value = r || []
    syncSelection()
    await Promise.all([loadPreflight(), loadWxPushStatus()])
  } catch (e: any) {
    ElMessage.error(e?.message || '加载失败')
  } finally {
    loading.value = false
    loaded.value = true
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
  background: var(--gs);
  &.is-blocked { background: var(--rs); }
  &.is-ok { background: var(--gs); }
}
.chk {
  display: flex;
  gap: 8px;
  font-size: 13px;
  align-items: flex-start;
  line-height: 1.5;
  &--ok { color: var(--g); }
  &--warn { color: var(--a); }
  &--err { color: var(--r); font-weight: 500; }
  &--muted { color: var(--mute); }
}
.chk__ic {
  display: inline-flex;
  margin-top: 2px;
  flex-shrink: 0;
}
.dev-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  border: 0;
  background: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
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
.empty-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  flex-wrap: wrap;
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
