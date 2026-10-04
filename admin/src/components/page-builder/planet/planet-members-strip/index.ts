import { ComponentType, ComponentCategory } from '@/types/page'
import {
  planetMembersStripDefaultProps,
  planetMembersStripDefaultStyle,
  planetMembersStripFormSchema,
  planetMembersStripValidate,
} from './schema'
import type { ComponentMeta } from '../../shared/contract'

/** 星球活跃成员排 —— 统一元数据出口 */
export const planetMembersStripMeta: ComponentMeta = {
  type: ComponentType.PlanetMembersStrip,
  label: '活跃成员排',
  icon: 'UserFilled',
  category: ComponentCategory.Planet,
  categoryLabel: '星球互动',
  defaultProps: planetMembersStripDefaultProps,
  defaultStyle: planetMembersStripDefaultStyle,
  formSchema: planetMembersStripFormSchema,
  validate: planetMembersStripValidate,
}

export * from './schema'
export { default as PlanetMembersStripEditor } from './editor.vue'
export { default as PlanetMembersStripRuntime } from './runtime.vue'