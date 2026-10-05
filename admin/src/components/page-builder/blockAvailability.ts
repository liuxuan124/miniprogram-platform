/**
 * 组件可用性判定（区块体系的单一真源）
 * ==================================
 *
 * 左侧区块面板与画布 drop 管道都要判断「这个组件在当前项目能不能用」，
 * 两处各写一份必然漂移（一边显示卡片、一边插入失败，或反之）——故抽到这里。
 *
 * 口径与组件库 ComponentPanel.isTypeAvailable 保持一致：
 *   1. 行业方案白名单（industryProfileStore）
 *   2. 星球模块关闭时，planet_* 一律不可用
 *   3. 商品模块关闭时，商品分类组件不可用
 */

import type { ComponentType } from '@/types/page'
import { getComponentsByCategory } from '@/components/page-builder/componentRegistry'
import { useFeatureModulesStore } from '@/stores/feature-modules'
import { useIndustryProfileStore } from '@/stores/industry-profile'

/** 商品分类的组件类型集合（懒加载，避免模块级就调用 store） */
let commerceTypesCache: Set<ComponentType> | null = null
function commerceTypes(): Set<ComponentType> {
  if (!commerceTypesCache) {
    commerceTypesCache = new Set(
      getComponentsByCategory('commerce', { includePageTemplates: true }).map((i) => i.type),
    )
  }
  return commerceTypesCache
}

export function isBlockTypeUsable(type: ComponentType): boolean {
  const featureModulesStore = useFeatureModulesStore()
  const industryProfileStore = useIndustryProfileStore()

  if (!industryProfileStore.isComponentAllowed(type)) return false
  if (!featureModulesStore.isEnabled('planet') && String(type).startsWith('planet_')) return false
  if (!featureModulesStore.productEnabled && commerceTypes().has(type)) return false
  return true
}
