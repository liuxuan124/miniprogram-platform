import type { ComponentInstance } from '@/types/page'
import { ComponentType as CT } from '@/types/page'

export function isWarmHomeShellOnly(components: ComponentInstance[]): boolean {
  const flow = (components || []).filter((c) => c?.type && c.type !== CT.FloatButton)
  return flow.length > 0 && flow.every((c) => c.type === CT.WarmHome)
}
