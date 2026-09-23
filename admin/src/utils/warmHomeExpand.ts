import type { ComponentInstance } from '@/types/page'
import { ComponentType as CT } from '@/types/page'
import { createWarmHomeTemplateComponents } from '@/components/page-builder/warmHomeTemplate'

export function isWarmHomeShellOnly(components: ComponentInstance[]): boolean {
  const flow = (components || []).filter((c) => c?.type && c.type !== CT.FloatButton)
  return flow.length > 0 && flow.every((c) => c.type === CT.WarmHome)
}

/** H5 预览：暖阁壳展开为与真机一致的可组合区块 */
export function expandWarmShellDslComponents(components: ComponentInstance[]): ComponentInstance[] {
  const list = components || []
  const flow = list.filter((c) => c?.type && c.type !== CT.FloatButton)
  const floats = list.filter((c) => c?.type === CT.FloatButton)
  if (!isWarmHomeShellOnly(flow)) {
    return list
  }
  const props = flow[0]?.props || {}
  const expanded = createWarmHomeTemplateComponents({
    authorsTitle: String(props.authors_title || props.authorsTitle || ''),
    columnsTitle: String(props.columns_title || props.columnsTitle || ''),
    planetTitle: String(props.planet_title || props.planetTitle || ''),
  })
  return [...expanded, ...floats]
}
