import { ElMessageBox } from 'element-plus'
import { createPage, getPageList, saveDraft } from '@/api/page'
import { getMiniSite } from '@/api/miniSite'
import type { PageDSL } from '@/types/page'
import { defaultPageNameFromTemplate } from '@/utils/pageTemplateMeta'

const PAGE_TYPE_MAP: Record<string, number> = {
  home: 1,
  topic: 2,
  activity: 2,
  custom: 3,
}

export type HomeApplyMode = 'replace_home' | 'custom_page'

export type ApplyTemplateInput = {
  name: string
  category?: string
  dsl: PageDSL
}

export type ApplyTemplateOptions = {
  /** 已选首页处理方式时传入，跳过弹窗 */
  homeMode?: HomeApplyMode
  homePageId?: number
}

export function isHomePageTemplate(input: ApplyTemplateInput): boolean {
  const pageTypeStr = String(input.dsl?.page?.type || input.category || 'custom').toLowerCase()
  return pageTypeStr === 'home'
}

export async function askHomeApplyMode(): Promise<HomeApplyMode | null> {
  try {
    await ElMessageBox.confirm(
      '这是「首页」类模板。替换会写入当前首页草稿（发布前不影响线上）；新建为普通页则创建独立自定义页。',
      '如何使用这套首页模板？',
      {
        confirmButtonText: '替换当前首页',
        cancelButtonText: '新建为普通页',
        distinguishCancelAndClose: true,
        type: 'warning',
      },
    )
    return 'replace_home'
  } catch (action) {
    if (action === 'cancel') return 'custom_page'
    return null
  }
}

async function resolveHomePageId(explicit?: number): Promise<number> {
  if (explicit && explicit > 0) return explicit
  const site = await getMiniSite('draft').catch(() => null)
  const fromSite = Number(site?.miniappHomePageId || 0)
  if (fromSite > 0) return fromSite
  const res = await getPageList({ current: 1, size: 200 })
  const records = ((res as any)?.data?.records || (res as any)?.data?.list || []) as Array<{ id: number; type?: number; path?: string }>
  const home = records.find((p) => p.type === 1 || String(p.path || '').includes('index/index'))
  if (home?.id) return Number(home.id)
  throw new Error('未找到当前首页，请先在「页面管理」确认首页存在')
}

async function uniquePageName(base: string): Promise<string> {
  const res = await getPageList({ current: 1, size: 300 })
  const records = ((res as any)?.data?.records || (res as any)?.data?.list || []) as Array<{ name?: string }>
  const names = new Set(records.map((r) => String(r.name || '').trim()).filter(Boolean))
  let candidate = base.trim() || '新页面'
  if (!names.has(candidate)) return candidate
  let i = 2
  while (names.has(`${candidate}(${i})`)) i += 1
  return `${candidate}(${i})`
}

function buildDsl(
  input: ApplyTemplateInput,
  pageId: number,
  pageName: string,
  path: string,
  pageType: string,
): PageDSL {
  return {
    ...input.dsl,
    schema_version: input.dsl.schema_version || '1.0',
    page: {
      ...(input.dsl.page || {}),
      id: String(pageId),
      name: pageName,
      type: pageType,
      path,
      background_color: input.dsl.page?.background_color || '#f6f8fb',
      share_title: input.dsl.page?.share_title || pageName,
    },
    components: input.dsl.components,
    global_config: input.dsl.global_config || { pull_refresh: false, reach_bottom_load: false },
  }
}

/**
 * 使用模板创建/更新页面并写入 DSL 草稿。
 */
export async function applyPageTemplate(
  input: ApplyTemplateInput,
  opts: ApplyTemplateOptions = {},
): Promise<number> {
  if (!input.dsl || !Array.isArray(input.dsl.components)) {
    throw new Error('模板内容无效，缺少组件配置')
  }

  const baseName = defaultPageNameFromTemplate(input.name || '新页面')
  let homeMode: HomeApplyMode | undefined = opts.homeMode
  if (isHomePageTemplate(input) && !homeMode) {
    const picked = await askHomeApplyMode()
    if (!picked) throw new UserCancelError()
    homeMode = picked
  }

  if (isHomePageTemplate(input) && homeMode === 'replace_home') {
    const homePageId = await resolveHomePageId(opts.homePageId)
    const pageName = baseName.includes('首页') ? baseName : `${baseName}`
    const path = 'pages/index/index'
    const dsl = buildDsl(input, homePageId, pageName, path, 'home')
    await saveDraft(homePageId, dsl)
    return homePageId
  }

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
  const pageName = await uniquePageName(baseName)
  const path = `pages/custom/tpl-${suffix}`
  const pageTypeStr = homeMode === 'custom_page' ? 'custom' : String(input.dsl.page?.type || 'custom')
  const apiType = homeMode === 'custom_page' ? 3 : (PAGE_TYPE_MAP[pageTypeStr] ?? 3)

  const createRes = await createPage({
    name: pageName,
    type: apiType,
    path,
    shareTitle: input.dsl.page?.share_title || pageName,
  })

  const newPageId = Number((createRes.data as any)?.id || (createRes.data as any)?.pageId || 0)
  if (!newPageId) {
    throw new Error('创建页面失败：未返回页面 ID')
  }

  const effectiveType = homeMode === 'custom_page' ? 'custom' : (input.dsl.page?.type || 'custom')
  const dsl = buildDsl(input, newPageId, pageName, path, String(effectiveType))
  await saveDraft(newPageId, dsl)
  return newPageId
}

export class UserCancelError extends Error {
  constructor() {
    super('cancel')
    this.name = 'UserCancelError'
  }
}

export function isUserCancelError(err: unknown): boolean {
  if (err instanceof UserCancelError) return true
  if (err === 'cancel' || err === 'close') return true
  if (err && typeof err === 'object' && 'action' in err) {
    const action = String((err as any).action || '')
    return action === 'cancel' || action === 'close'
  }
  return false
}
