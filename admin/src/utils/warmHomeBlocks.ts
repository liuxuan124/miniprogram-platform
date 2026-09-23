import type { ComponentInstance } from '@/types/page'
import { ComponentType } from '@/types/page'
import { getDefaultProps, getDefaultStyle } from '@/components/page-builder/componentRegistry'
import homeBlocksJson from '../../../miniapp/data/warm-home-blocks.json'

type BlockSpec = { id: string; type: string; props?: Record<string, unknown> }

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function buildWarmHomeBlocksFromTemplate(over: {
  greetTemplate?: string
  authorsTitle?: string
  columnsTitle?: string
  planetTitle?: string
} = {}): Array<{ id: string; type: string; props: Record<string, unknown> }> {
  const list = (homeBlocksJson as { blocks: BlockSpec[] }).blocks || []
  return list.map((block) => {
    const props = { ...(block.props || {}) } as Record<string, unknown>
    if (block.type === 'warm_greet' && over.greetTemplate) {
      props.greet_template = over.greetTemplate
    }
    if (block.type === 'warm_authors' && over.authorsTitle) {
      props.title = over.authorsTitle
    }
    if (block.type === 'warm_columns' && over.columnsTitle) {
      props.title = over.columnsTitle
    }
    if (block.type === 'warm_planet_rec' && over.planetTitle) {
      props.title = over.planetTitle
    }
    return { id: block.id, type: block.type, props }
  })
}

export function createWarmHomeTemplateComponents(over: {
  authorsTitle?: string
  columnsTitle?: string
  planetTitle?: string
  greetTemplate?: string
} = {}): ComponentInstance[] {
  return buildWarmHomeBlocksFromTemplate(over).map((block) => ({
    id: uid(block.type),
    type: block.type as ComponentType,
    props: { ...getDefaultProps(block.type as ComponentType), ...block.props },
    style: getDefaultStyle(block.type as ComponentType),
  }))
}

export const WARM_HOME_BLOCK_TYPES = [
  ComponentType.WarmGreet,
  ComponentType.WarmAuthors,
  ComponentType.WarmFeature,
  ComponentType.WarmColumns,
  ComponentType.WarmPlanetRec,
  ComponentType.WarmFeed,
] as const
