<template>
  <div class="mini-wb mw-page overview" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner
          variant="overview"
          :live-release-no="site.liveReleaseNo"
          :live-release-at="site.liveReleaseAt ? formatShort(site.liveReleaseAt) : null"
          :publisher-name="site.livePublisherName"
          :pending-count="Number(site.pendingCount ?? pending.length ?? 0)"
        />
        <div>
          <h1 class="h1">概览</h1>
          <div class="sub">只看状态，不做配置；改导航与配色请去「外观」</div>
        </div>

        <div class="ways">
          <button type="button" class="way hi" @click="editHomePage">
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
          <button type="button" class="way" @click="goPublish">
            <MiniIcon name="send" :size="20" />
            <span>
              <b>发布</b>
              <span class="muted" style="font-size: 12.5px">确认待发布改动并上线</span>
            </span>
          </button>
        </div>

        <section class="card status-card">
          <h2 class="h2">线上状态</h2>
          <div class="kv">
            <span class="muted">版本</span>
            <b>第 {{ site.liveReleaseNo ?? '—' }} 次发布</b>
          </div>
          <div class="kv">
            <span class="muted">时间</span>
            <b>{{ site.liveReleaseAt ? formatShort(site.liveReleaseAt) : '尚未发布' }}</b>
          </div>
          <div class="kv">
            <span class="muted">发布人</span>
            <b>{{ site.livePublisherName || '—' }}</b>
          </div>
          <div class="kv">
            <span class="muted">整店模板</span>
            <b>{{ templateLabel }}</b>
          </div>
          <div class="kv">
            <span class="muted">待发布</span>
            <b>{{ pendingCountText }}</b>
          </div>
          <button type="button" class="link" style="margin-top: 8px" @click="router.push('/mini/appearance')">
            外观设置（导航 / 配色）›
          </button>
        </section>

        <div class="row lower-row">
          <section class="card pending-card">
            <div class="head">
              <div>
                <h2 class="h2">待发布的改动</h2>
                <div class="sub">{{ pendingCountText }}，发布后用户刷新即可看到</div>
              </div>
              <div class="actions">
                <button type="button" class="link" @click="goPublish">去发布 ›</button>
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
                <span class="muted">没有待发布的改动，线上就是你现在看到的样子。</span>
                <button type="button" class="btn sm" @click="router.push('/mini/pages')">
                  去改页面
                </button>
              </div>
            </div>
          </section>

          <section class="card eco-card">
            <h2 class="h2">微信生态</h2>
            <div class="sub">小程序正式版与分发渠道</div>
            <div style="margin-top: 10px">
              <div class="kv">
                <span class="muted">正式版</span>
                <b style="font-weight: 500">代码 {{ wechatCodeLabel }} · 无需操作</b>
              </div>
              <div class="kv">
                <span class="muted">公众号菜单</span>
                <b style="font-weight: 500">
                  <template v-if="mpMenuConfigured">已绑定 → {{ homeTabText }}</template>
                  <template v-else>去配置</template>
                </b>
              </div>
              <div class="kv">
                <span class="muted">小程序码</span>
                <b style="font-weight: 500">{{ qrCodeLabel }}</b>
              </div>
            </div>
            <button type="button" class="link" style="font-size: 13px; margin-top: 8px" @click="goPublish">
              管理分发 ›
            </button>
          </section>
        </div>
      </div>

      <aside class="preview">
        <div class="preview-head">
          <b>真机预览</b>
          <div class="seg" role="group" aria-label="预览版本">
            <button type="button" :class="{ on: previewSource === 'draft' }" @click="previewSource = 'draft'">
              改动后
            </button>
            <button type="button" :class="{ on: previewSource === 'live' }" @click="previewSource = 'live'">
              线上
            </button>
          </div>
        </div>
        <p class="faint" style="margin: 0 0 8px; font-size: 12px; line-height: 1.45">
          {{ previewSource === 'live' ? '看用户此刻看到的线上版' : '看待发布草稿（未点发布前用户看不到）' }}
        </p>
        <div class="phone">
          <iframe :key="previewKey" :src="previewUrl" title="小程序预览" loading="lazy" />
        </div>
        <button type="button" class="btn sm" @click="qrVisible = true">
          <MiniIcon name="qr" :size="15" />
          扫码在手机上看
        </button>
      </aside>
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      :mode="previewSource === 'live' ? 'live' : 'draft'"
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
import {
  getMiniSite,
  getPendingChanges,
  type MiniSiteVO,
  type PendingChangeItem,
} from '@/api/miniSite'
import { getPageList } from '@/api/page'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { refreshMiniPending } from '@/composables/useMiniPending'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const router = useRouter()
const loading = ref(false)
/** 首屏用骨架屏，之后的刷新才用遮罩，避免每次操作都闪灰屏 */
const loaded = ref(false)
const site = ref<MiniSiteVO>({})
const pending = ref<PendingChangeItem[]>([])
const previewSource = ref<'draft' | 'live'>('draft')
const qrVisible = ref(false)
const pageOptions = ref<PageRow[]>([])
const wechatVerFallback = ref('')
const mpMenuConfigured = ref(false)

const templateLabel = computed(() => site.value.templateName || '自定义模板')
const tabBar = computed(() => site.value.tabBar || [])
const pendingPreview = computed(() => pending.value.slice(0, 5))
const pendingCountText = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  return n > 0 ? `${n} 项` : '0 项'
})
const wechatCodeLabel = computed(
  () => site.value.wechatCodeVersion || wechatVerFallback.value || '—',
)
const homeTabText = computed(() => (site.value.tabBar || [])[0]?.text || '首页')
const boundPageCount = computed(
  () => (site.value.tabBar || []).filter((t) => t.pageId || t.pagePath).length,
)
const qrCodeLabel = computed(() =>
  boundPageCount.value > 0 ? `${boundPageCount.value} 个页面已生成` : '去生成',
)

const previewUrl = computed(() => {
  const source = previewSource.value === 'live' ? 'live' : 'draft'
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  const { href } = router.resolve({ path: '/h5/miniapp-preview', query })
  return href
})

const previewKey = computed(() => previewSource.value)

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

function goPublish() {
  router.push('/mini/publish')
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

async function load() {
  loading.value = true
  try {
    const [s, p, pageRes, latestRes, cfgRes] = await Promise.all([
      getMiniSite('draft'),
      getPendingChanges(),
      getPageList({ current: 1, size: 100 }),
      getLatestRelease().catch(() => null),
      getConfigByGroupSilent('basic').catch(() => null),
    ])
    site.value = s
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
  grid-template-columns: minmax(0, 1fr) 300px;
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

.lower-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.pending-card {
  flex: 1.3;
  min-width: 280px;
}

.eco-card {
  flex: 1;
  min-width: 240px;
}

.preview {
  position: sticky;
  top: 84px;
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.preview-head {
  display: flex;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.phone {
  width: 250px;
  height: 540px;
  border: 9px solid #1e1611;
  border-radius: 34px;
  background: #fffbf6;
  overflow: hidden;
  flex-shrink: 0;
  max-width: 100%;

  iframe {
    width: 100%;
    height: 100%;
    border: 0;
    background: #fffbf6;
    display: block;
  }
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

@media (max-width: 1100px) {
  .ov {
    grid-template-columns: minmax(0, 1fr);
  }
  .preview {
    position: static;
    max-width: 300px;
  }
  .tabs-edit {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
