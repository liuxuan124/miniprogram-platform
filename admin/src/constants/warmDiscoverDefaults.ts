/** 与 scripts/warm-page-defaults.json discover 段保持一致，供装修器默认展示 */
import warmDefaults from './warm-page-defaults.json'

export type DiscoverChip = {
  label: string
  filter?: 'all' | 'tag' | 'category'
  tag?: string
  categoryId?: number | string
}

export type DiscoverTab = {
  key: string
  label: string
  source?: 'all' | 'note' | 'article' | 'goods'
  visible?: boolean
  showBanner?: boolean
  chips?: DiscoverChip[]
}

export type ArticleLayoutConfig = {
  mode?: 'mixed' | 'all_duo' | 'all_full'
  fullEvery?: number
  fullOnNoCover?: boolean
  duoStyles?: string[]
}

const discover = warmDefaults.discover as {
  title: string
  tabs: DiscoverTab[]
  article_layout: ArticleLayoutConfig
}

export const DEFAULT_DISCOVER_TITLE = discover.title || '发现'
export const DEFAULT_DISCOVER_TABS: DiscoverTab[] = discover.tabs || []
export const DEFAULT_ARTICLE_LAYOUT: ArticleLayoutConfig = discover.article_layout || {
  mode: 'all_duo',
  fullEvery: 3,
  fullOnNoCover: true,
  duoStyles: ['magazine', 'row'],
}

export function defaultWarmDiscoverProps(over: Record<string, unknown> = {}) {
  return {
    title: DEFAULT_DISCOVER_TITLE,
    tabs: DEFAULT_DISCOVER_TABS.map((t) => ({
      ...t,
      chips: (t.chips || []).map((c) => ({ ...c })),
    })),
    article_layout: { ...DEFAULT_ARTICLE_LAYOUT },
    ...over,
  }
}
