import type { ComponentInstance } from '@/types/page'
import { ComponentType } from '@/types/page'
import { getDefaultProps, getDefaultStyle } from './componentRegistry'

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export const WARM_HOME_BLOCK_TYPES = [
  ComponentType.WarmGreet,
  ComponentType.WarmAuthors,
  ComponentType.WarmFeature,
  ComponentType.WarmColumns,
  ComponentType.WarmPlanetRec,
  ComponentType.WarmFeed,
] as const

export function createWarmHomeTemplateComponents(over: {
  authorsTitle?: string
  columnsTitle?: string
  planetTitle?: string
} = {}): ComponentInstance[] {
  const specs: Array<{ type: ComponentType; props?: Record<string, any> }> = [
    {
      type: ComponentType.WarmGreet,
      props: {
        greet_template: '你好',
        show_notice: true,
        show_search: true,
        search_placeholder: '搜索文章、笔记、专栏……',
        show_nav: true,
        navs: [
          { key: 'list', icon: '📚', label: '长文', url: '/pages/content-list/content-list' },
          { key: 'column', icon: '🎧', label: '专栏课', url: '/pages/product-list/product-list?type=column' },
          { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
          { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
          { key: 'resources', icon: '🗂', label: '资料库', url: '/pages/resources/resources' },
        ],
      },
    },
    {
      type: ComponentType.WarmAuthors,
      props: {
        title: over.authorsTitle || '暖阁出品',
        more_text: '全部作者 ›',
        more_url: '/pages/content-list/content-list',
        more_tab: false,
      },
    },
    { type: ComponentType.WarmFeature, props: { empty_text: '暂无精选内容' } },
    {
      type: ComponentType.WarmColumns,
      props: {
        title: over.columnsTitle || '精品专栏',
        more_text: '全部 ›',
        more_url: '/pages/shop/shop',
        more_tab: true,
      },
    },
    {
      type: ComponentType.WarmPlanetRec,
      props: {
        title: over.planetTitle || '我的星球',
        more_text: '进入 ›',
        more_url: '/pages/planet-list/planet-list',
        more_tab: false,
        feed_url: '/pages/planet-feed/planet-feed?planetId=warm-main',
      },
    },
    { type: ComponentType.WarmFeed, props: { footer: '暖阁 · 慢一点，也很好' } },
  ]
  return specs.map((spec) => ({
    id: uid(spec.type),
    type: spec.type,
    props: { ...getDefaultProps(spec.type), ...(spec.props || {}) },
    style: getDefaultStyle(spec.type),
  }))
}
