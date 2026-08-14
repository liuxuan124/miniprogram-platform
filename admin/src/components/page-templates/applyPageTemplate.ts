import { createPage, saveDraft } from '@/api/page'
import type { PageDSL } from '@/types/page'

const PAGE_TYPE_MAP: Record<string, number> = {
  home: 1,
  topic: 2,
  activity: 2,
  custom: 3,
}

export type ApplyTemplateInput = {
  name: string
  category?: string
  dsl: PageDSL
}

/**
 * 使用模板创建页面并写入 DSL 草稿。
 * 后端 createPage 不接收 dsl，必须再调 saveDraft。
 */
export async function applyPageTemplate(input: ApplyTemplateInput): Promise<number> {
  if (!input.dsl || !Array.isArray(input.dsl.components)) {
    throw new Error('模板内容无效，缺少组件配置')
  }

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
  const pageName = `${input.name}-${suffix.slice(-4)}`
  // 始终使用唯一 path，避免与已有首页/专题路径冲突
  const path = `pages/custom/tpl-${suffix}`
  const pageTypeStr = String(input.dsl.page?.type || 'custom')

  const createRes = await createPage({
    name: pageName,
    type: PAGE_TYPE_MAP[pageTypeStr] ?? 3,
    path,
    shareTitle: input.dsl.page?.share_title || input.name,
  })

  const newPageId = Number((createRes.data as any)?.id || (createRes.data as any)?.pageId || 0)
  if (!newPageId) {
    throw new Error('创建页面失败：未返回页面 ID')
  }

  const dsl: PageDSL = {
    ...input.dsl,
    schema_version: input.dsl.schema_version || '1.0',
    page: {
      ...(input.dsl.page || {}),
      id: String(newPageId),
      name: pageName,
      type: input.dsl.page?.type || 'custom',
      path,
      background_color: input.dsl.page?.background_color || '#f6f8fb',
      share_title: input.dsl.page?.share_title || input.name,
    },
    components: input.dsl.components,
    global_config: input.dsl.global_config || { pull_refresh: false, reach_bottom_load: false },
  }

  await saveDraft(newPageId, dsl)
  return newPageId
}

export function isUserCancelError(err: unknown): boolean {
  if (err === 'cancel' || err === 'close') return true
  if (err && typeof err === 'object' && 'action' in err) {
    const action = String((err as any).action || '')
    return action === 'cancel' || action === 'close'
  }
  return false
}
