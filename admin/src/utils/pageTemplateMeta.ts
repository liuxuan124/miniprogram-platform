import { TemplateCategory, TemplateCategoryLabels } from '@/types/pageTemplate'

const PAGE_TYPE_BY_CATEGORY: Record<string, string> = {
  ...TemplateCategoryLabels,
  topic: '专题',
  list: '列表',
  topic_page: '专题',
}

const INDUSTRY_LABEL: Record<string, string> = {
  education: '教育培训',
  edu: '教育培训',
  retail: '电商零售',
  general: '通用零售',
  clothing: '服装鞋包',
  food: '食品饮料',
  digital: '数码家电',
  home_living: '家居日用',
  beauty: '美妆护肤',
  sports: '运动户外',
  wedding: '婚庆服务',
  local: '本地生活',
  local_life: '本地生活',
  campaign: '活动营销',
  content: '内容社区',
  member: '会员运营',
  knowledge: '知识付费',
}

export function pageTypeLabel(tpl: Record<string, unknown>): string {
  const dslType = String((tpl.dsl as any)?.page?.type ?? (tpl.dslContent && tryParseDslType(tpl.dslContent)) ?? '')
  if (dslType === 'home') return '首页'
  const cat = String(tpl.category ?? '').toLowerCase()
  const mapped = PAGE_TYPE_BY_CATEGORY[cat as TemplateCategory]
  if (mapped) return mapped
  if (cat && /[\u4e00-\u9fff]/.test(cat)) return cat
  if (cat) {
    console.warn('[pageTemplateMeta] 未知页面类型 category=', cat, tpl.name ?? tpl.id)
    return '其他'
  }
  return '其他'
}

function tryParseDslType(dslContent: unknown): string {
  try {
    const dsl = typeof dslContent === 'string' ? JSON.parse(dslContent) : dslContent
    return String(dsl?.page?.type ?? '')
  } catch {
    return ''
  }
}

export function industryLabel(tpl: Record<string, unknown>): string {
  const code = String(tpl.industryCode ?? tpl.industry_code ?? '').trim().toLowerCase()
  if (code && INDUSTRY_LABEL[code]) return INDUSTRY_LABEL[code]
  if (code && /[\u4e00-\u9fff]/.test(code)) return code
  if (code) {
    console.warn('[pageTemplateMeta] 未知行业 industryCode=', code, tpl.name ?? tpl.id)
    return '其他'
  }
  const name = String(tpl.name ?? '')
  if (/婚庆/.test(name)) return '婚庆服务'
  if (/零售|商城|成交/.test(name)) return '电商零售'
  if (/知识|学堂|教育/.test(name)) return '教育培训'
  if (/本地|到店|预约/.test(name)) return '本地生活'
  return '其他'
}

export function pageTemplateSubtitle(tpl: Record<string, unknown>): string {
  return `${pageTypeLabel(tpl)} · ${industryLabel(tpl)}`
}

/** 新建页默认名：去掉「模板」后缀，不加随机串 */
export function defaultPageNameFromTemplate(templateName: string): string {
  return String(templateName || '新页面')
    .replace(/页模板$/u, '页')
    .replace(/模板$/u, '')
    .trim() || '新页面'
}
