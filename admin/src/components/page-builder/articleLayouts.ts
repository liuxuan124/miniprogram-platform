export const ARTICLE_LIST_LAYOUTS = [
  'card',
  'list',
  'compact',
  'overlay',
  'magazine',
  'grid',
  'editorial',
] as const

export type ArticleListLayout = (typeof ARTICLE_LIST_LAYOUTS)[number]

export function resolveArticleLayout(raw: unknown, fallback: ArticleListLayout = 'list'): ArticleListLayout {
  const value = String(raw || '')
  return (ARTICLE_LIST_LAYOUTS as readonly string[]).includes(value)
    ? (value as ArticleListLayout)
    : fallback
}

export function articleCardModifier(layout: ArticleListLayout, index: number): string {
  if (layout === 'magazine') return index === 0 ? 'overlay' : 'editorial'
  return layout
}
