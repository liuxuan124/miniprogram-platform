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
  ArticleFeed = 'article_feed',
  NoteFeed = 'note_feed',
  MomentsFeed = 'moments_feed',
  HotNews = 'hot_news',
  ActivityEntry = 'activity_entry',
  ActivityList = 'activity_list',
  AppointmentService = 'appointment_service',
  MemberCard = 'member_card',
  PromoBanner = 'promo_banner',
  Coupon = 'coupon',
  Video = 'video',
  Audio = 'audio',
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
  JoinGroup = 'join_group',
  BrandHeader = 'brand_header',
  Container = 'container',
  ImageHotspot = 'image_hotspot',
  SectionBg = 'section_bg',
  FeatureCards = 'feature_cards',
  ImageCube = 'image_cube',
  ContentTabs = 'content_tabs',
  PlanetHero = 'planet_hero',
  PlanetTopics = 'planet_topics',
  PlanetFeed = 'planet_feed',
  WarmGreet = 'warm_greet',
  WarmAuthors = 'warm_authors',
  WarmFeature = 'warm_feature',
  WarmColumns = 'warm_columns',
  WarmPlanetRec = 'warm_planet_rec',
  WarmFeed = 'warm_feed',
  WarmHome = 'warm_home',
  WarmDiscover = 'warm_discover',
  WarmPlanet = 'warm_planet',
  WarmShop = 'warm_shop',
  WarmMine = 'warm_mine',
  ContentPaywall = 'content_paywall',
  MaterialList = 'material_list',
  MemberPlan = 'member_plan',
  QaList = 'qa_list',
  // ===== 2026-10-05 新增 19 个组件（5 大类）=====
  PlanetQaCard = 'planet_qa_card',
  PlanetAskBanner = 'planet_ask_banner',
  PlanetMembersStrip = 'planet_members_strip',
  PlanetChallengeCard = 'planet_challenge_card',
  PlanetBenefitCard = 'planet_benefit_card',
  OpCreatorBanner = 'op_creator_banner',
  OpQuoteCard = 'op_quote_card',
  OpSmartGroupCard = 'op_smart_group_card',
  OpReferralBanner = 'op_referral_banner',
  OpGatedDownloadCard = 'op_gated_download_card',
  HPeekCarousel = 'h_peek_carousel',
  HComparisonCard = 'h_comparison_card',
  HMetricStrip = 'h_metric_strip',
  HFilterChips = 'h_filter_chips',
  HSplitBanner = 'h_split_banner',
  ContentFaqAccordion = 'content_faq_accordion',
  ContentMiniAudio = 'content_mini_audio',
  ContentMilestoneTracker = 'content_milestone_tracker',
  LayoutOverlapWrapper = 'layout_overlap_wrapper',
  LayoutPaperSheet = 'layout_paper_sheet',
  LayoutStickyWrapper = 'layout_sticky_wrapper',
  LayoutFlexibleGrid = 'layout_flexible_grid',
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
  [ComponentType.ArticleFeed]: '文章流',
  [ComponentType.NoteFeed]: '笔记瀑布流',
  [ComponentType.MomentsFeed]: '动态时间线',
  [ComponentType.HotNews]: '今日热门资讯',
  [ComponentType.ActivityEntry]: '活动入口',
  [ComponentType.ActivityList]: '活动列表',
  [ComponentType.AppointmentService]: '预约服务',
  [ComponentType.MemberCard]: '会员卡',
  [ComponentType.PromoBanner]: '促销横幅',
  [ComponentType.Coupon]: '优惠券',
  [ComponentType.Video]: '视频',
  [ComponentType.Audio]: '音频',
  [ComponentType.BrandIntro]: '品牌介绍',
  [ComponentType.ImageText]: '图文组合',
  [ComponentType.ContactInfo]: '联系方式',
  [ComponentType.Certificate]: '资质证书',
  [ComponentType.Countdown]: '倒计时',
  [ComponentType.FloatButton]: '悬浮按钮',
  [ComponentType.RichText]: '富文本',
  [ComponentType.SectionTitle]: '分区标题',
  [ComponentType.Divider]: '分割线',
  [ComponentType.Spacer]: '间距',
  [ComponentType.FormEntry]: '表单入口',
  [ComponentType.AIEntry]: 'AI入口',
  [ComponentType.JoinGroup]: '加入群聊',
  [ComponentType.BrandHeader]: '品牌顶栏',
  [ComponentType.Container]: '容器/分栏',
  [ComponentType.ImageHotspot]: '图片热区',
  [ComponentType.SectionBg]: '通栏背景',
  [ComponentType.FeatureCards]: '卖点卡片组',
  [ComponentType.ImageCube]: '图片魔方',
  [ComponentType.ContentTabs]: '选项卡',
  [ComponentType.PlanetHero]: '星球顶栏',
  [ComponentType.PlanetTopics]: '星球话题预测',
  [ComponentType.PlanetFeed]: '星球动态流',
  [ComponentType.WarmGreet]: '品牌问候条',
  [ComponentType.WarmAuthors]: '品牌作者列表',
  [ComponentType.WarmFeature]: '品牌精选',
  [ComponentType.WarmColumns]: '品牌专栏',
  [ComponentType.WarmPlanetRec]: '品牌星球推荐',
  [ComponentType.WarmFeed]: '品牌信息流',
  [ComponentType.WarmHome]: '品牌首页模板',
  [ComponentType.WarmDiscover]: '品牌发现模板',
  [ComponentType.WarmPlanet]: '星球固定页',
  [ComponentType.WarmShop]: '商城固定页',
  [ComponentType.WarmMine]: '我的固定页',
  [ComponentType.ContentPaywall]: '内容付费墙',
  [ComponentType.MaterialList]: '资料列表',
  [ComponentType.MemberPlan]: '会员方案',
  [ComponentType.QaList]: '问答列表',

  [ComponentType.PlanetQaCard]: '精选问答卡',
  [ComponentType.PlanetAskBanner]: '向主理人提问条',
  [ComponentType.PlanetMembersStrip]: '活跃成员排',
  [ComponentType.PlanetChallengeCard]: '打卡挑战营卡',
  [ComponentType.PlanetBenefitCard]: '星球权益卡',
  [ComponentType.OpCreatorBanner]: '创作者招募条',
  [ComponentType.OpQuoteCard]: '金句观点卡',
  [ComponentType.OpSmartGroupCard]: '群活码卡',
  [ComponentType.OpReferralBanner]: '邀请助力条',
  [ComponentType.OpGatedDownloadCard]: '资料解锁卡',
  [ComponentType.HPeekCarousel]: '半露横滑卷轴',
  [ComponentType.HComparisonCard]: 'AB 对比卡',
  [ComponentType.HMetricStrip]: '数据背书条',
  [ComponentType.HFilterChips]: '筛选芯片排',
  [ComponentType.HSplitBanner]: '双格分流卡',
  [ComponentType.ContentFaqAccordion]: '折叠问答面板',
  [ComponentType.ContentMiniAudio]: '微音频收听条',
  [ComponentType.ContentMilestoneTracker]: '政策里程碑轴',
  [ComponentType.LayoutOverlapWrapper]: '层叠穿透容器',
  [ComponentType.LayoutPaperSheet]: '纸感包裹器',
  [ComponentType.LayoutStickyWrapper]: '吸顶容器',
  [ComponentType.LayoutFlexibleGrid]: '弹性栅格',
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
  [ComponentType.ArticleFeed]: 'Reading',
  [ComponentType.NoteFeed]: 'PictureFilled',
  [ComponentType.MomentsFeed]: 'ChatLineSquare',
  [ComponentType.HotNews]: 'Histogram',
  [ComponentType.ActivityEntry]: 'Promotion',
  [ComponentType.ActivityList]: 'Tickets',
  [ComponentType.AppointmentService]: 'Calendar',
  [ComponentType.MemberCard]: 'Postcard',
  [ComponentType.PromoBanner]: 'Promotion',
  [ComponentType.Coupon]: 'Ticket',
  [ComponentType.Video]: 'VideoPlay',
  [ComponentType.Audio]: 'Headset',
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
  [ComponentType.JoinGroup]: 'ChatLineSquare',
  [ComponentType.BrandHeader]: 'OfficeBuilding',
  [ComponentType.Container]: 'Grid',
  [ComponentType.ImageHotspot]: 'Crop',
  [ComponentType.SectionBg]: 'PictureFilled',
  [ComponentType.FeatureCards]: 'Postcard',
  [ComponentType.ImageCube]: 'Grid',
  [ComponentType.ContentTabs]: 'Menu',
  [ComponentType.PlanetHero]: 'Sunrise',
  [ComponentType.PlanetTopics]: 'DataLine',
  [ComponentType.PlanetFeed]: 'ChatLineSquare',
  [ComponentType.WarmGreet]: 'User',
  [ComponentType.WarmAuthors]: 'UserFilled',
  [ComponentType.WarmFeature]: 'PictureFilled',
  [ComponentType.WarmColumns]: 'Notebook',
  [ComponentType.WarmPlanetRec]: 'Sunrise',
  [ComponentType.WarmFeed]: 'Reading',
  [ComponentType.WarmHome]: 'House',
  [ComponentType.WarmDiscover]: 'Compass',
  [ComponentType.WarmPlanet]: 'Sunrise',
  [ComponentType.WarmShop]: 'Goods',
  [ComponentType.WarmMine]: 'User',
  [ComponentType.ContentPaywall]: 'Lock',
  [ComponentType.MaterialList]: 'FolderOpened',
  [ComponentType.MemberPlan]: 'GoldMedal',
  [ComponentType.QaList]: 'ChatDotRound',

  [ComponentType.PlanetQaCard]: 'ChatLineSquare',
  [ComponentType.PlanetAskBanner]: 'ChatLineRound',
  [ComponentType.PlanetMembersStrip]: 'UserFilled',
  [ComponentType.PlanetChallengeCard]: 'Calendar',
  [ComponentType.PlanetBenefitCard]: 'Present',
  [ComponentType.OpCreatorBanner]: 'EditPen',
  [ComponentType.OpQuoteCard]: 'ChatDotRound',
  [ComponentType.OpSmartGroupCard]: 'ChatDotSquare',
  [ComponentType.OpReferralBanner]: 'Promotion',
  [ComponentType.OpGatedDownloadCard]: 'DocumentCopy',
  [ComponentType.HPeekCarousel]: 'Picture',
  [ComponentType.HComparisonCard]: 'Switch',
  [ComponentType.HMetricStrip]: 'TrendCharts',
  [ComponentType.HFilterChips]: 'Filter',
  [ComponentType.HSplitBanner]: 'Share',
  [ComponentType.ContentFaqAccordion]: 'ChatLineSquare',
  [ComponentType.ContentMiniAudio]: 'Headset',
  [ComponentType.ContentMilestoneTracker]: 'Timer',
  [ComponentType.LayoutOverlapWrapper]: 'Files',
  [ComponentType.LayoutPaperSheet]: 'DocumentCopy',
  [ComponentType.LayoutStickyWrapper]: 'Top',
  [ComponentType.LayoutFlexibleGrid]: 'Grid',
}

/** 组件分类 */
export enum ComponentCategory {
  Commerce = 'commerce',
  Content = 'content',
  Marketing = 'marketing',
  Layout = 'layout',
  Planet = 'planet',
  Warm = 'warm',
  /** 增长与转化运营 */
  Growth = 'growth',
  /** 平排 / 横向高密度 */
  Horizontal = 'horizontal',
}

/** 组件分类标签 */
export const ComponentCategoryLabels: Record<ComponentCategory, string> = {
  [ComponentCategory.Commerce]: '商品',
  [ComponentCategory.Content]: '内容',
  [ComponentCategory.Marketing]: '营销',
  [ComponentCategory.Layout]: '布局',
  [ComponentCategory.Planet]: '星球',
  [ComponentCategory.Warm]: '品牌组件',
  [ComponentCategory.Growth]: '增长转化',
  [ComponentCategory.Horizontal]: '平排横滑',
}

/** 组件分类与类型映射 */
export const ComponentCategoryMap: Record<ComponentCategory, ComponentType[]> = {
  [ComponentCategory.Commerce]: [ComponentType.Search, ComponentType.CategoryNav, ComponentType.ProductList, ComponentType.FlashSale, ComponentType.Coupon],
  [ComponentCategory.Content]: [
    ComponentType.Banner,
    ComponentType.Image,
    ComponentType.Video,
    ComponentType.ImageText,
    ComponentType.SectionTitle,
    ComponentType.ArticleList,
    ComponentType.ArticleFeed,
    ComponentType.NoteFeed,
    ComponentType.MomentsFeed,
    ComponentType.HotNews,
    ComponentType.RichText,
    ComponentType.MaterialList,
    ComponentType.QaList,
    ComponentType.BrandIntro,
    ComponentType.Certificate,
    ComponentType.ContentFaqAccordion,
    ComponentType.ContentMiniAudio,
    ComponentType.ContentMilestoneTracker,
  ],
  [ComponentCategory.Marketing]: [ComponentType.NoticeBar, ComponentType.ActivityEntry, ComponentType.ActivityList, ComponentType.AppointmentService, ComponentType.MemberCard, ComponentType.PromoBanner, ComponentType.MemberPlan, ComponentType.ContentPaywall, ComponentType.Countdown, ComponentType.FloatButton, ComponentType.FormEntry, ComponentType.AIEntry, ComponentType.ContactInfo, ComponentType.JoinGroup],
  [ComponentCategory.Layout]: [
    ComponentType.Nav,
    ComponentType.Divider,
    ComponentType.Spacer,
    ComponentType.Container,
    ComponentType.SectionBg,
    ComponentType.LayoutOverlapWrapper,
    ComponentType.LayoutPaperSheet,
    ComponentType.LayoutStickyWrapper,
    ComponentType.LayoutFlexibleGrid,
  ],
  [ComponentCategory.Planet]: [
    ComponentType.PlanetHero,
    ComponentType.PlanetTopics,
    ComponentType.PlanetFeed,
    ComponentType.PlanetQaCard,
    ComponentType.PlanetAskBanner,
    ComponentType.PlanetMembersStrip,
    ComponentType.PlanetChallengeCard,
    ComponentType.PlanetBenefitCard,
  ],
  [ComponentCategory.Growth]: [
    ComponentType.OpCreatorBanner,
    ComponentType.OpQuoteCard,
    ComponentType.OpSmartGroupCard,
    ComponentType.OpReferralBanner,
    ComponentType.OpGatedDownloadCard,
  ],
  [ComponentCategory.Horizontal]: [
    ComponentType.HPeekCarousel,
    ComponentType.HComparisonCard,
    ComponentType.HMetricStrip,
    ComponentType.HFilterChips,
    ComponentType.HSplitBanner,
  ],
  [ComponentCategory.Warm]: [
    ComponentType.WarmGreet,
    ComponentType.WarmAuthors,
    ComponentType.WarmFeature,
    ComponentType.WarmColumns,
    ComponentType.WarmPlanetRec,
    ComponentType.WarmFeed,
    ComponentType.WarmHome,
    ComponentType.WarmDiscover,
    ComponentType.WarmPlanet,
    ComponentType.WarmShop,
    ComponentType.WarmMine,
  ],
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
    | 'file'
    | 'membership_plan'
    | 'paid_qa'
  config?: Record<string, any>
  params?: Record<string, any>
  query?: Record<string, any>
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
  /** 组件内文字颜色 */
  text_color?: string
  /** 组件内文字大小（px，0 或未设置表示默认） */
  font_size?: number
  /** 是否在小程序端渲染，false 时不展示 */
  visible?: boolean
  /**
   * 暖调环境阴影（v2）：独立字段便于属性面板逐项调节，
   * 渲染端合成 box-shadow；数字单位 px（端上 rpx = px * 2）。
   */
  shadow_x?: number
  shadow_y?: number
  shadow_blur?: number
  shadow_spread?: number
  /** 支持 rgba 透明度通道 */
  shadow_color?: string
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
  /** DSL v2：容器子组件（最多两层） */
  children?: ComponentInstance[]
}

/** 渐变色标：offset 为 0~100 的百分比 */
export interface GradientStop {
  color: string
  offset: number
}

/** 渐变参数：angle 0~360（CSS 惯例，180° = 自上而下） */
export interface PageGradient {
  angle: number
  stops: GradientStop[]
}

/** 复合页面背景：solid = 纯色；gradient = 线性渐变 */
export interface PageBackground {
  type: 'solid' | 'gradient' | 'image'
  /** solid 模式的填充色 */
  color?: string
  /** gradient 模式的渐变参数 */
  gradient?: PageGradient
  /**
   * image 模式的背景图（2026-10-06 新增）。
   * 🔴 放在 background 里而不是平铺到 PageConfig 顶层：
   * 背景是**一个整体概念**（类型 + 参数），平铺会让 `type` 与其参数分散两处，
   * 出现「type=image 但 url 在别处」的不可能状态。
   */
  image?: {
    url: string
    /** cover=全屏覆盖 / tile-top=顶部平铺 / center=居中不拉伸 */
    mode: 'cover' | 'tile-top' | 'center'
    /** true=固定视口（不随内容滚动） */
    fixed: boolean
  }
}

/**
 * 底部渐隐融合遮罩。
 * color = 'auto' 时自动取页面背景底色（渐变取终点色标）；
 * 数字字段单位 px（端上按 rpx = px * 2 换算）。
 */
export interface PageBottomOverlay {
  enabled: boolean
  height: number
  color: 'auto' | string
}

/** 页面配置 */
export interface PageConfig {
  id: string
  name: string
  type: PageType | string
  path: string
  share_title?: string
  share_image?: string
  /** @deprecated 旧字段，仅向下兼容；新代码使用 background，保存时双向同步 */
  background_color?: string
  /** 复合背景（v2）：与 background_color 共存，渲染端优先读本字段 */
  background?: PageBackground
  /** 底部渐隐融合遮罩（v2） */
  bottomOverlay?: PageBottomOverlay
  /**
   * 顶部导航栏配置（2026-10-06 新增）。
   * ⚠️ 字段全可选且默认值与「字段缺失」时的旧行为一致 ——
   * 老页面加载后归一化得到的 nav 等价于「标准模式 + 跟随页面名 + 深色状态栏」，
   * 即与改动前完全一致，不会因为加了这个字段就换外观。
   */
  nav?: {
    mode: 'standard' | 'immersive' | 'gradient' | 'hidden'
    sync_title: boolean
    title: string
    bg_color: string
    status_text_tone: 'dark' | 'light'
    gradient_to: string
  }
  /** 分享配置（2026-10-06 扩充：新增 desc / 朋友圈封面） */
  share_desc?: string
  /** 朋友圈/网页卡片封面（1:1）；与 share_image（5:4）分开存 —— 共用一个必然有一个被裁坏 */
  share_square_image?: string
  /** 高级设置（2026-10-06 新增） */
  access_mode?: 'public' | 'login' | 'vip' | 'password'
  /** 仅 access_mode === 'vip' 时有意义：允许的会员身份标识 */
  vip_tiers?: string[]
  /** 仅 access_mode === 'password' 时有意义：6 位数字访问密码 */
  access_password?: string
  /** 动态防录屏水印（访客 UID + 手机尾号 + 时间） */
  watermark?: boolean
  schedule?: {
    enabled: boolean
    online_at: number
    offline_at: number
    redirect_path: string
    /** 下线兜底：home=回首页 / notice=展示公告 / stay=留在原页 */
    fallback: 'home' | 'notice' | 'stay'
  }
}

/** 底部遮罩默认配置（需求基线：默认开启 / 96px / 自动取底色） */
export const DEFAULT_BOTTOM_OVERLAY: PageBottomOverlay = {
  enabled: true,
  height: 96,
  color: 'auto',
}

/** 品牌预设色盘（暖阁质感规范） */
export const BACKGROUND_PRESETS: Array<{ label: string; background: PageBackground }> = [
  {
    label: '暖阁纸感',
    background: {
      type: 'gradient',
      gradient: {
        angle: 180,
        stops: [
          { color: '#FFFDF9', offset: 0 },
          { color: '#FDF6EC', offset: 100 },
        ],
      },
    },
  },
  {
    label: '晨光米杏',
    background: {
      type: 'gradient',
      gradient: {
        angle: 180,
        stops: [
          { color: '#FEF3C7', offset: 0 },
          { color: '#FFFDF9', offset: 100 },
        ],
      },
    },
  },
  {
    label: '极简冷白',
    background: {
      type: 'gradient',
      gradient: {
        angle: 180,
        stops: [
          { color: '#FFFFFF', offset: 0 },
          { color: '#F8FAFC', offset: 100 },
        ],
      },
    },
  },
]

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
  publishedDslContent?: string
  version?: number
  currentVersion?: number
  latestVersion?: number
  hasUnpublishedChanges?: boolean
  created_at: string
  updated_at: string
  createTime?: string
  updateTime?: string
  published_at?: string
  isTest?: number | boolean
  is_test?: number | boolean
  entryExpireAt?: string
  entry_expire_at?: string
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
  /** 页面来源分组：decorate / ai / activity / archived */
  pageGroup?: string
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
  description?: string
  dsl?: PageDSL
  /** 页面来源分组 decorate/ai/activity/archived（后端若支持则生效） */
  pageGroup?: string
  page_group?: string
  /** 1=归档 */
  archived?: number | boolean
  isTest?: number | boolean
  entryExpireAt?: string | null
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
  /** 知识付费 */
  KnowledgePay = 'knowledge_pay',
  /** 本地生活 */
  LocalLife = 'local_life',
  /** 内容 IP */
  ContentIp = 'content_ip',
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
  [IndustryCode.KnowledgePay]: '知识付费',
  [IndustryCode.LocalLife]: '本地生活',
  [IndustryCode.ContentIp]: '内容 IP',
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
  [IndustryCode.KnowledgePay]: ['#0d9488', '#2dd4bf'],
  [IndustryCode.LocalLife]: ['#ea580c', '#fb923c'],
  [IndustryCode.ContentIp]: ['#c2410c', '#ea580c'],
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
  /** 整店模板名称 */
  templateName?: string
  /** 系统模板编码 warm=暖阁 */
  templateCode?: string
  /** 系统预置不可删 */
  isSystem?: number | boolean
  /** 正在搭建使用中 */
  isCurrent?: number | boolean
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
