<template>
  <div class="mini-wb mw-page overview" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner
          variant="overview"
          :live-release-no="site.liveReleaseNo"
          :live-release-at="site.liveReleaseAt ? formatShort(site.liveReleaseAt) : null"
          :publisher-name="publisherDisplay"
          :pending-count="Number(site.pendingCount ?? pending.length ?? 0)"
        />
        <div>
          <h1 class="h1">概览</h1>
          <div class="sub">只看状态，不做配置；改导航与配色请去「外观」</div>
        </div>

        <div class="ways">
          <button type="button" class="way way-em" @click="editHomePage">
            <MiniIcon name="page" :size="20" />
            <span>
              <b>改首页</b>
              <span class="muted" style="font-size: 12.5px">进入底部导航绑定的首页装修</span>
            </span>
          </button>
          <button type="button" class="way" @click="router.push('/mini/pages/new-ai')">
            <MiniIcon name="spark" :size="20" />
            <span>
              <b>新建活动页</b>
              <span class="muted" style="font-size: 12.5px">AI 或模板生成，再发布上线</span>
            </span>
          </button>
          <button type="button" class="way" @click="router.push('/mini/appearance')">
            <MiniIcon name="send" :size="20" />
            <span>
              <b>外观与导航</b>
              <span class="muted" style="font-size: 12.5px">保存草稿后点「保存并同步」</span>
            </span>
          </button>
        </div>

        <section class="card status-card">
          <h2 class="h2">线上状态</h2>
          <div class="kv">
            <span class="muted">内容配置版本</span>
            <b>{{ site.liveReleaseNo != null ? `第 ${site.liveReleaseNo} 次同步` : '尚未同步' }}</b>
          </div>
          <div class="kv">
            <span class="muted">微信代码包</span>
            <b>{{ wechatCodeDisplay }}</b>
          </div>
          <div class="kv">
            <span class="muted">时间</span>
            <b>{{ site.liveReleaseAt ? formatShort(site.liveReleaseAt) : '尚未发布' }}</b>
          </div>
          <div class="kv">
            <span class="muted">发布人</span>
            <b>{{ publisherDisplay || '—' }}</b>
          </div>
          <div class="kv">
            <span class="muted">整店模板</span>
            <b>{{ templateLabel }}</b>
          </div>
          <div class="kv">
            <span class="muted">未同步</span>
            <b>{{ pendingCountText }}</b>
          </div>
          <button type="button" class="link" style="margin-top: 8px" @click="router.push('/mini/appearance')">
            外观设置（导航 / 配色）›
          </button>
        </section>

        <section class="card visit-card">
          <h2 class="h2">近 7 日访问</h2>
          <div class="sub">来自小程序 page-access 上报；无数据说明近期还没有有效访问记录</div>
          <div v-if="visitTop.length" style="margin-top: 10px">
            <div v-for="v in visitTop" :key="v.pagePath" class="list-row">
              <span class="faint" style="flex: 1; overflow: hidden; text-overflow: ellipsis">{{ v.pagePath }}</span>
              <b>{{ v.accessCount ?? 0 }} 次</b>
              <span class="faint">{{ v.visitorCount ?? 0 }} 人</span>
            </div>
          </div>
          <div v-else class="faint" style="margin-top: 12px">还没有近 7 日的页面上报数据</div>
        </section>

        <div class="row lower-row">
          <section class="card pending-card">
            <div class="head">
              <div>
                <h2 class="h2">尚未同步的改动</h2>
                <div class="sub">{{ pendingCountText }}；须点「保存并同步」经校验后写入服务端（不表示所有用户已刷新小程序）</div>
              </div>
              <div class="actions">
                <button
                  type="button"
                  class="btn sm primary"
                  :disabled="!(site.pendingCount ?? pending.length)"
                  :loading="syncing"
                  @click="syncPending"
                >
                  保存并同步
                </button>
                <button type="button" class="link" @click="router.push('/mini/appearance')">去外观 ›</button>
              </div>
            </div>
            <div style="margin-top: 6px">
              <div v-if="pendingPreview.length">
                <div
                  v-for="item in pendingPreview"
                  :key="String(item.id || item.pageId || item.name)"
                  class="list-row"
                >
                  <span :class="['tag', changeKindLabel(item) === '新增' ? 't-new' : 't-pending']">
                    {{ changeKindLabel(item) }}
                  </span>
                  <b style="font-weight: 500">{{ item.name || '未命名' }}</b>
                  <span class="faint" style="margin-left: auto; text-align: right">
                    {{ item.summary || pendingTime(item) }}
                  </span>
                </div>
              </div>
              <div v-else class="empty-mini">
                <span class="muted">草稿与线上配置一致。</span>
                <button type="button" class="btn sm" @click="router.push('/mini/pages')">
                  去改页面
                </button>
              </div>
            </div>
          </section>

          <section class="card eco-card">
            <h2 class="h2">代码与渠道（参考）</h2>
            <div class="sub">代码包在本机微信开发者工具上传；此处不触发上传或审核</div>
            <div style="margin-top: 10px">
              <div class="kv">
                <span class="muted">代码版本记录</span>
                <b style="font-weight: 500">{{ wechatCodeDisplay }}</b>
              </div>
              <div class="kv">
                <span class="muted">公众号菜单</span>
                <b style="font-weight: 500">
                  <template v-if="mpMenuConfigured">已配置 AppID 等</template>
                  <template v-else>未配置</template>
                </b>
              </div>
            </div>
            <p class="faint" style="margin: 10px 0 0; font-size: 12px; line-height: 1.5">
              需要记录本地上传说明时，见
              <button type="button" class="link" @click="router.push('/page-builder/wx-push')">开发者 · 代码版本说明</button>
              （非日常运营入口）。
            </p>
          </section>
        </div>
      </div>

      <DevicePreview
        :hint="previewHintLine"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :initial-mode="previewInitialMode"
        :show-mode-switch="hasPending"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="miniapp-draft"
      title="扫码在手机上看"
    />

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import {
  getMiniSite,
  getPendingChanges,
  type MiniSiteVO,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPageList } from '@/api/page'
import { getPageAccess } from '@/api/statistics'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { useMiniConfigSync } from '@/composables/useMiniConfigSync'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const router = useRouter()
const { syncing, syncToLive } = useMiniConfigSync()
const loading = ref(false)
/** 首屏用骨架屏，之后的刷新才用遮罩，避免每次操作都闪灰屏 */
const loaded = ref(false)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const previewRevision = ref(0)
const qrVisible = ref(false)
const visitTop = ref<{ pagePath: string; accessCount?: number; visitorCount?: number }[]>([])
const pageOptions = ref<PageRow[]>([])
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

function formatPublisherName(raw?: string | null) {
  if (!raw) return ''
  const s = String(raw).trim()
  if (!s) return ''
  if (/^\d+$/.test(s)) return ''
  if (/^用户#\d+$/.test(s)) return ''
  return s
}

const publisherDisplay = computed(() => formatPublisherName(site.value.livePublisherName))

const templateLabel = computed(() => site.value.templateName || '自定义模板')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))
const pendingCountText = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  return n > 0 ? `${n} 项` : '0 项'
})
const wechatCodeDisplay = computed(() => {
  if (site.value.wechatCodeVersion) {
    return `${site.value.wechatCodeVersion}（后台人工/平台记录）`
  }
  if (wechatVerFallback.value) {
    return `${wechatVerFallback.value}（平台构建记录，非微信官方回执）`
  }
  return '未记录 · 请在本地上传后自行标注'
})

function buildPreviewHref(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  const firstPath = String((site.value.tabBar || [])[0]?.pagePath || '').replace(/^\//, '')
  if (firstPath) query.screen = firstPath
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildPreviewHref('draft'))
const previewUrlLive = computed(() => buildPreviewHref('live'))
const hasPending = computed(
  () => Number(site.value.pendingCount ?? pending.value.length ?? 0) > 0,
)
const previewInitialMode = computed<'draft' | 'live'>(() =>
  hasPending.value ? 'draft' : 'live',
)

const previewKey = computed(() => `${previewInitialMode.value}-${previewRevision.value}`)

const previewHintLine = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  const live = site.value.liveReleaseNo
  if (n > 0) {
    return `尚有 ${n} 项未同步 · 右侧为草稿预览（线上配置版本 ${live ?? '—'}）`
  }
  return live != null
    ? `线上配置版本 ${live} · H5 模拟预览，真机效果以扫码为准`
    : 'H5 模拟预览，真机效果以扫码为准'
})

async function syncPending() {
  const ok = await syncToLive({ includeSite: true })
  if (ok) await load()
}

function formatShort(t?: string | null) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s.slice(0, 16)
}

function pendingTime(item: PendingChangeItem) {
  const raw = (item as any).updatedAt || (item as any).updateTime || (item as any).createdAt
  if (!raw) return ''
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return ''
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return formatShort(String(raw))
}

function changeKindLabel(item: PendingChangeItem) {
  if (item.type === 'site') return '修改'
  const st = String(item.status || '')
  if (st === 'draft' || /尚未|新增|新建/.test(String(item.summary || ''))) return '新增'
  return '修改'
}


function editHomePage() {
  const homeId = Number(site.value.miniappHomePageId || 0)
  const tab0 = (site.value.tabBar || [])[0]
  const fromTab = tab0?.pageId != null ? Number(tab0.pageId) : 0
  const id = homeId || fromTab
  if (!id) {
    ElMessage.warning('请先在「外观」里为底部导航绑定首页')
    router.push('/mini/appearance')
    return
  }
  router.push(`/mini/pages/${id}/editor`)
}

function last7DayRange() {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return {
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  }
}

async function loadVisitTop() {
  try {
    const range = last7DayRange()
    const res = await getPageAccess(range.start_date, range.end_date)
    const rows = (res.data || []) as { pagePath: string; accessCount?: number; visitorCount?: number }[]
    visitTop.value = [...rows]
      .sort((a, b) => Number(b.accessCount || 0) - Number(a.accessCount || 0))
      .slice(0, 8)
  } catch {
    visitTop.value = []
  }
}

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes, latestRes, cfgRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 100 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
      loadVisitTop(),
    ])
    site.value = s
    previewRevision.value += 1
    pending.value = p.items || []
    const data = (pageRes as { data?: { records?: PageRow[]; list?: PageRow[] } })?.data
    pageOptions.value = (data?.records || data?.list || []) as PageRow[]
    const pendingTotal =
      (p as { pendingCount?: number; total?: number }).pendingCount
      ?? (p as { total?: number }).total
      ?? pending.value.length
    if (s.pendingCount == null) {
      site.value = { ...s, pendingCount: pendingTotal }
    }
    const latest = (latestRes as { data?: { semver?: string; version?: string } })?.data
    wechatVerFallback.value = String(latest?.semver || latest?.version || '')
    try {
      const configs = (cfgRes as any)?.data?.configs || (cfgRes as any)?.data || []
      const map = Array.isArray(configs)
        ? Object.fromEntries(configs.map((c: any) => [c.configKey || c.key, c.configValue ?? c.value]))
        : {}
      mpMenuConfigured.value = !!(
        map.mp_app_id
        || map.mpAppId
        || map.wechat_mp_appid
        || map.officialAccountAppId
        || map.mp_menu
        || map.mpMenu
      )
    } catch {
      mpMenuConfigured.value = false
    }
    void refreshMiniPending(true)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '加载概览失败')
  } finally {
    loading.value = false
    loaded.value = true
  }
}

onMounted(load)
</script>

<style scoped lang="scss">
/* 对照 docs/prototypes/暖阁小程序搭建原型.html · vOverview */
.overview.mw-page {
  max-width: none;
  margin: 0;
  padding: 24px 28px 48px;
  gap: 18px;
}

.ov {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}

.ov-main {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}

.ov-meta {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: center;
}

.tabs-edit-inner {
  display: contents;
}

.tabs-edit {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
}

.tabcard-top {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.tab-drag {
  cursor: grab;
  user-select: none;
  display: inline-flex;
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line2);
  &:last-child { border-bottom: 0; }
}

.kv {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  padding: 6px 0;
}

.ways .way span .muted {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ways .way-em :deep(svg),
.ways .way-em b {
  color: var(--acc);
}

.lower-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pending-card,
.eco-card {
  width: 100%;
  min-width: 0;
}

.visit-card {
  margin-bottom: 0;
}

.theme-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line2);
  flex-wrap: wrap;
  .btn, .link { margin-left: auto; }
  .btn + .btn, .btn + .link { margin-left: 0; }
}

.empty-mini {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  flex-wrap: wrap;
}

@media (max-width: 899px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 1179px) {
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
