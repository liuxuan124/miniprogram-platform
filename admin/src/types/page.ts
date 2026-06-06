/**
 * 页面搭建相关类型定义
 * 基于 page-dsl-schema v1.0
 */

/** 组件类型枚举 */
export enum ComponentType {
  Search = 'search',
  NoticeBar = 'notice_bar',
  CategoryNav = 'category_nav',
  Banner = 'banner',
  Image = 'image',
  Nav = 'nav',
  ProductList = 'product_list',
  FlashSale = 'flash_sale',
  ArticleList = 'article_list',
  ActivityEntry = 'activity_entry',
  ActivityList = 'activity_list',
  AppointmentService = 'appointment_service',
  MemberCard = 'member_card',
  Coupon = 'coupon',
  Video = 'video',
  BrandIntro = 'brand_intro',
  ImageText = 'image_text',
  ContactInfo = 'contact_info',
  Certificate = 'certificate',
  Countdown = 'countdown',
  FloatButton = 'float_button',
  RichText = 'rich_text',
  SectionTitle = 'section_title',
  Divider = 'divider',
  Spacer = 'spacer',
  FormEntry = 'form_entry',
  AIEntry = 'ai_entry',
}

/** 组件类型标签映射 */
export const ComponentTypeLabels: Record<ComponentType, string> = {
  [ComponentType.Search]: '搜索组件',
  [ComponentType.NoticeBar]: '公告栏',
  [ComponentType.CategoryNav]: '分类导航',
  [ComponentType.Banner]: '轮播图',
  [ComponentType.Image]: '图片',
  [ComponentType.Nav]: '导航栏',
  [ComponentType.ProductList]: '商品列表',
  [ComponentType.FlashSale]: '限时秒杀',
  [ComponentType.ArticleList]: '文章列表',
  [ComponentType.ActivityEntry]: '活动入口',
  [ComponentType.ActivityList]: '活动列表',
  [ComponentType.AppointmentService]: '预约服务',
  [ComponentType.MemberCard]: '会员卡',
  [ComponentType.Coupon]: '优惠券',
  [ComponentType.Video]: '视频',
  [ComponentType.BrandIntro]: '品牌介绍',
  [ComponentType.ImageText]: '图文组合',
  [ComponentType.ContactInfo]: '联系方式',
  [ComponentType.Certificate]: '资质证书',
  [ComponentType.Countdown]: '倒计时',
  [ComponentType.FloatButton]: '悬浮按钮',
  [ComponentType.RichText]: '富文本',
  [ComponentType.SectionTitle]: '标题栏',
  [ComponentType.Divider]: '分割线',
  [ComponentType.Spacer]: '间距',
  [ComponentType.FormEntry]: '表单入口',
  [ComponentType.AIEntry]: 'AI入口',
}

/** 组件类型图标映射 */
export const ComponentTypeIcons: Record<ComponentType, string> = {
  [ComponentType.Search]: 'Search',
  [ComponentType.NoticeBar]: 'Bell',
  [ComponentType.CategoryNav]: 'Menu',
  [ComponentType.Banner]: 'Picture',
  [ComponentType.Image]: 'PictureFilled',
  [ComponentType.Nav]: 'Grid',
  [ComponentType.ProductList]: 'Goods',
  [ComponentType.FlashSale]: 'Timer',
  [ComponentType.ArticleList]: 'Notebook',
  [ComponentType.ActivityEntry]: 'Promotion',
  [ComponentType.ActivityList]: 'Tickets',
  [ComponentType.AppointmentService]: 'Calendar',
  [ComponentType.MemberCard]: 'Postcard',
  [ComponentType.Coupon]: 'Ticket',
  [ComponentType.Video]: 'VideoPlay',
  [ComponentType.BrandIntro]: 'Memo',
  [ComponentType.ImageText]: 'Document',
  [ComponentType.ContactInfo]: 'Phone',
  [ComponentType.Certificate]: 'Medal',
  [ComponentType.Countdown]: 'Timer',
  [ComponentType.FloatButton]: 'Position',
  [ComponentType.RichText]: 'Document',
  [ComponentType.SectionTitle]: 'CollectionTag',
  [ComponentType.Divider]: 'Minus',
  [ComponentType.Spacer]: 'Expand',
  [ComponentType.FormEntry]: 'Document',
  [ComponentType.AIEntry]: 'ChatDotRound',
}

/** 组件分类 */
export enum ComponentCategory {
  Media = 'media',
  Commerce = 'commerce',
  Content = 'content',
  Marketing = 'marketing',
  Layout = 'layout',
}

/** 组件分类标签 */
export const ComponentCategoryLabels: Record<ComponentCategory, string> = {
  [ComponentCategory.Media]: '媒体',
  [ComponentCategory.Commerce]: '商品',
  [ComponentCategory.Content]: '内容',
  [ComponentCategory.Marketing]: '营销',
  [ComponentCategory.Layout]: '布局',
}

/** 组件分类与类型映射 */
export const ComponentCategoryMap: Record<ComponentCategory, ComponentType[]> = {
  [ComponentCategory.Media]: [ComponentType.Banner, ComponentType.Image, ComponentType.Video, ComponentType.ImageText],
  [ComponentCategory.Commerce]: [ComponentType.Search, ComponentType.CategoryNav, ComponentType.ProductList, ComponentType.FlashSale, ComponentType.Coupon],
  [ComponentCategory.Content]: [ComponentType.SectionTitle, ComponentType.ArticleList, ComponentType.RichText, ComponentType.BrandIntro, ComponentType.Certificate],
  [ComponentCategory.Marketing]: [ComponentType.NoticeBar, ComponentType.ActivityEntry, ComponentType.ActivityList, ComponentType.AppointmentService, ComponentType.MemberCard, ComponentType.Countdown, ComponentType.FloatButton, ComponentType.FormEntry, ComponentType.AIEntry, ComponentType.ContactInfo],
  [ComponentCategory.Layout]: [ComponentType.Nav, ComponentType.Divider, ComponentType.Spacer],
}

/** 页面类型 */
export enum PageType {
  Home = 'home',
  Custom = 'custom',
  Activity = 'activity',
  Topic = 'topic',
}

/** 页面类型标签 */
export const PageTypeLabels: Record<PageType, string> = {
  [PageType.Home]: '首页',
  [PageType.Custom]: '自定义页',
  [PageType.Activity]: '活动页',
  [PageType.Topic]: '专题页',
}

/** 页面状态 */
export enum PageStatus {
  Draft = 'draft',
  Published = 'published',
  Unpublished = 'unpublished',
}

/** 页面状态标签 */
export const PageStatusLabels: Record<PageStatus, string> = {
  [PageStatus.Draft]: '草稿',
  [PageStatus.Published]: '已发布',
  [PageStatus.Unpublished]: '已下架',
}

/** 页面状态标签类型 */
export const PageStatusTagType: Record<PageStatus, string> = {
  [PageStatus.Draft]: 'info',
  [PageStatus.Published]: 'success',
  [PageStatus.Unpublished]: 'warning',
}

/** Banner 项 */
export interface BannerItem {
  image: string
  title?: string
  link_type?: 'page' | 'url' | 'miniapp'
  link_url?: string
}

/** Nav 项 */
export interface NavItem {
  icon: string
  title: string
  link_type?: 'page' | 'url' | 'miniapp'
  link_url?: string
}

/** 组件动作 */
export interface ComponentAction {
  type: 'navigate' | 'api_call' | 'share' | 'copy'
  config: Record<string, any>
}

/** 组件数据源 */
export interface ComponentDataSource {
  type:
    | 'static'
    | 'api'
    | 'collection'
    | 'product'
    | 'content'
    | 'coupon'
    | 'activity'
    | 'appointment_service'
    | 'category'
  config?: Record<string, any>
  params?: Record<string, any>
}

/** 组件样式 */
export interface ComponentStyle {
  margin_top?: number
  margin_bottom?: number
  margin_left?: number
  margin_right?: number
  padding_top?: number
  padding_bottom?: number
  padding_left?: number
  padding_right?: number
  background_color?: string
  border_radius?: number
  [key: string]: any
}

/** 组件实例 */
export interface ComponentInstance {
  id: string
  type: ComponentType
  props: Record<string, any>
  data_source?: ComponentDataSource
  actions?: ComponentAction[]
  style?: ComponentStyle
}

/** 页面配置 */
export interface PageConfig {
  id: string
  name: string
  type: PageType | string
  path: string
  share_title?: string
  share_image?: string
  background_color?: string
}

/** 全局配置 */
export interface GlobalConfig {
  pull_refresh: boolean
  reach_bottom_load: boolean
}

/** 页面 DSL 结构 */
export interface PageDSL {
  schema_version: string
  page: PageConfig
  components: ComponentInstance[]
  global_config: GlobalConfig
}

/** 页面记录（列表项） */
export interface PageRecord {
  id: number
  name: string
  type: PageType | string | number
  typeDesc?: string
  path: string
  status: PageStatus | string | number
  statusDesc?: string
  share_title?: string
  shareTitle?: string
  share_image?: string
  shareImage?: string
  background_color?: string
  dsl?: PageDSL
  draftDslContent?: string
  version?: number
  currentVersion?: number
  created_at: string
  updated_at: string
  createTime?: string
  updateTime?: string
  published_at?: string
}

/** 创建页面参数 */
export interface CreatePageParams {
  name: string
  type: PageType | string | number
  path: string
  share_title?: string
  shareTitle?: string
  share_image?: string
  shareImage?: string
  background_color?: string
  dsl?: PageDSL
}

/** 更新页面参数 */
export interface UpdatePageParams {
  name?: string
  type?: PageType | string | number
  path?: string
  share_title?: string
  shareTitle?: string
  share_image?: string
  shareImage?: string
  background_color?: string
  dsl?: PageDSL
}

/** 页面列表查询参数 */
export interface PageListParams {
  page?: number
  page_size?: number
  current?: number
  size?: number
  keyword?: string
  type?: string | number
  status?: string | number
}

/** 版本记录 */
export interface VersionRecord {
  id: number
  page_id: number
  version: number
  dsl: PageDSL
  remark?: string
  created_at: string
  created_by?: string
}

/** 行业代码枚举 */
export enum IndustryCode {
  Clothing = 'clothing',
  Food = 'food',
  Digital = 'digital',
  Home = 'home',
  Beauty = 'beauty',
  Education = 'education',
  Sports = 'sports',
  Travel = 'travel',
  Furniture = 'furniture',
  Medical = 'medical',
  Wedding = 'wedding',
  Pet = 'pet',
}

/** 行业标签映射 */
export const IndustryLabels: Record<string, string> = {
  [IndustryCode.Clothing]: '服装鞋包',
  [IndustryCode.Food]: '食品饮料',
  [IndustryCode.Digital]: '数码家电',
  [IndustryCode.Home]: '家居日用',
  [IndustryCode.Beauty]: '美妆护肤',
  [IndustryCode.Education]: '教育培训',
  [IndustryCode.Sports]: '运动户外',
  [IndustryCode.Travel]: '旅游出行',
  [IndustryCode.Furniture]: '家装建材',
  [IndustryCode.Medical]: '医疗健康',
  [IndustryCode.Wedding]: '婚庆服务',
  [IndustryCode.Pet]: '宠物生活',
}

/** 行业色系映射 */
export const IndustryColors: Record<string, [string, string]> = {
  [IndustryCode.Clothing]: ['#e11d48', '#ec4899'],
  [IndustryCode.Food]: ['#f97316', '#fbbf24'],
  [IndustryCode.Digital]: ['#2563eb', '#06b6d4'],
  [IndustryCode.Home]: ['#78716c', '#a8a29e'],
  [IndustryCode.Beauty]: ['#d946ef', '#f472b6'],
  [IndustryCode.Education]: ['#0d9488', '#14b8a6'],
  [IndustryCode.Sports]: ['#16a34a', '#84cc16'],
  [IndustryCode.Travel]: ['#0ea5e9', '#22d3ee'],
  [IndustryCode.Furniture]: ['#a16207', '#ca8a04'],
  [IndustryCode.Medical]: ['#0891b2', '#22d3ee'],
  [IndustryCode.Wedding]: ['#f43f5e', '#fbbf24'],
  [IndustryCode.Pet]: ['#f59e0b', '#f97316'],
}

/** 页面模板（扩展） */
export interface PageTemplate {
  id: number
  name: string
  description?: string
  cover_image?: string
  dsl: PageDSL
  category?: string
  industryCode?: string
  industry_code?: string
  scene?: string
  tags?: string
  tagsParsed?: string[]
  colors?: string
  colorsParsed?: [string, string]
  sortOrder?: number
  sort_order?: number
  created_at: string
  updated_at?: string
}

/** 小程序版本发布记录 */
export interface ReleaseRecord {
  id: number
  semver: string
  major: number
  minor: number
  patch: number
  changeType: 'major' | 'minor' | 'patch'
  releaseNotes: string
  snapshot?: string
  backupSnapshot?: string
  pageCount: number
  status: 0 | 1 | 2  // 0=草稿 1=已发布 2=已回滚
  publishedAt?: string
  publisherId?: number
  publisherName?: string
  rolledBackAt?: string
  rolledBackBy?: number
  rolledBackFrom?: string
  createTime: string
  updateTime: string
  /** 操作模式: template=保存为模板, publish=发布上线 */
  mode?: 'template' | 'publish'
  /** 基于哪个模板编辑的（追踪来源） */
  baseReleaseId?: number
  /** 是否当前线上版本（前端计算） */
  isCurrentPublished?: boolean
}

/** 版本操作日志 */
export interface VersionOperationLog {
  id: number
  releaseId?: number
  semver?: string
  operation: 'create' | 'publish' | 'rollback'
  operatorId?: number
  operatorName?: string
  detail?: string
  status: 0 | 1
  errorMsg?: string
  ip?: string
  duration?: number
  createTime: string
}
