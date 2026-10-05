<template>
  <div class="mini-wb mw-page overview" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner
          variant="overview"
          :live-release-no="site.liveReleaseNo"
          :live-semver="build.facts.value.liveSemver"
          :live-release-at="site.liveReleaseAt ? formatShort(site.liveReleaseAt) : null"
          :publisher-name="publisherDisplay"
          :pending-count="Number(site.pendingCount ?? pending.length ?? 0)"
        />
        <div class="head ov-head">
          <div>
            <h1 class="h1">搭建工作台</h1>
            <div class="sub">
              {{ envLabel }} · {{ healthLabel }}
              <span v-if="build.summary.value.done < build.summary.value.total">
                · 搭建完成 {{ build.summary.value.done }}/{{ build.summary.value.total }} 个环节
              </span>
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="router.push('/mini/pages')">
              <MiniIcon name="page" :size="15" />
              页面
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/appearance?tab=brand')">
              <MiniIcon name="palette" :size="15" />
              品牌
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/templates')">
              <MiniIcon name="grid" :size="15" />
              模板
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/pages/new-ai')">
              <MiniIcon name="spark" :size="15" />
              新建活动页
            </button>
          </div>
        </div>

        <!--
          搭建工作流：7 个环节的完成状态。
          状态由 useBuildWorkbench 统一算出（真实配置 + preflight），
          本页不自己另判一套，避免和各配置页口径漂移。
        -->
        <section class="card build-card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">搭建环节</h2>
              <div class="sub">
                {{
                  build.summary.value.isFirstRun
                    ? '首次搭建：按顺序走完这 7 个环节，小程序就能上线了'
                    : '日常维护：任何环节都可以直接进入，不必按顺序'
                }}
              </div>
            </div>
            <div class="build-sum">
              <span class="tag" :class="build.summary.value.blockingCount ? 't-err' : 't-live'">
                {{ build.summary.value.blockingCount ? `${build.summary.value.blockingCount} 个阻断项` : '无阻断项' }}
              </span>
              <span v-if="build.summary.value.done" class="tag t-live">{{ build.summary.value.done }} 个已完成</span>
              <span v-if="build.summary.value.partial" class="tag t-pending">{{ build.summary.value.partial }} 个待完善</span>
              <span v-if="build.summary.value.todo" class="tag t-slot">{{ build.summary.value.todo }} 个未开始</span>
            </div>
          </div>

          <!-- 首次搭建：给出明确的下一步引导 -->
          <div v-if="build.summary.value.isFirstRun && build.summary.value.next" class="next-card">
            <div class="next-body">
              <span class="next-label">建议下一步</span>
              <strong>{{ build.summary.value.next.order }}. {{ build.summary.value.next.title }}</strong>
              <span class="faint">{{ build.summary.value.next.summary }}</span>
            </div>
            <button
              v-if="build.summary.value.next"
              type="button"
              class="btn primary"
              @click="goStage(build.summary.value.next)"
            >
              {{ build.summary.value.next.entry.label }}
            </button>
          </div>

          <!-- 阻断项速览：工作台最该先告诉用户的东西 -->
          <ul v-if="build.summary.value.blockingIssues.length" class="build-blocking">
            <li v-for="(b, i) in build.summary.value.blockingIssues.slice(0, 4)" :key="i">
              <MiniIcon name="x" :size="12" />
              <span class="bb-text">{{ b.text }}</span>
              <button
                v-if="b.action"
                type="button"
                class="link"
                @click="b.action.to && router.push(b.action.to)"
              >{{ b.action.label }}</button>
            </li>
          </ul>

          <div class="stage-grid">
            <article
              v-for="s in build.stages.value"
              :key="s.key"
              class="stage-card"
              :class="[`st-${s.status}`, { 'st-next': build.summary.value.next?.key === s.key }]"
            >
              <header class="stage-head">
                <span class="stage-no">{{ s.order }}</span>
                <div class="stage-title">
                  <b>{{ s.title }}</b>
                  <span class="faint">{{ s.summary }}</span>
                </div>
                <span class="tag" :class="stageTagClass(s.status)">{{ statusLabel(s.status) }}</span>
              </header>

              <ul v-if="s.doneItems.length" class="stage-done">
                <li v-for="(d, i) in s.doneItems.slice(0, 3)" :key="i">
                  <MiniIcon name="check" :size="11" />{{ d }}
                </li>
                <li v-if="s.doneItems.length > 3" class="faint stage-more">
                  另有 {{ s.doneItems.length - 3 }} 项已完成
                </li>
              </ul>

              <ul v-if="s.issues.length" class="stage-issues">
                <li v-for="(is, i) in s.issues.slice(0, 2)" :key="i" :class="`si-${is.level}`">
                  <MiniIcon :name="is.level === 'blocking' ? 'x' : 'warn'" :size="11" />
                  <span>{{ is.text }}</span>
                </li>
                <li v-if="s.issues.length > 2" class="faint stage-more">
                  另有 {{ s.issues.length - 2 }} 项问题
                </li>
              </ul>

              <footer class="stage-foot">
                <button
                  type="button"
                  class="btn sm"
                  :class="build.summary.value.next?.key === s.key ? 'primary' : 'soft'"
                  @click="goStage(s)"
                >
                  {{ s.entry.label }}
                </button>
              </footer>
            </article>
          </div>

          <!-- 状态依据：不让「已完成」三个字无从核对 -->
          <details v-if="expandEvidence" class="build-evidence">
            <summary>每项状态的判定依据</summary>
            <div v-for="s in build.stages.value" :key="s.key" class="ev-row">
              <b>{{ s.title }}</b>
              <ul><li v-for="(e, i) in s.evidence" :key="i" class="faint">{{ e }}</li></ul>
            </div>
          </details>
          <button type="button" class="link ev-toggle" @click="expandEvidence = !expandEvidence">
            {{ expandEvidence ? '收起判定依据' : '查看判定依据（这些状态怎么算出来的）' }}
          </button>
        </section>

        <!-- 待同步改动置顶：这是本模块唯一的发布决策入口 -->
        <section class="card pending-card pending-card--top">
          <div class="head">
            <div>
              <h2 class="h2">待发布改动</h2>
              <div class="sub">{{ pendingCountText }}；点任一项可在右侧预览该页草稿</div>
            </div>
            <div class="actions">
              <button
                type="button"
                class="btn sm primary"
                :disabled="!(site.pendingCount ?? pending.length)"
                @click="router.push('/mini/releases')"
              >
                去发布配置
              </button>
            </div>
          </div>
          <div v-if="pendingPreview.length" class="pending-list">
            <button
              v-for="item in pendingPreview"
              :key="String(item.id || item.pageId || item.name)"
              type="button"
              class="list-row list-row--btn"
              @click="focusPendingOnPage(item)"
            >
              <span :class="['tag', changeKindLabel(item) === '新增' ? 't-new' : 't-pending']">
                {{ changeKindLabel(item) }}
              </span>
              <b style="font-weight: 500">{{ item.name || '未命名' }}</b>
              <span class="faint pending-row__meta">
                {{ pendingEditor(item) }} · {{ pendingTime(item) }}
              </span>
              <span class="faint pending-row__go">预览 ›</span>
            </button>
            <div v-if="pending.length > pendingPreview.length" class="faint" style="margin-top: 8px; font-size: 12px">
              另有 {{ pending.length - pendingPreview.length }} 项，去「发布与版本」可查看完整清单并选择发布
            </div>
          </div>
          <div v-else class="empty-mini">
            <span class="muted">草稿与线上配置一致，没有待发布的改动。</span>
            <button type="button" class="btn sm" @click="router.push('/mini/pages')">去改页面</button>
          </div>
        </section>

        <section class="card status-card">
          <h2 class="h2">线上运行状态</h2>
          <div class="kv">
            <span class="muted">内容配置版本</span>
            <b>{{ site.liveReleaseNo != null ? `第 ${site.liveReleaseNo} 次同步` : '尚未同步' }}</b>
          </div>
          <div class="kv">
            <span class="muted">微信代码包</span>
            <b>{{ wechatCodeDisplay }}</b>
          </div>
          <div class="kv">
            <span class="muted">审核状态</span>
            <b>{{ reviewStatusLabel }}</b>
          </div>
          <div class="kv">
            <span class="muted">发布时间</span>
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
        </section>

        <section class="card visit-card">
          <div class="head">
            <div>
              <h2 class="h2">近 7 日运行指标</h2>
              <div class="sub">来自小程序端上报；未上报的指标显示「待埋点」而不是 0，避免把没数据误读成零故障</div>
            </div>
          </div>
          <div class="metric-grid">
            <div class="metric" v-for="m in healthMetrics" :key="m.key">
              <span class="metric__label">{{ m.label }}</span>
              <span class="metric__value" :class="{ 'metric__value--na': m.na }">{{ m.value }}</span>
              <span class="metric__hint">{{ m.hint }}</span>
            </div>
          </div>
          <div v-if="visitTop.length" class="visit-list">
            <h3 class="h3">页面访问明细</h3>
            <div v-for="v in visitTop" :key="v.pagePath" class="list-row">
              <span class="faint" style="flex: 1; overflow: hidden; text-overflow: ellipsis">{{ v.pagePath }}</span>
              <b>{{ v.accessCount ?? 0 }} 次</b>
              <span class="faint">{{ v.visitorCount ?? 0 }} 人</span>
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

      <DevicePreview
        :hint="previewHintLine"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :initial-mode="previewInitialMode"
        :show-mode-switch="hasPending"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      >
        <template #screen-picker>
          <el-select
            v-if="previewTargets.length"
            :model-value="previewScreen"
            class="screen-picker"
            placeholder="选择预览页面"
            size="small"
            filterable
            @change="(v: string) => onPreviewScreenChange(String(v))"
          >
            <el-option-group
              v-for="g in screenGroups"
              :key="g.key"
              :label="g.label"
            >
              <el-option
                v-for="t in g.items"
                :key="t.path"
                :label="t.label"
                :value="t.path"
              />
            </el-option-group>
          </el-select>
        </template>
      </DevicePreview>
    </div>

    <MiniH5QrDialog
      v-model="qrVisible"
      mode="miniapp-draft"
      title="扫码在手机上看"
      hint="扫码打开的是 H5 模拟预览（草稿口径）。真机效果请在微信开发者工具上传体验版后查看。"
    />

    <!--
      2026-10-05 卸载 DiffPublishDrawer。
      它内部能直接调 publishMiniSite（DiffPublishDrawer.vue:265），是第二个发布出口。
      工作台已有「去发布配置」跳 /mini/publish（带预检、勾选、版本快照），
      两个都能上线的按钮会让用户再次陷入「不知道点哪个会生效」——
      正是本次改造要消灭的问题。组件文件保留，其它调用方不受影响。
    -->
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
import { getPageAccess, getRuntimeHealth, type RuntimeHealth } from '@/api/statistics'
import { getLatestRelease } from '@/api/version'
import { getConfigByGroupSilent } from '@/api/system'
import { refreshMiniPending } from '@/composables/useMiniPending'
import { useBuildWorkbench, stageTagClass, type StageStatus } from '@/composables/useBuildWorkbench'
import type { PageRecord as PageRow } from '@/types/page'

defineOptions({ name: 'MiniOverview' })

const router = useRouter()
// 2026-10-05：原用 useMiniConfigSync 做「一键同步到线上」，
// 现发布路径统一收口到 /mini/publish（预检 + 勾选 + 版本快照），
// 本页不再持有 syncing/syncToLive，避免出现第二个发布出口。
// 🔴 DiffPublishDrawer 同样能直接调 publishMiniSite（组件内 :265），
// 它是「第二个发布出口」。工作台不再挂载它——发布统一去 /mini/publish，
// 否则用户会面对两个都能上线的按钮，又回到「不知道哪个生效」的老问题。

/**
 * 搭建环节状态：与各配置页共用同一份判定（useBuildWorkbench）。
 * 本页不自己再算一遍完成度，避免「工作台说完成、配置页说没配」这种自相矛盾。
 */
const build = useBuildWorkbench()
const expandEvidence = ref(false)

function statusLabel(s: StageStatus) {
  return build.statusLabel(s)
}

/** 环节入口跳转：event 型动作不跳转，只给 to 型用 */
function goStage(stage?: { entry?: { to?: string } } | null) {
  const to = stage?.entry?.to
  if (to) router.push(to)
}

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

/**
 * 预览目标页。旧实现锁死 tabBar[0]（只能看首页），这里改成可切换：
 * 顶栏下拉选页、点待同步清单项也会改它。
 */
const previewScreen = ref('')

/** 可预览的页面清单：底部导航入口 + 库表装修页，按导航优先排序 */
const previewTargets = computed(() => {
  const out: { path: string; label: string; group: string }[] = []
  const seen = new Set<string>()
  for (const t of site.value.tabBar || []) {
    const p = String(t.pagePath || '').replace(/^\//, '')
    if (!p || seen.has(p)) continue
    seen.add(p)
    out.push({ path: p, label: t.text || t.pageName || shortPath(p), group: '底部导航' })
  }
  for (const p of pageOptions.value) {
    const path = String(p.path || '').replace(/^\//, '')
    if (!path || seen.has(path)) continue
    seen.add(path)
    out.push({ path, label: p.name || shortPath(path), group: '装修页' })
  }
  return out
})

function shortPath(path: string) {
  const parts = path.split('/').filter(Boolean)
  return parts.length <= 2 ? path : `…/${parts.slice(-2).join('/')}`
}

/** 把扁平清单按「底部导航 / 装修页」分组，供下拉分组展示 */
const screenGroups = computed(() => {
  const order = ['底部导航', '装修页']
  const map = new Map<string, { path: string; label: string; group: string }[]>()
  for (const t of previewTargets.value) {
    if (!map.has(t.group)) map.set(t.group, [])
    map.get(t.group)!.push(t)
  }
  return order
    .filter((k) => map.has(k))
    .map((k) => ({ key: k, label: k, items: map.get(k)! }))
})

function onPreviewScreenChange(path: string) {
  previewScreen.value = path
  previewRevision.value += 1
}

function buildPreviewHref(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  const screen = previewScreen.value
    || String((site.value.tabBar || [])[0]?.pagePath || '').replace(/^\//, '')
  if (screen) query.screen = screen
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

const envLabel = computed(() => {
  const n = site.value.liveReleaseNo
  return n != null ? `生产环境 · 配置第 ${n} 版` : '生产环境 · 尚未同步'
})

const healthLabel = computed(() => {
  const n = Number(site.value.pendingCount ?? pending.value.length ?? 0)
  if (n > 0) return `${n} 项改动待发布`
  return '草稿与线上一致'
})

/**
 * 审核状态：后台拿不到微信审核回执，代码包由本机 CLI 上传。
 * 因此只在有明确记录时给结论，否则明说「无平台回执」而不是编一个状态。
 */
const reviewStatusLabel = computed(() => {
  if (!site.value.wechatCodeVersion && !wechatVerFallback.value) return '尚未上传代码包'
  return `已上传${wechatVerFallback.value ? `（${wechatVerFallback.value}）` : ''} · 平台审核状态无回执`
})

/**
 * 近 7 日指标卡。
 * PV / UV / 活跃页面来自 page-access 与 runtime-health；
 * 错误率 / 白屏率 / 跳出率依赖小程序端上报（V110 起），
 * eventReported=false 或接口没上线时显示「待埋点」——
 * 写 0 会被当成「零故障」，那是比没有更危险的误导。
 */
const health = ref<RuntimeHealth | null>(null)

function percentText(v?: number | null) {
  if (v == null) return '待埋点'
  return `${(v * 100).toFixed(2)}%`
}

const healthMetrics = computed(() => {
  const h = health.value
  const rows = visitTop.value
  const pv = h?.pageViews ?? rows.reduce((s, r) => s + Number(r.accessCount || 0), 0)
  const uv = h?.uniqueVisitors ?? 0
  const activePages = h?.activePages ?? rows.length
  const reported = h?.eventReported === true
  const hasAccess = pv > 0

  return [
    {
      key: 'uv',
      label: '访问 UV',
      value: hasAccess ? String(uv) : '—',
      hint: hasAccess ? '近 7 日去重访客' : '暂无上报',
      na: !hasAccess,
    },
    {
      key: 'pv',
      label: '访问 PV',
      value: hasAccess ? String(pv) : '—',
      hint: hasAccess ? `人均 ${(h?.viewsPerVisitor ?? 0).toFixed(1)} 次` : '暂无上报',
      na: !hasAccess,
    },
    {
      key: 'pages',
      label: '活跃页面',
      value: hasAccess ? String(activePages) : '—',
      hint: '近 7 日有访问的页面数',
      na: !hasAccess,
    },
    {
      key: 'error',
      label: '错误率',
      value: reported ? percentText(h?.errorRate) : '待埋点',
      hint: reported ? `错误 ${h?.errorCount ?? 0} 次` : '小程序端未上报',
      na: !reported,
    },
    {
      key: 'blank',
      label: '白屏率',
      value: reported ? percentText(h?.blankRate) : '待埋点',
      hint: reported ? `白屏 ${h?.blankCount ?? 0} 次` : '小程序端未上报',
      na: !reported,
    },
    {
      key: 'bounce',
      label: 'Tab 跳出率',
      value: reported ? percentText(h?.tabBounceRate) : '待埋点',
      hint: reported ? `切走 ${h?.tabLeaveCount ?? 0} 次` : '需小程序端发版',
      na: !reported,
    },
  ]
})

/** 点待发布清单里的某一项：右侧模拟器切到该页草稿预览 */
function focusPendingOnPage(item: PendingChangeItem) {
  const path = String((item as any).path || (item as any).pagePath || '')
  if (path) {
    previewScreen.value = path.replace(/^\//, '')
    previewRevision.value += 1
    return
  }
  const id = Number((item as any).pageId || (item as any).id || 0)
  if (!id) {
    ElMessage.info('这一项是站点级配置改动，右侧已显示最新草稿')
    previewRevision.value += 1
    return
  }
  const hit = pageOptions.value.find((p) => Number(p.id) === id)
  if (hit?.path) {
    previewScreen.value = String(hit.path).replace(/^\//, '')
    previewRevision.value += 1
    return
  }
  // 拿不到路径就给出直达入口，不让用户自己在列表里找
  ElMessage.info('未能定位该页路径，可从「页面」列表打开对应页面')
  router.push('/mini/pages')
}

function formatShort(t?: string | null) {
  if (!t) return ''
  const s = String(t).replace('T', ' ')
  return s.length >= 16 ? s.slice(5, 16) : s.slice(0, 16)
}

/** 后端 pendingChanges 未约定修改人字段，多个候选名都试一遍；都没有就明说「—」而不是留空 */
function pendingEditor(item: PendingChangeItem) {
  const raw = item as unknown as Record<string, unknown>
  const name = raw.editorName || raw.operator || raw.editor || raw.publisherName || raw.modifier
  return name ? String(name) : '—'
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
    ElMessage.warning('请先在「导航配置」里为底部导航绑定首页')
    router.push('/mini/appearance?tab=nav')
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
  const range = last7DayRange()
  // 两个接口互不依赖，并行拉；health 失败只降级不报错（后端未上 V110 时要能正常看页面）
  const [accessRes, healthRes] = await Promise.all([
    getPageAccess(range.start_date, range.end_date).catch(() => null),
    getRuntimeHealth(range.start_date, range.end_date).catch(() => null),
  ])
  const rows = ((accessRes as { data?: { pagePath: string; accessCount?: number; visitorCount?: number }[] })?.data
    || []) as { pagePath: string; accessCount?: number; visitorCount?: number }[]
  visitTop.value = [...rows]
    .sort((a, b) => Number(b.accessCount || 0) - Number(a.accessCount || 0))
    .slice(0, 8)
  health.value = (healthRes as { data?: RuntimeHealth } | null)?.data
    || (healthRes as RuntimeHealth | null)
    || null
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

onMounted(() => {
  // 环节状态与概览数据并行取，互不阻塞
  void build.refresh()
  void load()
})
</script>

<style scoped lang="scss">
/* 对照 docs/prototypes/暖阁小程序搭建原型.html · vOverview */

/* ---------- 搭建工作流 ---------- */
.build-card {
  border-left: 3px solid var(--acc, #b4430f);
}

.build-sum {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.next-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 13px;
  border-radius: 10px;
  background: rgba(180, 67, 15, 0.06);
  border: 1px dashed rgba(180, 67, 15, 0.3);
  margin-bottom: 12px;
}

.next-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 14px; }

  .faint { font-size: 11.5px; line-height: 1.5; }
}

.next-label {
  font-size: 11px;
  color: var(--acc, #b4430f);
  font-weight: 600;
}

.build-blocking {
  list-style: none;
  margin: 0 0 12px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.build-blocking li {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  font-size: 12.5px;
  line-height: 1.55;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(180, 40, 40, 0.06);
  color: #972626;
}

.bb-text {
  flex: 1;
  min-width: 0;
}

.stage-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(232px, 1fr));
  gap: 10px;
}

.stage-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 11px;
  background: transparent;
  min-width: 0;
}

.st-done { border-color: rgba(47, 125, 79, 0.35); background: rgba(47, 125, 79, 0.035); }
.st-partial { border-color: rgba(180, 110, 15, 0.35); }
.st-todo { border-color: var(--wb-line, #e6e0d6); }
.st-unknown { border-style: dashed; }

.st-next {
  border-color: var(--acc, #b4430f);
  box-shadow: 0 0 0 2px rgba(180, 67, 15, 0.08);
}

.stage-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.stage-no {
  flex: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.06);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
}

.st-done .stage-no { background: rgba(47, 125, 79, 0.15); color: #24673f; }

.stage-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;

  b { font-size: 13.5px; }

  .faint {
    font-size: 11px;
    line-height: 1.45;
  }
}

.stage-done,
.stage-issues {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stage-done li {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11.5px;
  line-height: 1.45;
  color: #2f6b46;
}

.stage-issues li {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  font-size: 11.5px;
  line-height: 1.45;
}

.si-blocking { color: #972626; }
.si-warning { color: #8f580c; }

.stage-more { font-size: 11px; }

.stage-foot {
  margin-top: auto;
  padding-top: 4px;
}

.build-evidence {
  margin-top: 12px;
  font-size: 12px;

  summary {
    cursor: pointer;
    font-weight: 600;
    color: var(--acc, #b4430f);
    padding: 4px 0;
  }
}

.ev-row {
  padding: 7px 0;
  border-bottom: 1px dashed var(--wb-line, #e6e0d6);

  &:last-child { border-bottom: 0; }

  b { font-size: 12.5px; }

  ul {
    margin: 3px 0 0;
    padding-left: 17px;
    line-height: 1.7;
  }
}

.ev-toggle {
  margin-top: 8px;
  font-size: 11.5px;
}

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

/* 顶栏：标题 + 紧凑操作栏（原三大 way 卡片收拢后） */
.ov-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.ov-head .actions {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.ov-head .h1 {
  margin: 0;
}

/* 待同步卡片置顶：加一条左侧强调色，和下方只读状态卡区分开 */
.pending-card--top {
  border-color: rgba(180, 67, 15, .28);
  box-shadow: 0 1px 0 rgba(180, 67, 15, .06);
}
.pending-list { margin-top: 4px; }
.list-row--btn {
  width: 100%;
  text-align: left;
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line2);
  cursor: pointer;
  font-size: 13px;
  transition: background .12s;
  &:hover { background: var(--soft); }
  &:last-child { border-bottom: 0; }
}
.pending-row__meta {
  margin-left: auto;
  font-size: 11.5px;
  text-align: right;
  white-space: nowrap;
}
.pending-row__go {
  font-size: 11.5px;
  color: var(--acc);
  white-space: nowrap;
  flex: none;
}

/* 运行指标卡组 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid var(--line2);
  border-radius: 10px;
  background: var(--soft);
  min-width: 0;
}
.metric__label {
  font-size: 11.5px;
  color: var(--mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.metric__value {
  font-size: 19px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--text);
}
.metric__value--na {
  font-size: 14px;
  font-weight: 500;
  color: var(--mute);
}
.metric__hint {
  font-size: 11px;
  color: var(--mute);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.visit-list {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--line2);
  .h3 {
    margin: 0 0 4px;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--mute);
  }
}

/* 预览页路由下拉 */
.screen-picker {
  width: 100%;
  margin-top: 2px;
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
