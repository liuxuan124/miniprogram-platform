/**
 * 跨境墨太白 · 品牌展示默认值（DSL 类型名仍为 warm_*，仅改运营文案）
 * 真机/API 优先；下列文案仅用于编辑器演示模式或未配置时的占位。
 */
export const BRAND_APP_NAME = '跨境墨太白'
export const BRAND_SHORT = '墨太白'
export const BRAND_PLANET_NAME = `${BRAND_SHORT}星球`
export const BRAND_AUTHORS_TITLE = `${BRAND_SHORT}出品`
export const BRAND_FOOTER = `${BRAND_SHORT} · 跨境内容，慢一点也很好`
export const BRAND_EYEBROW = 'CROSS-BORDER INK'
export const BRAND_LOGIN_TAGLINE = '登录后继续 · 收藏 / 星球 / 已购'
export const BRAND_OWNER_NAME = '太白'
export const BRAND_EDITORIAL_NAME = '内容组'

/** 旧暖阁演示人名/机构，发布前应替换或走真实 API */
export const LEGACY_WARM_DEMO_MARKERS = [
  '暖阁',
  '墨白',
  '小满',
  '老陈',
  '编辑部',
  'WARM NOTES',
  '慢一点，也很好',
] as const

export const BRAND_WARM_COMPONENT_DEFAULTS = {
  authorsTitle: BRAND_AUTHORS_TITLE,
  columnsTitle: '精品专栏',
  planetTitle: '我的星球',
  planetShellTitle: BRAND_PLANET_NAME,
  shopTitle: `${BRAND_SHORT}商城`,
  footer: BRAND_FOOTER,
  greetTemplate: '你好',
  searchPlaceholder: '搜索文章、笔记、专栏……',
} as const

export function buildDefaultMiniappBrandConfig() {
  return {
    appName: BRAND_APP_NAME,
    logoUrl: '',
    logoMark: BRAND_SHORT.charAt(0),
    loginTagline: BRAND_LOGIN_TAGLINE,
    brandEyebrow: BRAND_EYEBROW,
    loginStyleKey: 'warm' as const,
  }
}

/** 扫描 DSL JSON 是否仍含演示品牌文案（用于发布前提醒） */
export function findLegacyDemoMarkersInText(text: string): string[] {
  const hit = new Set<string>()
  for (const m of LEGACY_WARM_DEMO_MARKERS) {
    if (text.includes(m)) hit.add(m)
  }
  return [...hit]
}
