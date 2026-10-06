import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getMiniSite, type MiniSiteVO } from '@/api/miniSite'
import { useBuildWorkbench, type StageIssue } from '@/composables/useBuildWorkbench'
import { loadAllPages, pageKey, pagePathKey, isBuiltinShellPath } from '@/composables/usePageCatalog'
import { resolvePageStatus } from '@/utils/pageStatus'
import { findMockLeak } from '@/components/page-builder/columnConfig'
import type { PageRecord } from '@/types/page'

/**
 * ============================================================================
 * 发布前检查（Preview & Check）
 * ============================================================================
 *
 * 抽成 composable 而不是留在页面里，原因是**要同时被两处消费**：
 *   ·搭建工作台（新增的「预览检查」环节）
 *   · 旧 preview-check 独立页（保留作深链接，防止旧书签失效）
 * 两处必须**同源** —— 2026-10-06 出现过「工作台有阻断、预览页显示已完成」，
 * 根因就是两处各自算了一套。以后谁改这里，两边一起变。
 *
 * 🔴 三条不妥协的约束（都来自 2026-10-06 事故复盘）：
 *   1. 读取失败 ≠ 没有页面：scanError 非空时不能显示 0；
 *   2. preflight 拿不到 ≠ 0 阻断：要显示「无法确认」；
 *   3. 阻止发布 = 后端 preflight 阻断 ∪ 搭建链路自检阻断
 *      （只看 preflight 会漏跨表依赖，比如导航指向的页面是否真的存在）。
 */
export type PreviewMode = 'draft' | 'live'

export const PREVIEW_MODES: Array<{ key: PreviewMode; title: string; desc: string; icon: string }> = [
  { key: 'draft', title: '草稿预览', desc: '含未发布的改动，仅管理员可见', icon: 'pen' },
  { key: 'live', title: '线上预览', desc: '用户当前看到的样子', icon: 'eye' },
]

export type ContentScan = {
  /** 导航指向的路径在页面清单里找不到 */
  brokenLink: number
  /** 已上线但既无名称也无描述的可疑空页 */
  emptyPage: number
  /** 已上线但没有名称 */
  noname: number
  /** 已下线页面数 */
  offline: number
  details: string[]
}

export function usePreviewCheck() {
  const wb = useBuildWorkbench()
  const site = ref<MiniSiteVO>({})
  const pages = ref<PageRecord[]>([])
  /** 🔴 页面列表读取失败：非空时体检不可用，绝不能显示 0 */
  const scanError = ref('')

  const previewMode = ref<PreviewMode>('draft')
  const targetPath = ref('')

  const loaded = computed(() => wb.loaded.value)
  const loading = computed(() => wb.loading.value)

  async function load() {
    await wb.refresh(true)
    try {
      site.value = (await getMiniSite('draft')) || {}
    } catch {
      site.value = {}
    }
    const cat = await loadAllPages()
    if (cat.status === 'error') {
      scanError.value = cat.error || '页面清单读取失败'
      pages.value = []
    } else {
      scanError.value = ''
      pages.value = cat.pages
    }
    // 默认打开草稿；有未发布改动时才提示差异，否则直接看线上更真实
    previewMode.value = Number(wb.facts.value.pendingCount || 0) > 0 ? 'draft' : 'live'
  }

  /* ── 内容体检 ──────────────────────────────────────────────────────────
     刻意**不统计「需登录才能访问」**：mp_page 没有访问控制列
     （查过 V3/V72/V79 迁移），页面级登录要求当前无处可配，
     放个恒为 0 的指标等于骗人。要做这个能力得先加字段。 */
  const scan = computed<ContentScan>(() => {
    if (scanError.value) {
      return { brokenLink: 0, emptyPage: 0, noname: 0, offline: 0, details: [] }
    }
    const list = pages.value
    const known = new Set(list.map((p) => '/' + pagePathKey(p?.path)))
    const details: string[] = []

    // 失效链接：导航指向的页面不存在
    let brokenLink = 0
    for (const t of (site.value.tabBar || []) as any[]) {
      const path = '/' + pagePathKey(t.pagePath)
      if (!path) continue
      const pid = pageKey(t.pageId)
      if (pid) {
        if (!list.some((p) => pageKey(p.id) === pid)) {
          brokenLink += 1
          details.push(`导航「${t.text}」指向的页面已不存在（${path}）`)
        }
      } else if (!isBuiltinShellPath(path) && !known.has(path)) {
        // 🔴 内置壳页（首页/我的/星球…）本就不在 mp_page 里，
        //    "查不到"是正常的，不能报失效 —— 这正是「导航误报 4 个页面不存在」的成因。
        brokenLink += 1
        details.push(`导航「${t.text}」指向的路径没有对应页面（${path}）`)
      }
    }

    // 空内容 / 缺名称 / 下线
    let emptyPage = 0
    let noname = 0
    let offline = 0
    for (const p of list) {
      const st = resolvePageStatus(p)
      if (st === 'offline') {
        offline += 1
        continue
      }
      if (st !== 'live') continue
      if (!String(p.name || '').trim()) {
        noname += 1
        details.push(`已上线页面「${p.path}」没有名称`)
      }
      if (!String(p.name || '').trim() && !String((p as any).description || '').trim()) {
        emptyPage += 1
      }
    }

    return { brokenLink, emptyPage, noname, offline, details: details.slice(0, 8) }
  })

  /* ── 演示数据 / 占位文案漏出（2026-10-06 新增）────────────────────────
     诊断报告里「精品专栏显示『专栏名称示例一』」的根因：
     `previewMockEnabled` 缺省返回 true，没配专栏的页面也会冒出演示数据。
     已在 columnConfig.ts 修成缺省 false；
     这里再补一道**发布前体检** —— 靠人眼在长页面里找「示例/占位」不可靠。 */
  const mockLeaks = computed<string[]>(() => {
    if (scanError.value) return []
    const out: string[] = []
    for (const p of pages.value) {
      // 只看已上线页：草稿页的 mock 是编辑期的正常需要
      if (resolvePageStatus(p) !== 'live') continue
      const dsl = (p as any).dsl
      if (!dsl || typeof dsl !== 'object') continue
      try {
        const hits = findMockLeak(dsl as Record<string, any>)
        for (const h of hits) out.push(`「${p.name || p.path}」${h}`)
      } catch {
        // DSL 解析失败不是体检失败，跳过这一页
      }
    }
    return out.slice(0, 8)
  })

  /* ── 发布资格 ──────────────────────────────────────────────────────────
     = 后端 preflight 阻断 ∪ 搭建链路自检阻断 */
  const stageIssues = computed<StageIssue[]>(() =>
    wb.stages.value.flatMap((s) => s.issues),
  )

  const blockers = computed<StageIssue[]>(() =>
    stageIssues.value.filter((i) => i.level === 'blocking'),
  )
  const warnings = computed<StageIssue[]>(() => {
    const base = stageIssues.value.filter((i) => i.level === 'warning')
    // 把「演示数据漏出」也并进提醒。
    // ⚠️ 刻意**不作为阻断**：存量 DSL 里可能还开着 preview_mock，
    //    阻断会让这些页面直接发不出去（更糟）。
    //    提醒 + 体检面板列出，既能看见也不卡住发布。
    for (const text of mockLeaks.value) {
      base.push({
        level: 'warning',
        text,
        // label 是必填（按钮上的文案），不能只给 to
        action: { label: '去清理', to: '/mini/pages' },
      })
    }
    return base
  })

  /** preflight 拿不到时为 null —— 不能用空数组冒充「检查通过」 */
  const preflightKnown = computed(() => wb.facts.value.preflight != null)

  const canPublish = computed(() => blockers.value.length === 0 && preflightKnown.value)

  const verdictTitle = computed(() => {
    if (!preflightKnown.value) return '暂时无法确认是否可以发布'
    if (blockers.value.length) return `有 ${blockers.value.length} 个问题会阻止发布`
    if (warnings.value.length) return `可以发布，有 ${warnings.value.length} 条提醒`
    return wb.facts.value.pendingCount > 0 ? '检查通过，可以发布' : '检查通过，当前没有待发布改动'
  })

  const verdictDesc = computed(() => {
    if (!preflightKnown.value) return '发布前检查服务本次未返回结果，请稍后重试'
    if (blockers.value.length) return '处理完左侧问题后，这里会变成可以发布'
    if (wb.facts.value.pendingCount > 0) return `将发布 ${wb.facts.value.pendingCount} 项改动`
    return '线上已是最新状态'
  })

  /** 内容体检与发布资格的一致性提示：体检有失效链接但判定可发布 → 自相矛盾，必须说清 */
  const scanConflict = computed(() => {
    if (scanError.value) return ''
    if (scan.value.brokenLink > 0 && canPublish.value) {
      return `内容体检发现 ${scan.value.brokenLink} 个失效导航链接，但发布检查未把它们列为阻断项。请先修复导航绑定。`
    }
    return ''
  })

  watch(
    () => wb.facts.value.pendingCount,
    (n) => {
      if (Number(n || 0) === 0) previewMode.value = 'live'
    },
  )

  /* ── 预览地址 ──────────────────────────────────────────────────────────
     🔴 URL 构造必须只有这一份：它同时被 iframe 的 src 与「新窗口打开」用，
     两处各写一遍迟早会出现"iframe 里是草稿、新窗口里是线上"这种极难查的问题。 */
  const router = useRouter()

  const navTargets = computed(() =>
    ((site.value.tabBar || []) as any[])
      .filter((t) => (t as any).enabled !== false)
      .map((t) => ({ pagePath: t.pagePath, text: t.text })),
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
    if (blockers.value.length) return `有 ${blockers.value.length} 个问题会阻止发布，预览仅供参考`
    const pending = Number(wb.facts.value.pendingCount || 0)
    if (previewMode.value === 'draft' && pending) {
      return `草稿预览 · 含 ${pending} 项未发布改动`
    }
    return previewMode.value === 'draft' ? '草稿预览 · 与线上一致' : '线上预览 · 用户当前看到的'
  })

  return {
    // 数据
    wb,
    site,
    pages,
    scanError,
    loaded,
    loading,
    // 预览
    previewMode,
    targetPath,
    previewUrl,
    previewUrlLive,
    previewKey,
    previewHint,
    navTargets,
    // 判定
    scan,
    mockLeaks,
    blockers,
    warnings,
    preflightKnown,
    canPublish,
    verdictTitle,
    verdictDesc,
    scanConflict,
    // 动作
    load,
    refresh: wb.refresh,
  }
}