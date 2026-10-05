<script setup lang="ts">
/**
 * ============================================================================
 * 发版中心（Git 式发布流水线）
 * ============================================================================
 *
 * 整合了原「搭建工作台概览」+「预览检查」+「发布与版本」+「微信代码包」四处。
 * 收敛 rationale：
 *   这四件事本来就是**同一次发布动作的四个侧面**（现在有什么 / 检查 /
 *   发布 / 历史），却散在四个页面，用户必须自己脑内拼装"现在能不能发"。
 *   合并成流水线后：左边看有什么改动 → 中间看能不能发 → 右边发布 → 底下查历史。
 *
 * 🔴 三条不可混淆的发布语义（这里最容易出错，全站统一）：
 *   1. **保存草稿** —— 改配置时自动发生，只影响预览，用户端无感；
 *   2. **发布配置** —— 本页的主 CTA，把草稿写入线上 + 存一份快照，不涉微信审核；
 *   3. **微信代码包** —— 另一条独立流程（需在开发者工具上传/提审），
 *      状态单独展示，**不与配置发布混在一起说**。
 *
 * 🔴 快照范围必须如实说明：后端 collectBoundPageIds 只收录**被导航引用**的页面，
 *    不是全量页面快照。写"所有页面"是虚假承诺。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import { useBuildWorkbench, type StageIssue } from '@/composables/useBuildWorkbench'
import { getMiniSite, publishMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { refreshMiniPending } from '@/composables/useMiniPending'
import {
  getReleaseDetail,
  getPushPreviewStatus,
} from '@/api/version'
import {
  getPendingChanges,
  listMiniContentReleases,
  previewMiniRollback,
  prepareMiniRollback,
  type MiniContentReleaseVO,
} from '@/api/miniSite'
import { resolvePageStatus } from '@/utils/pageStatus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniReleasesHub' })

const router = useRouter()

const wb = useBuildWorkbench()
const site = ref<MiniSiteVO>({})
const pending = ref<any[]>([])
const pendingCount = ref(0)
const releases = ref<MiniContentReleaseVO[]>([])
const wxStatus = ref<{ uploadAvailable: boolean; capabilityReason?: string; lastPushedVersion?: string } | null>(null)

const publishing = ref(false)
const rollbackBusy = ref(false)
const noteInput = ref('')
const expanded = ref<Set<string>>(new Set())
/** 建议默认折叠：它不影响"能不能发"，不该抢阻断项的注意力 */
const warnOpen = ref(false)
const stageOpen = ref(false)

/* 快照抽屉 */
/* ─────────────────────────── 快照与回滚 ─────────────────────────── */

/**
 * 解析发布快照。
 *
 * 🔴 为什么必须在这里 parse（而不是当对象用）：
 *   getReleaseDetail 返回的 `snapshot` 是 MEDIUMTEXT 里的 **JSON 字符串**。
 *   2026-10-06 线上「摘要显示 1 页、打开快照却是 0 页 0 配置」就是这个原因 ——
 *   代码直接读 `snapData.pages`，而真实字段在 `snapshot` 字符串里，从未解析。
 *
 *   返回 null 表示"读不出来"，与"确实是空快照"严格区分：
 *   读不出来 ≠ 空。界面上要给不同的提示，不能都显示 0。
 */
type SnapView = {
  pages: Array<Record<string, unknown>>
  systemConfig: Record<string, unknown>
  createdAt?: string
  /** 确认过是空快照（不是解析失败） */
  emptyConfirmed: boolean
}

function parseSnapshot(raw: any): SnapView | null {
  if (!raw) return null
  const snap = raw.snapshot ?? raw

  // 形态 1：JSON 字符串
  if (typeof snap === 'string') {
    const s = snap.trim()
    if (!s) return { pages: [], systemConfig: {}, emptyConfirmed: true }
    try {
      const obj = JSON.parse(s)
      if (!obj || typeof obj !== 'object') return null
      const pages = Array.isArray(obj.pages) ? obj.pages : []
      return {
        pages,
        systemConfig:
          obj.systemConfig && typeof obj.systemConfig === 'object' ? obj.systemConfig : {},
        createdAt: obj.createdAt,
        emptyConfirmed: pages.length === 0,
      }
    } catch {
      return null
    }
  }

  // 形态 2：已经是对象
  if (typeof snap === 'object') {
    const pages = Array.isArray(snap.pages) ? snap.pages : []
    return {
      pages,
      systemConfig:
        snap.systemConfig && typeof snap.systemConfig === 'object' ? snap.systemConfig : {},
      createdAt: snap.createdAt,
      emptyConfirmed: pages.length === 0,
    }
  }
  return null
}

const snapOpen = ref(false)
const snapRow = ref<MiniContentReleaseVO | null>(null)
const snapData = ref<SnapView | null>(null)
/** true = 读不出来（≠ 空快照） */
const snapUnreadable = ref(false)
const snapLoading = ref(false)

async function load() {
  try {
    site.value = (await getMiniSite('draft')) || {}
  } catch {
    site.value = {}
  }
  try {
    const p = await getPendingChanges()
    pending.value = p?.items || []
    pendingCount.value = Number(p?.pendingCount ?? pending.value.length) || 0
  } catch {
    pending.value = []
    pendingCount.value = 0
  }
  try {
    releases.value = (await listMiniContentReleases()) || []
  } catch {
    releases.value = []
  }
  try {
    wxStatus.value = (await getPushPreviewStatus()) as any
  } catch {
    wxStatus.value = null
  }
  await wb.refresh(true)
}

onMounted(load)

/* ─────────────────────────── Hero：版本状态 ─────────────────────────── */

/**
 * 版本号的含义必须写清 —— 2026-10-06 线上出现过「工作台第 33 版 /
 * 发布页显示 1200 / 预览页显示「—」 / 列表第 28 次」四个数打架。
 * 根因是系统里��� 5 种「版本」，本项目只有其中一种在发版中心展示。
 */
const liveNo = computed(() => Number(site.value.liveReleaseNo ?? 0) || null)
const liveAt = computed(() => (site.value.liveReleaseAt ? String(site.value.liveReleaseAt) : ''))
const nextNo = computed(() => (liveNo.value == null ? 1 : liveNo.value + 1))

/** 线上已稳定运行天数 */
const stableDays = computed(() => {
  if (!liveAt.value) return null
  const t = new Date(String(liveAt.value).replace(/-/g, '/')).getTime()
  if (Number.isNaN(t)) return null
  return Math.max(0, Math.floor((Date.now() - t) / 86400000))
})

const liveVersionLabel = computed(() => (liveNo.value == null ? '尚未发布' : `第 ${liveNo.value} 次发布`))

/* ─────────────────────────── 发布资格 ─────────────────────────── */

/**
 * 发布资格 = 后端 preflight 阻断 ∪ 搭建链路自检阻断。
 * 🔴 两者都要：后端 preflight 不校验跨表依赖（比如导航指向的页面是否真的存在），
 *    只看它会出现"检查通过但点发布就失败"。
 */
const blockers = computed<StageIssue[]>(() => {
  const chain = wb.stages.value.flatMap((s) => s.issues).filter((i) => i.level === 'blocking')
  const pre = wb.facts.value.preflight?.blocking || []
  return [
    ...chain.map((i) => ({ ...i, stage: '搭建配置' })),
    ...pre.map((t) => ({ level: 'blocking' as const, text: t, stage: '服务端检查' })),
  ]
})

const warnings = computed<StageIssue[]>(() => {
  const chain = wb.stages.value.flatMap((s) => s.issues).filter((i) => i.level === 'warning')
  const pre = wb.facts.value.preflight?.warnings || []
  return [
    ...chain.map((i) => ({ ...i, stage: '搭建配置' })),
    ...pre.map((t) => ({ level: 'warning' as const, text: t, stage: '服务端检查' })),
  ]
})

/** preflight 拿不到时不能显示"0 阻断"——那是在骗人 */
const preflightKnown = computed(() => wb.facts.value.preflight != null)

const canPublish = computed(() => blockers.value.length === 0 && preflightKnown.value)

const publishHint = computed(() => {
  if (!preflightKnown.value) return '发布前检查服务暂时不可用，无法确认是否可发布'
  if (blockers.value.length) return `先处理 ${blockers.value.length} 个阻断项才能发布`
  if (!pendingCount.value) return '当前没有待发布的改动'
  return `将发布 ${pendingCount.value} 项改动并生成一份快照`
})

/* ─────────────────────────── 变更清单 ─────────────────────────── */

type DiffKind = 'site' | 'page'

const diffRows = computed(() => {
  const rows: Array<{
    key: string
    kind: DiffKind
    badge: string
    tone: string
    title: string
    detail: string
  }> = []

  // 站点级（导航 / 品牌 / 主题）
  const siteItems = pending.value.filter((p: any) => !p.pageId)
  if (siteItems.length) {
    rows.push({
      key: 'site',
      kind: 'site',
      badge: '修改',
      tone: 'info',
      title: '站点配置',
      detail: '底部导航、品牌与主题色',
    })
  }

  // 页面级
  for (const p of pending.value) {
    if (!p.pageId) continue
    const status = p.status || p.type || '更新'
    rows.push({
      key: `page-${p.pageId}`,
      kind: 'page',
      badge: String(status).includes('新增') || String(status).includes('new') ? '新增' : '更新',
      tone: String(status).includes('新增') ? 'success' : 'warn',
      title: String(p.name || p.pageName || `页面 #${p.pageId}`),
      detail: String(p.summary || p.changeType || '内容有改动'),
    })
  }
  return rows
})

function toggleRow(key: string) {
  const next = new Set(expanded.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  expanded.value = next
}

function rowDetail(item: any) {
  return `${item.changeType || '内容'} · ${item.pagePath || item.path || ''}`
}

/* ─────────────────────────── 发布 ─────────────────────────── */

async function doPublish() {
  if (blockers.value.length) {
    ElMessage.error('存在阻断项，请先处理后再发布')
    return
  }
  if (!pendingCount.value) {
    ElMessage.info('当前没有待发布的改动')
    return
  }
  try {
    await ElMessageBox.confirm(
      `将把 ${pendingCount.value} 项改动写入线上，并生成一份可回滚的版本快照。`,
      '确认发布',
      { confirmButtonText: '发布', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  publishing.value = true
  try {
    await publishMiniSite({ includeSite: true, notes: noteInput.value.trim() || undefined })
    noteInput.value = ''
    void refreshMiniPending(true)
    await load()
    ElMessage.success('已发布到线上，并生成了版本快照')
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '发布失败，线上配置未改变')
  } finally {
    publishing.value = false
  }
}

/* ─────────────────────────── 快照与回滚 ─────────────────────────── */

async function openSnapshot(row: MiniContentReleaseVO) {
  snapRow.value = row
  snapOpen.value = true
  snapLoading.value = true
  snapUnreadable.value = false
  snapData.value = null
  try {
    const res = await getReleaseDetail(Number(row.id))
    const d = (res as any)?.data ?? res
    const parsed = parseSnapshot(d)
    if (parsed) {
      snapData.value = parsed
      snapUnreadable.value = false
    } else {
      snapData.value = null
      snapUnreadable.value = true
    }
  } catch {
    snapData.value = null
    snapUnreadable.value = true
  } finally {
    snapLoading.value = false
  }
}

/**
 * 还原为草稿 —— 两段式（先预览影响，再确认执行）。
 *
 * 🔴 关键风险必须如实告知：**还原会覆盖当前未发布的改动**。
 *    这是后端 prepare-rollback 的既定行为（会先算 currentPendingSummaries），
 *    不告知就是给用户埋数据丢失的坑。
 */
async function doRollback(row: MiniContentReleaseVO) {
  if (!row.id || !row.hasSnapshot) {
    ElMessage.warning('该记录没有可用的快照，无法还原')
    return
  }
  if (rollbackBusy.value) return

  // 第一段：预览影响
  let preview: Awaited<ReturnType<typeof previewMiniRollback>> | null = null
  try {
    preview = await previewMiniRollback(row.id)
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '无法读取还原预览')
    return
  }

  const restoreNames = (preview.restorePageNames || []).slice(0, 8)
  const pendingLines = (preview.currentPendingSummaries || []).slice(0, 6)
  const pendingTotal = Number(preview.currentPendingCount ?? 0) || 0

  const lines = [
    `将第 ${row.releaseNo} 次发布的配置还原为一份草稿。`,
    '',
    '还原只生成草稿，不会立刻改变线上——你可以先核对，确认无误再回来发布。',
    '',
    restoreNames.length
      ? `会恢复的页面：${restoreNames.join('、')}${(preview.restorePageNames?.length || 0) > 8 ? ' 等' : ''}`
      : '这份快照里没有记录页面名称。',
    preview.hasSiteConfig ? '同时恢复站点 / 导航 / 品牌配置草稿。' : '',
    '',
  ]

  // 🔴 覆盖风险：这是唯一真正会丢东西的地方，必须显式警告
  if (pendingTotal > 0) {
    lines.push(
      `⚠️ 你当前还有 ${pendingTotal} 项未发布的改动，还原后会被覆盖：`,
      ...pendingLines.map((s: string) => `· ${s}`),
      '',
      '如果不希望丢，请先取消，把这些改动发布或记录下来。',
    )
  } else {
    lines.push('当前没有未发布的改动，不会覆盖任何东西。')
  }

  try {
    await ElMessageBox.confirm(lines.join('\n'), '还原为草稿', {
      confirmButtonText: pendingTotal > 0 ? '仍然还原' : '还原为草稿',
      cancelButtonText: '取消',
      type: pendingTotal > 0 ? 'warning' : 'info',
      customClass: 'rl-confirm',
    })
  } catch {
    return
  }

  // 第二段：执行
  rollbackBusy.value = true
  try {
    await prepareMiniRollback(row.id)
    void refreshMiniPending(true)
    ElMessage.success('已还原为草稿，核对无误后再发布')
    await load()
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '还原失败')
  } finally {
    rollbackBusy.value = false
  }
}

function formatTime(v?: string | number | null): string {
  if (v == null || v === '') return '—'
  const d = typeof v === 'number' ? new Date(v) : new Date(String(v).replace(/-/g, '/'))
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('zh-CN', { hour12: false }).slice(0, 16)
}
</script>

<template>
  <div class="rl-hub">
    <!-- ── Hero ───────────────────────────────────────────────────────── -->
    <section class="rl-hero">
      <!-- 线上 -->
      <div class="rl-ver">
        <span class="rl-ver__label">当前线上</span>
        <span class="rl-ver__no">{{ liveVersionLabel }}</span>
        <span v-if="liveAt" class="saas-cap">发布于 {{ formatTime(liveAt) }}</span>
        <span v-if="stableDays != null" class="saas-pill saas-pill--success">
          已稳定运行 {{ stableDays }} 天
        </span>
      </div>

      <div class="rl-arrow" aria-hidden="true">
        <span class="rl-arrow__line" />
        <MiniIcon name="chev" :size="16" />
      </div>

      <!-- 待发布 -->
      <div class="rl-ver rl-ver--next">
        <span class="rl-ver__label">准备发布</span>
        <span class="rl-ver__no">第 {{ nextNo }} 次发布</span>
        <span class="saas-pill" :class="pendingCount ? 'saas-pill--warn' : ''">
          <span v-if="pendingCount" class="saas-dot saas-dot--pulse" />
          {{ pendingCount ? `${pendingCount} 项改动` : '无改动' }}
        </span>
      </div>

      <!-- CTA -->
      <div class="rl-cta">
        <button type="button" class="saas-btn" @click="router.push('/mini/pages')">
          <MiniIcon name="page" :size="14" />检查页面
        </button>
        <button
          type="button"
          class="saas-btn saas-btn--primary rl-cta__pub"
          :disabled="!canPublish || publishing || !pendingCount"
          @click="doPublish"
        >
          <MiniIcon name="upload" :size="14" />
          {{ publishing ? '发布中…' : '发布并生成快照' }}
        </button>
      </div>
    </section>

    <div class="rl-grid">
      <!-- ── 左：变更清单 ─────────────────────────────────────────────── -->
      <div class="rl-col">
        <section class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">本次变更</div>
              <div class="saas-panel__hint">
                {{ diffRows.length ? `${diffRows.length} 项待发布` : '暂无改动' }}
              </div>
            </div>
            <input
              v-model="noteInput"
              class="saas-input rl-note"
              placeholder="发布说明（选填，会记进快照）"
              aria-label="发布说明"
            />
          </div>

          <div v-if="diffRows.length" class="rl-diff">
            <div v-for="r in diffRows" :key="r.key" class="rl-diff__row">
              <span class="saas-pill rl-diff__badge" :class="`saas-pill--${r.tone}`">
                {{ r.badge }}
              </span>
              <button type="button" class="rl-diff__main" @click="toggleRow(r.key)">
                <span class="rl-diff__title">{{ r.title }}</span>
                <span class="saas-cap">{{ r.detail }}</span>
              </button>
              <MiniIcon :name="expanded.has(r.key) ? 'chev' : 'down'" :size="13" />
            </div>
          </div>

          <div v-else class="saas-empty">
            <span class="saas-empty__icon"><MiniIcon name="check" :size="22" /></span>
            <span class="saas-empty__title">没有待发布的改动</span>
            <span class="saas-empty__desc">
              在「页面管理」或「品牌与导航」里的修改会自动存为草稿，改完回来这里就能发布。
            </span>
            <button type="button" class="saas-btn saas-btn--primary" @click="router.push('/mini/pages')">
              去改点什么
            </button>
          </div>
        </section>

        <!-- 微信代码包：独立流程，状态单独展示 -->
        <section class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">微信代码包</div>
              <div class="saas-panel__hint">
                与配置发布是<b>两条独立流程</b>：配置发布不需要提审，代码包需要
              </div>
            </div>
            <span
              class="saas-pill"
              :class="wxStatus?.uploadAvailable ? 'saas-pill--success' : 'saas-pill--neutral'"
            >
              {{ wxStatus?.uploadAvailable ? '可上传' : '需本地上传' }}
            </span>
          </div>
          <div class="saas-panel__bd">
            <p class="saas-body" style="margin: 0 0 8px">
              当前代码包版本
              <b class="saas-mono">{{ wxStatus?.lastPushedVersion || site.wechatCodeVersion || '尚未上传' }}</b>
            </p>
            <p class="saas-cap" style="margin: 0; line-height: 1.6">
              {{
                wxStatus?.uploadAvailable
                  ? '可以在后台直接上传并提交审核。'
                  : wxStatus?.capabilityReason || '需要在微信开发者工具里本地上传代码包，这里只展示状态。'
              }}
            </p>
          </div>
        </section>

        <!-- 历史快照 -->
        <section class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">历史快照</div>
              <div class="saas-panel__hint">
                每次发布都会存一份配置快照，包含页面内容、导航与品牌样式
              </div>
            </div>
          </div>

          <ol v-if="releases.length" class="rl-timeline">
            <li v-for="row in releases" :key="String(row.id)" class="rl-tl">
              <span class="rl-tl__dot" :class="{ 'is-live': row.currentLive }" />
              <div class="rl-tl__body">
                <div class="rl-tl__hd">
                  <b>第 {{ row.releaseNo }} 次发布</b>
                  <span v-if="row.currentLive" class="saas-pill saas-pill--success">当前线上</span>
                  <span v-if="row.pageCount" class="saas-cap">{{ row.pageCount }} 个页面</span>
                </div>
                <div class="saas-cap">
                  {{ formatTime(row.publishedAt) }}
                  <template v-if="row.publisherName"> · {{ row.publisherName }}</template>
                </div>
                <p v-if="row.note" class="rl-tl__note">{{ row.note }}</p>
                <div class="rl-tl__ops">
                  <button
                    type="button"
                    class="saas-btn saas-btn--sm"
                    :disabled="!row.hasSnapshot"
                    @click="openSnapshot(row)"
                  >
                    查看快照
                  </button>
                  <button
                    v-if="!row.currentLive"
                    type="button"
                    class="saas-btn saas-btn--sm"
                    :disabled="!row.hasSnapshot || rollbackBusy"
                    @click="doRollback(row)"
                  >
                    还原为草稿
                  </button>
                  <span v-if="!row.hasSnapshot" class="saas-cap">该记录无快照，无法还原</span>
                </div>
              </div>
            </li>
          </ol>

          <div v-else class="saas-empty">
            <span class="saas-empty__icon"><MiniIcon name="doc" :size="22" /></span>
            <span class="saas-empty__title">还没有发布记录</span>
            <span class="saas-empty__desc">发布一次之后，这里会保留可随时还原的配置快照。</span>
          </div>
        </section>
      </div>

      <!-- ── 右：发布前检查 ───────────────────────────────────────────── -->
      <aside class="rl-side">
        <section class="saas-panel">
          <div class="saas-panel__hd">
            <div>
              <div class="saas-panel__title">发布前检查</div>
              <div class="saas-panel__hint">{{ publishHint }}</div>
            </div>
          </div>

          <div class="saas-panel__bd rl-check">
            <!-- 无法确认：不能显示 0 阻断 -->
            <div v-if="!preflightKnown" class="saas-note saas-note--warn">
              <MiniIcon name="warn" :size="15" />
              <span>发布前检查服务暂时不可用，<b>无法确认</b>是否可以发布。请稍后重试。</span>
            </div>

            <!-- 阻断 -->
            <div v-if="blockers.length" class="rl-grp">
              <div class="rl-grp__hd">
                <span class="rl-grp__n">{{ blockers.length }}</span> 个阻断项
                <span class="saas-cap">处理完才能发布</span>
              </div>
              <div v-for="(b, i) in blockers" :key="`b${i}`" class="rl-issue is-danger">
                <MiniIcon name="x" :size="13" />
                <div class="saas-grow">
                  <p class="saas-body" style="margin: 0">{{ b.text }}</p>
                  <span class="saas-cap">{{ b.stage }}</span>
                </div>
                <button
                  v-if="b.action?.to"
                  type="button"
                  class="saas-btn saas-btn--sm"
                  @click="router.push(b.action.to)"
                >
                  修复
                </button>
              </div>
            </div>

            <div v-else-if="preflightKnown" class="rl-grp">
              <div class="rl-grp__hd">
                <MiniIcon name="check" :size="14" />
                <span>没有阻断项</span>
              </div>
            </div>

            <!-- 建议 -->
            <div v-if="warnings.length" class="rl-grp">
              <button type="button" class="rl-grp__toggle" @click="warnOpen = !warnOpen">
                <span class="rl-grp__n rl-grp__n--warn">{{ warnings.length }}</span> 条建议
                <span class="saas-cap">{{ warnOpen ? '收起' : '展开' }}</span>
                <MiniIcon :name="warnOpen ? 'chev' : 'down'" :size="13" />
              </button>
              <div v-if="warnOpen">
                <div v-for="(w, i) in warnings" :key="`w${i}`" class="rl-issue is-warn">
                  <MiniIcon name="warn" :size="13" />
                  <div class="saas-grow">
                    <p class="saas-body" style="margin: 0">{{ w.text }}</p>
                    <span class="saas-cap">{{ w.stage }}</span>
                  </div>
                  <button
                    v-if="w.action?.to"
                    type="button"
                    class="saas-btn saas-btn--sm"
                    @click="router.push(w.action.to)"
                  >
                    立即修复
                  </button>
                </div>
              </div>
            </div>

            <!-- 搭建环节状态：让用户知道整体进度而不只是"能不能发" -->
            <div class="saas-advanced">
              <button type="button" class="saas-advanced__hd" @click="stageOpen = !stageOpen">
                <MiniIcon :name="stageOpen ? 'chev' : 'down'" :size="13" />
                搭建环节状态
              </button>
              <div v-if="stageOpen" class="saas-advanced__bd rl-stages">
                <div v-for="s in wb.stages.value" :key="s.key" class="rl-stage">
                  <span
                    class="saas-dot"
                    :style="{
                      background:
                        s.status === 'done'
                          ? 'var(--saas-success)'
                          : s.status === 'partial'
                            ? 'var(--saas-warn)'
                            : 'var(--saas-ink-3)',
                    }"
                  />
                  <span class="saas-grow saas-body">{{ s.title }}</span>
                  <span class="saas-cap">{{ wb.statusLabel(s.status) }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <!-- 快照抽屉 -->
    <template v-if="snapOpen">
      <div class="saas-scrim" @click="snapOpen = false" />
      <aside class="saas-drawer" role="dialog" aria-label="版本快照">
        <header class="saas-drawer__hd">
          <div>
            <div class="saas-section">第 {{ snapRow?.releaseNo }} 次发布的快照</div>
            <div class="saas-cap">{{ snapRow ? formatTime(snapRow.publishedAt) : '' }}</div>
          </div>
          <button
            type="button"
            class="saas-btn saas-btn--icon saas-btn--ghost"
            aria-label="关闭"
            @click="snapOpen = false"
          >
            <MiniIcon name="x" :size="15" />
          </button>
        </header>

        <div class="saas-drawer__bd" v-loading="snapLoading">
          <template v-if="snapUnreadable">
            <div class="saas-note saas-note--warn">
              <MiniIcon name="warn" :size="15" />
              <span>
                这份快照的内容读取不出来，<b>不能当成"空快照"</b>。
                可能原因：内容经过脱敏处理，或快照格式与当前版本不同。
                如需恢复，请用「还原为草稿」后逐项核对。
              </span>
            </div>
          </template>

          <template v-else-if="snapData">
            <div class="saas-grouptitle">这份快照包含</div>
            <ul class="rl-snap-list">
              <li>
                <b>页面内容</b>：{{ (snapData.pages || []).length }} 个页面的完整布局
              </li>
              <li><b>导航配置</b>：底部 Tab 的名称、图标与顺序</li>
              <li><b>品牌样式</b>：名称、Logo、主色调</li>
            </ul>
            <div class="saas-note" style="margin-top: 10px">
              <MiniIcon name="info" :size="13" />
              <span>
                快照收录的是<b>被底部导航引用</b>的页面。没被导航引用的页面
                请用「页面管理 › 该页 › 历史版本」查看。
              </span>
            </div>
          </template>
        </div>

        <footer class="saas-drawer__ft">
          <button type="button" class="saas-btn" @click="snapOpen = false">关闭</button>
          <button
            v-if="snapRow"
            type="button"
            class="saas-btn saas-btn--primary"
            :disabled="rollbackBusy"
            @click="doRollback(snapRow)"
          >
            还原为草稿
          </button>
        </footer>
      </aside>
    </template>
  </div>
</template>

<style scoped lang="scss">
.rl-hub { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

/* ── Hero ──────────────────────────────────────────────────────────────── */
.rl-hero {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 18px 20px;
  background: var(--saas-surface);
  border: 1px solid var(--saas-border);
  border-radius: var(--saas-r-lg);
  box-shadow: var(--saas-shadow-xs);
  flex-wrap: wrap;
}
.rl-ver { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rl-ver__label { font-size: var(--saas-fs-cap); color: var(--saas-ink-3); }
.rl-ver__no {
  font-size: var(--saas-fs-title);
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--saas-ink);
}
.rl-ver--next .rl-ver__no { color: var(--saas-accent); }

.rl-arrow { display: flex; align-items: center; color: var(--saas-ink-3); flex: none; }
.rl-arrow__line {
  width: 32px;
  height: 1px;
  background: var(--saas-border-strong);
}

.rl-cta { display: flex; align-items: center; gap: 8px; margin-left: auto; }
.rl-cta__pub { height: 36px; padding: 0 16px; }

.rl-note { max-width: 260px; }

/* ── 两栏 ──────────────────────────────────────────────────────────────── */
.rl-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 16px;
  align-items: start;
}
.rl-col { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.rl-side { position: sticky; top: 12px; }

/* ── 变更清单 ──────────────────────────────────────────────────────────── */
.rl-diff { padding: 6px 0; }
.rl-diff__row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: var(--saas-row-h);
  padding: 0 16px;
  border-bottom: 1px solid var(--saas-border);
  color: var(--saas-ink-3);
  &:last-child { border-bottom: 0; }
}
.rl-diff__badge { flex: none; min-width: 40px; justify-content: center; }
.rl-diff__main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
}
.rl-diff__title {
  font-size: var(--saas-fs-body);
  font-weight: 500;
  color: var(--saas-ink);
}

/* ── 检查 ──────────────────────────────────────────────────────────────── */
.rl-check { display: flex; flex-direction: column; gap: 12px; }
.rl-grp { display: flex; flex-direction: column; gap: 6px; }
.rl-grp__hd {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--saas-fs-cap);
  font-weight: 500;
  color: var(--saas-ink-2);
}
.rl-grp__toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: var(--saas-fs-cap);
  font-weight: 500;
  color: var(--saas-ink-2);
  cursor: pointer;
}
.rl-grp__n {
  display: grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: var(--saas-r-full);
  background: var(--saas-danger-bg);
  color: var(--saas-danger);
  font-family: var(--saas-mono);
  font-size: var(--saas-fs-mono);
  &--warn { background: var(--saas-warn-bg); color: var(--saas-warn); }
}
.rl-issue {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--saas-r-md);
  font-size: var(--saas-fs-cap);
  line-height: 1.5;
  &.is-danger { background: var(--saas-danger-bg); color: var(--saas-danger); }
  &.is-warn { background: var(--saas-warn-bg); color: var(--saas-warn); }
  .saas-cap { opacity: 0.75; }
}

.rl-stages { display: flex; flex-direction: column; gap: 7px; }
.rl-stage { display: flex; align-items: center; gap: 8px; }

/* ── 时间轴 ────────────────────────────────────────────────────────────── */
.rl-timeline { list-style: none; margin: 0; padding: 12px 16px; }
.rl-tl {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 10px 0 14px;
  /* 时间轴竖线 */
  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 20px;
    bottom: 0;
    width: 1px;
    background: var(--saas-border);
  }
  &:last-child::before { display: none; }
}
.rl-tl__dot {
  position: relative;
  z-index: 1;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border-radius: 50%;
  background: var(--saas-neutral-line);
  flex: none;
  &.is-live { background: var(--saas-success); box-shadow: 0 0 0 3px var(--saas-success-bg); }
}
.rl-tl__body { flex: 1; min-width: 0; }
.rl-tl__hd {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  b { font-size: var(--saas-fs-body); color: var(--saas-ink); }
}
.rl-tl__note {
  margin: 4px 0 0;
  font-size: var(--saas-fs-cap);
  color: var(--saas-ink-2);
  line-height: 1.55;
}
.rl-tl__ops { display: flex; align-items: center; gap: 6px; margin-top: 8px; flex-wrap: wrap; }

.rl-snap-list {
  margin: 0;
  padding-left: 18px;
  font-size: var(--saas-fs-body);
  color: var(--saas-ink-2);
  line-height: 1.9;
}

@media (max-width: 1180px) {
  .rl-grid { grid-template-columns: minmax(0, 1fr); }
  .rl-side { position: static; }
}
@media (max-width: 720px) {
  .rl-cta { margin-left: 0; width: 100%; }
  .rl-note { max-width: none; }
}
</style>