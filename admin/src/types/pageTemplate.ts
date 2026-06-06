export enum TemplateCategory {
  HOME = 'home',
  ACTIVITY = 'activity',
  PRODUCT = 'product',
  MEMBER = 'member',
  CONTENT = 'content',
  CUSTOM = 'custom',
}

export const TemplateCategoryLabels: Record<TemplateCategory, string> = {
  [TemplateCategory.HOME]: '首页',
  [TemplateCategory.ACTIVITY]: '活动页',
  [TemplateCategory.PRODUCT]: '商品页',
  [TemplateCategory.MEMBER]: '会员页',
  [TemplateCategory.CONTENT]: '内容页',
  [TemplateCategory.CUSTOM]: '自定义',
}

export enum TemplateStyle {
  MODERN = 'modern',
  LUXURY = 'luxury',
  CUTE = 'cute',
  BUSINESS = 'business',
  NATURE = 'nature',
  TECH = 'tech',
}

export const TemplateStyleLabels: Record<TemplateStyle, string> = {
  [TemplateStyle.MODERN]: '现代简约',
  [TemplateStyle.LUXURY]: '高端奢华',
  [TemplateStyle.CUTE]: '可爱活泼',
  [TemplateStyle.BUSINESS]: '商务专业',
  [TemplateStyle.NATURE]: '自然清新',
  [TemplateStyle.TECH]: '科技感',
}

export const TemplateStyleColorMap: Record<TemplateStyle, { start: string; end: string }> = {
  [TemplateStyle.MODERN]: { start: '#1769ff', end: '#20b7ff' },
  [TemplateStyle.LUXURY]: { start: '#1a1a2e', end: '#c9a96e' },
  [TemplateStyle.CUTE]: { start: '#ff6b9d', end: '#ffa07a' },
  [TemplateStyle.BUSINESS]: { start: '#1e3a5f', end: '#3d6ba8' },
  [TemplateStyle.NATURE]: { start: '#2d8659', end: '#7ecfa0' },
  [TemplateStyle.TECH]: { start: '#0f0c29', end: '#302b63' },
}

export interface TemplateFeatures {
  hasBanner: boolean
  hasNavGrid: boolean
  hasProductList: boolean
  hasCoupon: boolean
  hasMemberCard: boolean
  hasCountdown: boolean
  hasRichText: boolean
  hasVideo: boolean
  hasImageText: boolean
}

export const TemplateFeatureLabels: Record<keyof TemplateFeatures, string> = {
  hasBanner: '轮播图',
  hasNavGrid: '导航宫格',
  hasProductList: '商品列表',
  hasCoupon: '优惠券',
  hasMemberCard: '会员卡',
  hasCountdown: '倒计时',
  hasRichText: '富文本',
  hasVideo: '视频',
  hasImageText: '图文混排',
}

export interface EditableField {
  path: string
  label: string
  type: 'text' | 'image' | 'color' | 'switch' | 'number' | 'select'
  defaultValue: any
  placeholder?: string
  options?: { label: string; value: string }[]
  maxLength?: number
  group?: string
}

export interface PageTemplate {
  id?: number
  key: string
  name: string
  category: TemplateCategory
  style: TemplateStyle
  description: string
  icon: string
  previewImage?: string
  coverColor: string
  features: TemplateFeatures
  tags: string[]
  dsl: any
  editableFields: EditableField[]
  scenarios: string[]
  usageCount?: number
  isOfficial: boolean
  createdAt?: string
}

export interface TemplateFilter {
  categories: TemplateCategory[]
  styles: TemplateStyle[]
  features: (keyof TemplateFeatures)[]
  keyword: string
}

export function createEmptyFilter(): TemplateFilter {
  return {
    categories: [],
    styles: [],
    features: [],
    keyword: '',
  }
}
