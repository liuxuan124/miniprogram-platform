/**
 * 页面目录（Page Catalog）—— 全站唯一的页面数据读取入口
 *
 * ============================ 为什么必须有这个文件 ============================
 * 2026-10-06 线上事故：「页面搭建显示 42 个 / 同页全部筛选 2 / 页面配置 0 /
 * 导航配置报 4 个页面不存在 / 绑定选择器显示原始值 28 且下拉无数据」。
 *
 * 根因（不是显示问题，是接口调用问题）：
 *   后端 PageDTO.normalize() 明确规定 `pageSize > 100 直接抛 BusinessException(100101)`。
 *   而前端有 6 处传了 size=200/300/500：
 *     useBuildWorkbench.ts:219 (200) · navigation.vue:831 (200)
 *     preview-check.vue:387 (200) · page-config.vue:371 (300)
 *     editor.vue:1072 (500) · applyPageTemplate.ts:57,65 (200/300)
 *   接口报错后，各处又都写成 `d?.records || d?.list || []`，
 *   于是**错误响应被静默降级成空数组**——
 *   页面配置拿到 [] → 显示 0；
 *   导航配置拿到 [] → 对账全部失败 → 误报「页面不存在」；
 *   工作台拿到 [] → 判定「没有任何可用页面」。
 *   一个参数错误，污染了 4 个页面的结论。
 *
 * ============================ 本文件的职责 ============================
 * 1. 拉全量：自动分页（每页 ≤100），不再让调用方猜后端的上限；
 * 2. 解析统一：兼容 records / list / 裸数组三种形状；
 * 3. 🔴 状态可辨：loadAllPages 返回 { status, pages, error }，
 *    **加载失败绝不冒充空列表**——这是本文件最重要的约束；
 * 4. 引用归一：ID 与路径统一成字符串并统一去前导斜杠，
 *    避免 '28' vs 28 vs ' 28' 这类对账失败。
 *
 * 调用方禁止再直接 getPageList({size:200})。要改数据读取，改这里。
 */
import { getPageList } from '@/api/page'
import type { PageRecord } from '@/types/page'

/** 后端硬上限（PageDTO.normalize 校验），超过直接抛 100101 */
const PAGE_SIZE_LIMIT = 100

export type PageCatalogStatus = 'loading' | 'ready' | 'error'

export type PageCatalog = {
  status: PageCatalogStatus
  /** 仅 status==='ready' 时可信；error 时为 []，调用方必须先看 status */
  pages: PageRecord[]
  /** 后端报告的总条数（用于分页判断） */
  total: number
  error: string
  /** 是否读完了所有页 */
  complete: boolean
}

/**
 * 从各种可能的响应形状里取出记录数组。
 * 后端 PageResult 用 records；历史上还有 list / 裸数组的写法，都兼容。
 * 🔴 注意：这里**不把「取不到」等同于「空」**——返回 null 交给调用方区分。
 */
function extractRecords(payload: unknown): { rows: PageRecord[]; total: number } | null {
  const d = (payload as any)?.data ?? payload
  if (d == null) return null

  if (Array.isArray(d)) {
    return { rows: d as PageRecord[], total: (payload as any)?.total ?? d.length }
  }
  if (Array.isArray(d.records)) {
    return { rows: d.records as PageRecord[], total: Number(d.total ?? d.records.length) }
  }
  if (Array.isArray(d.list)) {
    return { rows: d.list as PageRecord[], total: Number(d.total ?? d.list.length) }
  }
  // 有响应但结构不认识 —— 返回 null 让调用方报错，而不是假装 0 条
  return null
}

/** 归一化 ID：'28' / 28 / ' 28 ' 一律成 '28'；空值成 '' */
export function pageKey(id: unknown): string {
  if (id == null) return ''
  return String(id).trim()
}

/** 归一化路径：去前导斜杠 + 去空白。'pages/x' 与 '/pages/x' 视为同一条 */
export function pagePathKey(path: unknown): string {
  return String(path ?? '').trim().replace(/^\/+/, '')
}

/** 给 <el-option :value> 用的稳定 key（避免 number/string 混用导致选中态失效） */
export function pageOptionValue(p: PageRecord): string {
  return `p${pageKey(p.id)}`
}

/** 只要 id 就能算出 option value，不必构造完整 PageRecord（省掉一次类型断言） */
export function pageOptionValueById(id: unknown): string {
  return `p${pageKey(id)}`
}

/**
 * 小程序内置的 Tab 壳页（原生渲染，不在 mp_page 表里）。
 *
 * 2026-10-06 误报「首页/内容/星球/商城对应页面不存在」的根因之一：
 * 这些路径本来就不存在于 mp_page，用「查不到即不存在」判定必然全错。
 * 单一真相源放这里，状态机与导航配置页共用，避免两处各写一份又漂移。
 */
const BUILTIN_SHELL_PATHS = new Set([
  'pages/index/index',
  'pages/discover/discover',
  'pages/planet/planet',
  'pages/shop/shop',
  'pages/mine/mine',
  'pages/login/login',
  'pages/search/search',
])

export function isBuiltinShellPath(path: unknown): boolean {
  return BUILTIN_SHELL_PATHS.has(pagePathKey(path))
}

/**
 * 从 el-select 的 value 反解出页面。
 * 🔴 2026-10-06 事故里「绑定选择器显示原始值 28」就是这么来的：
 * 选项 value 是 Number(id)，而编辑态从后端读回的可能是字符串 '28'，
 * 两者不相等 → el-select 匹配不到 → 直接把原始值显示出来。
 * 现在 value 统一走 pageOptionValue()，反解也只认这一种格式。
 */
export function pageFromOptionValue(value: unknown, pages: PageRecord[]): PageRecord | null {
  const v = String(value ?? '')
  if (!v) return null
  const id = v.startsWith('p') ? v.slice(1) : v
  return pages.find((p) => pageKey(p.id) === id) || null
}

/**
 * 拉取全部页面（自动分页）。
 *
 * @param keyword 可选关键词过滤
 * @param maxPages 最多翻多少页，防止后端 total 异常时无限循环
 * @param fetcher 可注入的取数函数（默认 getPageList）。
 *   🔴 之所以留这个口子：分页上限、错误降级这些行为必须能被单测覆盖，
 *   而 vi.doMock 对已 import 的模块不生效（模块缓存），靠 mock 测不到真实分支。
 *   注入 fetcher 后，测试能真正验证「size 不超限」「失败返回 error 而非空列表」。
 */
export async function loadAllPages(
  keyword?: string,
  maxPages = 20,
  fetcher: (params: Record<string, unknown>) => Promise<unknown> = getPageList as any,
): Promise<PageCatalog> {
  const all: PageRecord[] = []
  let total = 0
  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const res = await fetcher({
        current: page,
        // 🔴 绝不能超过 PAGE_SIZE_LIMIT，否则后端抛 100101
        size: PAGE_SIZE_LIMIT,
        keyword: keyword || undefined,
      })
      const got = extractRecords(res)
      if (!got) {
        // 结构不认识：宁可报错，也不要把「看不懂」当成「没有」
        return {
          status: 'error',
          pages: [],
          total,
          error: '页面列表返回结构无法识别',
          complete: false,
        }
      }
      total = got.total
      all.push(...got.rows)
      if (all.length >= total || !got.rows.length) {
        return { status: 'ready', pages: all, total, error: '', complete: true }
      }
    }
    return {
      status: 'ready',
      pages: all,
      total,
      error: '',
      complete: all.length >= total,
    }
  } catch (e: unknown) {
    return {
      status: 'error',
      pages: [],
      total: 0,
      error: e instanceof Error ? e.message : '页面列表读取失败',
      complete: false,
    }
  }
}

/**
 * 引用解析：判断某个 pageId / path 是否指向一个真实存在的页面。
 *
 * 2026-10-06 之前，导航校验因为列表是空的就报「页面不存在」——
 * 实际上页面都在，是数据没读到。这里把「查不到」和「不存在」严格分开：
 *   - catalog.status === 'error' → 返回 'unknown'（无法确认，不下结论）
 *   - 查得到 → 'ok'
 *   - 查不到且列表完整 → 'missing'（这时才算真的不存在）
 */
export type RefResolve = 'ok' | 'missing' | 'unknown'

export function resolveRef(
  catalog: PageCatalog,
  ref: { pageId?: unknown; pagePath?: unknown },
): RefResolve {
  if (catalog.status !== 'ready') return 'unknown'
  const id = pageKey(ref.pageId)
  const path = pagePathKey(ref.pagePath)
  if (!id && !path) return 'missing'

  const hit = catalog.pages.find((p) => {
    if (id && pageKey(p.id) === id) return true
    if (path && pagePathKey(p.path) === path) return true
    return false
  })
  return hit ? 'ok' : 'missing'
}

/** 反解页面名（用于导航项显示可读名称，而不是裸 ID） */
export function pageNameByRef(
  catalog: PageCatalog,
  ref: { pageId?: unknown; pagePath?: unknown },
  fallback = '未绑定页面',
): string {
  const id = pageKey(ref.pageId)
  const path = pagePathKey(ref.pagePath)
  const hit = catalog.pages.find((p) => {
    if (id && pageKey(p.id) === id) return true
    if (path && pagePathKey(p.path) === path) return true
    return false
  })
  if (!hit) return fallback
  return String(hit.name || hit.path || fallback)
}
