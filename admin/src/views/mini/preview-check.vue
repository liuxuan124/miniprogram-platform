<template>
  <div class="mini-wb mw-page" v-loading="loading && loaded">
    <MiniSkeleton v-if="!loaded" kind="overview" />
    <div v-else class="ov">
      <div class="ov-main">
        <MiniOpsConceptBanner variant="overview" />

        <div class="head-row">
          <div>
            <h1 class="h1">预览与检查</h1>
            <div class="sub">
              发布前在这里看一眼真实效果，并确认没有会挡住发布的问题
            </div>
          </div>
          <div class="actions">
            <button type="button" class="btn soft" @click="runChecks">
              <MiniIcon name="undo" :size="14" />重新检查
            </button>
            <button type="button" class="btn soft" @click="router.push('/mini/versions')">去发布 ›</button>
          </div>
        </div>

        <!-- 检查结论：阻断与提醒必须视觉上分开 -->
        <section class="card verdict" :class="verdictClass">
          <div class="verdict-head">
            <span class="verdict-ic">
              <MiniIcon :name="verdictIcon" :size="20" />
            </span>
            <div class="verdict-body">
              <strong>{{ verdictTitle }}</strong>
              <span class="faint">{{ verdictDesc }}</span>
            </div>
            <button
              v-if="blockingTotal === 0 && pendingCount > 0"
              type="button"
              class="btn primary"
              @click="router.push('/mini/versions')"
            >
              可以发布
            </button>
          </div>
        </section>

        <div class="check-cols">
          <!-- 阻断项 -->
          <section class="card">
            <div class="head" style="margin-bottom: 10px">
              <div>
                <h2 class="h2">阻止发布的问题</h2>
                <div class="sub">这些不解决就发布不了</div>
              </div>
              <span class="tag" :class="blockingTotal ? 't-err' : 't-live'">{{ blockingTotal }} 项</span>
            </div>

            <ul v-if="blockingItems.length" class="issue-list">
              <li v-for="(b, i) in blockingItems" :key="'b' + i" class="issue issue-block">
                <span class="issue-ic"><MiniIcon name="x" :size="13" /></span>
                <div class="issue-body">
                  <p class="issue-text">
                    <span class="issue-stage">{{ b.stage }}</span>
                    {{ b.text }}
                  </p>
                  <button
                    v-if="b.action"
                    type="button"
                    class="btn sm"
                    @click="goIssue(b)"
                  >{{ b.action.label }}</button>
                </div>
              </li>
            </ul>
            <p v-else class="ok-empty">
              <MiniIcon name="check" :size="14" />没有阻止发布的问题
            </p>
          </section>

          <!-- 提醒 -->
          <section class="card">
            <div class="head" style="margin-bottom: 10px">
              <div>
                <h2 class="h2">一般提醒</h2>
                <div class="sub">不挡发布，但值得看一眼</div>
              </div>
              <span class="tag" :class="warningTotal ? 't-pending' : 't-live'">{{ warningTotal }} 项</span>
            </div>

            <ul v-if="warningItems.length" class="issue-list">
              <li v-for="(w, i) in warningItems" :key="'w' + i" class="issue issue-warn">
                <span class="issue-ic"><MiniIcon name="warn" :size="13" /></span>
                <div class="issue-body">
                  <p class="issue-text">
                    <span class="issue-stage">{{ w.stage }}</span>
                    {{ w.text }}
                  </p>
                  <button
                    v-if="w.action"
                    type="button"
                    class="link"
                    @click="goIssue(w)"
                  >{{ w.action.label }}</button>
                </div>
              </li>
            </ul>
            <p v-else class="ok-empty">
              <MiniIcon name="check" :size="14" />没有提醒
            </p>
          </section>
        </div>

        <!-- 预览能力：三种并列，用户自己选 -->
        <section class="card">
          <div class="head" style="margin-bottom: 12px">
            <div>
              <h2 class="h2">预览方式</h2>
              <div class="sub">草稿预览看未发布的改动，线上预览看用户现在看到的样子</div>
            </div>
          </div>

          <div class="preview-modes">
            <button
              v-for="m in PREVIEW_MODES"
              :key="m.key"
              type="button"
              class="pm-card"
              :class="{ on: previewMode === m.key }"
              @click="previewMode = m.key"
            >
              <span class="pm-ic"><MiniIcon :name="m.icon" :size="16" /></span>
              <span class="pm-t">{{ m.title }}</span>
              <span class="faint pm-d">{{ m.desc }}</span>
            </button>
          </div>

          <!-- 目标页面选择：预览特定页面 -->
          <div class="target-row">
            <span class="faint">预览目标页</span>
            <el-select
              v-model="targetPath"
              filterable
              clearable
              placeholder="默认进入小程序首页"
              class="target-select"
            >
              <el-option-group v-if="navTargets.length" label="导航入口">
                <el-option
                  v-for="t in navTargets"
                  :key="'nav-' + (t.pagePath || t.text)"
                  :label="`${t.text}（${t.pagePath || '未绑定'}）`"
                  :value="t.pagePath"
                />
              </el-option-group>
              <el-option-group v-if="pageTargets.length" label="已上线页面">
                <el-option
                  v-for="p in pageTargets"
                  :key="String(p.id)"
                  :label="`${p.name}（${p.path}）`"
                  :value="String(p.path || '').replace(/^\//, '')"
                />
              </el-option-group>
            </el-select>
          </div>

          <div class="preview-ops">
            <button type="button" class="btn" @click="openNewWindow">
              <MiniIcon name="eye" :size="14" />在新窗口打开
            </button>
            <button type="button" class="btn" @click="qrVisible = true">
              <MiniIcon name="qr" :size="14" />扫码在手机上预览
            </button>
            <span class="faint preview-url-note">
              草稿预览需要登录且具备草稿权限；线上预览任何人可看
            </span>
          </div>
        </section>

        <!-- 内容体检 -->
        <section class="card">
          <div class="head" style="margin-bottom: 10px">
            <div>
              <h2 class="h2">内容体检</h2>
              <div class="sub">扫描失效链接、空内容与访问条件不满足的页面</div>
            </div>
            <button v-if="scanError" type="button" class="btn sm" @click="load">重新加载</button>
          </div>

          <!-- 🔴 体检读不到数据时不能说「0 个问题」——那与「检查通过」叠加就成了假通过 -->
          <div v-if="scanError" class="scan-unverified">
            <MiniIcon name="warn" :size="14" />
            <div>
              <strong>页面列表读取失败，体检结果不可用</strong>
              <span class="faint">{{ scanError }}。下方不显示任何计数，避免与「检查通过」矛盾。</span>
            </div>
          </div>

          <template v-else>
            <div class="scan-grid">
              <div class="scan-cell">
                <span class="faint">失效链接</span>
                <strong :class="scan.brokenLink ? 'bad' : 'good'">{{ scan.brokenLink }}</strong>
              </div>
              <div class="scan-cell">
                <span class="faint">空内容页面</span>
                <strong :class="scan.emptyPage ? 'bad' : 'good'">{{ scan.emptyPage }}</strong>
              </div>
              <div class="scan-cell">
                <span class="faint">缺名称页面</span>
                <strong :class="scan.noname ? 'warn' : 'good'">{{ scan.noname }}</strong>
              </div>
              <div class="scan-cell">
                <span class="faint">已下线页面</span>
                <strong :class="scan.offline ? 'warn' : 'good'">{{ scan.offline }}</strong>
              </div>
            </div>
            <ul v-if="scan.details.length" class="scan-list">
              <li v-for="(d, i) in scan.details" :key="i">{{ d }}</li>
            </ul>
            <p v-else class="faint" style="font-size: 12px; margin: 8px 0 0">
              扫描范围为导航入口与已上线页面。装修器内部组件级链接在保存草稿时会单独校验。
            </p>
            <!-- 体检发现真实失效导航时，不能同时显示「可以发布」 -->
            <div v-if="scan.brokenLink > 0" class="scan-conflict">
              <MiniIcon name="warn" :size="14" />
              <div>
                <strong>存在 {{ scan.brokenLink }} 个失效导航，暂不建议发布</strong>
                <span class="faint">
                  上方「检查通过」来自后端 preflight，它不校验导航绑定目标是否存在；
                  两者口径不同，以本项为准。请先到「导航配置」修复。
                </span>
                <button type="button" class="btn sm" @click="router.push('/mini/workbench?tab=nav')">
                  去修复导航绑定
                </button>
              </div>
            </div>
          </template>
        </section>
      </div>

      <DevicePreview
        :hint="previewHint"
        :preview-url="previewUrl"
        :preview-url-live="previewUrlLive"
        :iframe-key="previewKey"
        @scan="qrVisible = true"
      />
    </div>

    <MiniH5QrDialog v-model="qrVisible" mode="miniapp-draft" title="扫码预览草稿" />
  </div>
</template>

<script setup lang="ts">
/**
 * 预览与检查（工作流第 6 环）
 *
 * 存在的意义：原来「检查」散落在发布页和外观页（两处 preflight、两处不同文案），
 * 预览也散在概览/外观/发布三个页面的右栏。用户没有一处能看全「现在能不能发」。
 *
 * 判定全部来自 useBuildWorkbench 的 preflight 环节 + 页面/导航实测扫描，
 * 本页不自己另算一套。
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MiniIcon from '@/components/mini/MiniIcon.vue'
import MiniSkeleton from '@/components/mini/MiniSkeleton.vue'
import MiniH5QrDialog from '@/components/mini/MiniH5QrDialog.vue'
import MiniOpsConceptBanner from '@/components/mini/MiniOpsConceptBanner.vue'
import DevicePreview from '@/components/mini/DevicePreview.vue'
import { useBuildWorkbench, type StageIssue } from '@/composables/useBuildWorkbench'
import { loadAllPages, pageKey, pagePathKey, isBuiltinShellPath } from '@/composables/usePageCatalog'
import { getMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { resolvePageStatus } from '@/utils/pageStatus'
import { ElMessage } from 'element-plus'
import type { PageRecord } from '@/types/page'

defineOptions({ name: 'MiniPreviewCheck' })

type PreviewMode = 'draft' | 'live'

const PREVIEW_MODES: Array<{ key: PreviewMode; title: string; desc: string; icon: string }> = [
  { key: 'draft', title: '草稿预览', desc: '含未发布的改动，仅管理员可见', icon: 'pen' },
  { key: 'live', title: '线上预览', desc: '用户当前看到的样子', icon: 'eye' },
]

const router = useRouter()
const { stages, facts, loading, loaded, refresh } = useBuildWorkbench()
const site = ref<MiniSiteVO>({})
const pages = ref<PageRecord[]>([])
const qrVisible = ref(false)
const previewMode = ref<PreviewMode>('draft')
const targetPath = ref('')
/** 🔴 页面列表读取失败：非空时体检不可用，不能显示 0 */
const scanError = ref('')

/**
 * 阻止发布的问题 = **全部环节**的阻断项，不只是 preflight。
 *
 * 🔴 2026-10-06 修复「工作台有阻断项，预览检查却显示已完成」：
 * 原来只取 previewStage（= judgePreview）的 issues，而它只看后端 preflight。
 * 但真正会挡住发布的是整个搭建链路上的阻断项（导航指向不存在的页面、
 * 页面列表读不到、没有任何可用页面…），那些判定在别的环节里。
 * 结果就是：工作台列了 3 个阻断，预览页却写「0 个阻止发布的问题」。
 * 现在按环节分组汇总，来源与工作台完全同源（同一个 useBuildWorkbench）。
 */
const stageIssues = computed<StageIssue[]>(() =>
  stages.value.flatMap((s) => s.issues || []),
)

const blockingItems = computed<StageIssue[]>(() =>
  stageIssues.value.filter((i) => i.level === 'blocking'),
)
const warningItems = computed<StageIssue[]>(() =>
  stageIssues.value.filter((i) => i.level === 'warning'),
)
const blockingTotal = computed(() => blockingItems.value.length)
const warningTotal = computed(() => warningItems.value.length)
const pendingCount = computed(() => Number(facts.value.pendingCount || 0))

/** preflight 自身的结论（可能为 null = 接口没返回） */
const preflightOnly = computed(() => {
  const pre = facts.value.preflight
  if (!pre) return { available: false, blocking: 0, warnings: 0, canPublish: null as boolean | null }
  return {
    available: true,
    blocking: (pre.blocking || []).length,
    warnings: (pre.warnings || []).length,
    canPublish: pre.canPublish ?? null,
  }
})

const verdictClass = computed(() => {
  if (blockingTotal.value) return 'verdict-block'
  if (warningTotal.value) return 'verdict-warn'
  return 'verdict-ok'
})
const verdictIcon = computed(() => {
  if (blockingTotal.value) return 'x'
  if (warningTotal.value) return 'warn'
  return 'check'
})
const verdictTitle = computed(() => {
  if (blockingTotal.value) return `有 ${blockingTotal.value} 个问题会阻止发布`
  if (warningTotal.value) return `可以发布，有 ${warningTotal.value} 条提醒`
  return pendingCount.value > 0 ? '检查通过，可以发布' : '检查通过，当前没有待发布改动'
})
const verdictDesc = computed(() => {
  // 🔴 两个来源都要说清，不能只报 preflight：
  // 后端 preflight 不校验「导航指向的页面是否存在」这类跨表依赖，
  // 只看它会漏掉真正挡发布的问题。
  const pf = preflightOnly.value
  const parts: string[] = []
  parts.push(
    pf.available
      ? `后端发布前检查：${pf.blocking ? `${pf.blocking} 项阻断` : pf.canPublish === false ? '判定不可发布' : '通过'}`
      : '后端发布前检查：接口未返回结果，无法确认',
  )
  parts.push(`搭建链路自检：${blockingTotal.value ? `${blockingTotal.value} 项阻断` : '无阻断'}`)
  if (blockingTotal.value) parts.push('两者都需处理')
  return parts.join(' · ')
})
function goIssue(issue: StageIssue) {
  if (issue.action?.to) router.push(issue.action.to)
  else if (issue.action?.event === 'reload') void load()
  else ElMessage.info(issue.action?.label || '请到搭建工作台查看该环节')
}

/* ---------------- 内容体检 ---------------- */

const scan = computed(() => {
  const list = pages.value
  const known = new Set(list.map((p: any) => pagePathKey(p.path)))
  const details: string[] = []

  // 🔴 数据读不到时不能报 0，也不能报「失效链接」——只能报无法核对。
  if (scanError.value) {
    return {
      unverifiable: true as const,
      brokenLink: 0,
      emptyPage: 0,
      noname: 0,
      offline: 0,
      details: [] as string[],
    }
  }

  // 失效链接：导航指向的页面路径不存在
  let brokenLink = 0
  for (const t of (site.value.tabBar || []) as any[]) {
    const label = String(t.text || '未命名导航')
    const path = pagePathKey(t.pagePath)
    const pid = pageKey(t.pageId)
    if (!path && !pid) {
      brokenLink += 1
      details.push(`导航「${label}」没有绑定任何页面`)
      continue
    }
    // 🔴 内置壳页本来就不在 mp_page，不能算失效链接
    if (!pid && isBuiltinShellPath(path)) continue
    if (pid) {
      if (!list.some((p: any) => pageKey(p.id) === pid)) {
        brokenLink += 1
        details.push(`导航「${label}」指向的页面已不存在（${path || `ID ${pid}`}）`)
      }
    } else if (!known.has(path)) {
      brokenLink += 1
      details.push(`导航「${label}」指向的路径没有对应页面（${path}）`)
    }
  }

  // 空内容 / 缺名称 / 下线
  let emptyPage = 0
  let noname = 0
  let offline = 0
  for (const p of list as any[]) {
    const st = resolvePageStatus(p)
    if (st === 'offline') { offline += 1; continue }
    if (st !== 'live') continue
    if (!String(p.name || '').trim()) {
      noname += 1
      details.push(`已上线页面「${p.path}」没有名称`)
    }
    if (!String(p.name || '').trim() && !String(p.description || '').trim()) {
      emptyPage += 1
    }
  }

  // 刻意不统计「需登录才能访问」：mp_page 没有访问控制列
  // （查过 V3/V72/V79 迁移），页面级登录要求当前无处可配，
  // 放个恒为 0 的指标等于骗人。要做这个能力得先加字段。
  return { unverifiable: false as const, brokenLink, emptyPage, noname, offline, details: details.slice(0, 8) }
})

/* ---------------- 预览 ---------------- */

const navTargets = computed(() => (site.value.tabBar || []) as any[])

const pageTargets = computed(() =>
  pages.value
    .filter((p: any) => resolvePageStatus(p) === 'live')
    .slice(0, 60)
    .map((p: any) => ({ id: p.id, name: p.name, path: p.path })),
)

function buildUrl(source: 'draft' | 'live') {
  const query: Record<string, string> = { view: 'config', source, embed: '1' }
  const screen = targetPath.value || navTargets.value[0]?.pagePath
  if (screen) query.screen = String(screen).replace(/^\//, '')
  return router.resolve({ path: '/h5/miniapp-preview', query }).href
}

const previewUrl = computed(() => buildUrl('draft'))
const previewUrlLive = computed(() => buildUrl('live'))
const previewKey = computed(() => `chk-${previewMode.value}-${targetPath.value}`)

const previewHint = computed(() => {
  if (blockingTotal.value) return `有 ${blockingTotal.value} 个问题会阻止发布，预览仅供参考`
  if (previewMode.value === 'draft' && pendingCount.value) {
    return `草稿预览 · 含 ${pendingCount.value} 项未发布改动`
  }
  return previewMode.value === 'draft' ? '草稿预览 · 与线上一致' : '线上预览 · 用户当前看到的'
})

function openNewWindow() {
  const url = previewMode.value === 'draft' ? previewUrl.value : previewUrlLive.value
  window.open(url, '_blank', 'noopener,noreferrer')
}

/* ---------------- 加载 ---------------- */

async function load() {
  await refresh()
  const siteData = await getMiniSite('draft').catch(() => ({}))
  site.value = siteData || {}
  // 🔴 统一走 loadAllPages。原来 size:200 被后端拒绝（上限 100）→ 列表空 →
  // scan 全是 0/或误报，同时又因为 preflight 独立成功而显示「检查通过」，
  // 于是出现「检查通过 + 4 个失效链接」的自相矛盾。
  const cat = await loadAllPages()
  if (cat.status === 'error') {
    scanError.value = cat.error || '页面列表读取失败'
    pages.value = []
  } else {
    pages.value = cat.pages
  }
  previewMode.value = Number(facts.value.pendingCount || 0) > 0 ? 'draft' : 'live'
}

function runChecks() {
  void load()
}

onMounted(load)
</script>

<style scoped lang="scss">
.check-cols {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.verdict { border-left: 3px solid var(--acc, #b4430f); }

.verdict-block { border-left-color: #b42828; background: rgba(180, 40, 40, 0.04); }
.verdict-warn { border-left-color: #b46e0f; background: rgba(180, 110, 15, 0.04); }
.verdict-ok { border-left-color: #2f7d4f; background: rgba(47, 125, 79, 0.04); }

.verdict-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.verdict-ic {
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.05);
}

.verdict-block .verdict-ic { background: rgba(180, 40, 40, 0.12); color: #972626; }
.verdict-warn .verdict-ic { background: rgba(180, 110, 15, 0.12); color: #8f580c; }
.verdict-ok .verdict-ic { background: rgba(47, 125, 79, 0.12); color: #24673f; }

.verdict-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong { font-size: 15px; }

  .faint { font-size: 12px; line-height: 1.5; }
}

.issue-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.issue {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 12.5px;
}

.issue-block { background: rgba(180, 40, 40, 0.06); }
.issue-warn { background: rgba(180, 110, 15, 0.07); }

.issue-ic {
  flex: none;
  margin-top: 2px;
}

.issue-block .issue-ic { color: #972626; }
.issue-warn .issue-ic { color: #8f580c; }

.issue-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.issue-text {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.55;
}

/* 问题来自哪个环节：同一个问题在工作台与预览页都要能定位到来源 */
.issue-stage {
  display: inline-block;
  margin-right: 6px;
  padding: 1px 6px;
  border-radius: 5px;
  font-size: 10.5px;
  background: rgba(0, 0, 0, 0.06);
  color: var(--wb-muted, #6d6559);
  vertical-align: 1px;
}

.ok-empty {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
  color: #2f7d4f;
}

.preview-modes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 9px;
}

.pm-card {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-start;
  text-align: left;
  padding: 11px 12px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 10px;
  background: transparent;
  cursor: pointer;

  &:hover { border-color: rgba(180, 67, 15, 0.4); }

  &.on {
    border-color: var(--acc, #b4430f);
    background: rgba(180, 67, 15, 0.05);
  }
}

.pm-ic { color: var(--acc, #b4430f); }
.pm-t { font-size: 13.5px; font-weight: 600; }
.pm-d { font-size: 11.5px; line-height: 1.5; }

.target-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 13px;
  font-size: 12.5px;
  flex-wrap: wrap;
}

.target-select { width: 300px; }

.preview-ops {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-top: 11px;
  flex-wrap: wrap;
}

.preview-url-note { font-size: 11px; }

.scan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}

.scan-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 9px 11px;
  border: 1px solid var(--wb-line, #e6e0d6);
  border-radius: 9px;

  strong { font-size: 18px; }

  .bad { color: #972626; }
  .good { color: #2f7d4f; }
  .warn { color: #8f580c; }
}

.scan-list {
  margin: 10px 0 0;
  padding-left: 18px;
  font-size: 12px;
  line-height: 1.8;
  color: var(--wb-text, #3d3630);
}

/* 🔴 体检不可用 / 与 preflight 结论冲突时的提示 */
.scan-unverified,
.scan-conflict {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  padding: 10px 12px;
  border-radius: 9px;
  font-size: 12.5px;
  line-height: 1.6;

  > div {
    display: flex;
    flex-direction: column;
    gap: 5px;
    align-items: flex-start;
  }

  strong { font-size: 13px; }

  .faint { font-size: 11.5px; }
}

.scan-unverified {
  background: rgba(180, 40, 40, 0.06);
  color: #972626;
}

.scan-conflict {
  margin-top: 12px;
  background: rgba(180, 110, 15, 0.08);
  color: #8f580c;
}
</style>