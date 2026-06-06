import { ComponentType } from '@/types/page'

/** 组件定义接口 */
export interface ComponentDefinition {
  /** 组件类型枚举值 */
  type: ComponentType
  /** 中文显示名称 */
  label: string
  /** Element Plus 图标名称 */
  icon: string
  /** 组件分类 */
  category: 'media' | 'commerce' | 'content' | 'marketing' | 'layout'
  /** 中文分类名称 */
  categoryLabel: string
  /** 默认属性工厂函数 */
  defaultProps: () => Record<string, any>
  /** 默认样式工厂函数 */
  defaultStyle: () => Record<string, any>
  /** 可选校验函数，返回警告信息数组 */
  validate?: (props: Record<string, any>) => string[]
}

/** 组件注册表 */
export const componentRegistry = new Map<ComponentType, ComponentDefinition>([
  // ==================== 媒体 ====================
  [
    ComponentType.Banner,
    {
      type: ComponentType.Banner,
      label: '轮播图',
      icon: 'Picture',
      category: 'media',
      categoryLabel: '媒体',
      defaultProps: () => ({
        images: [{ image: '', title: '轮播图1', link_type: 'page', link_url: '' }],
        autoplay: true,
        interval: 3000,
        indicator_dots: true,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 14 }),
      validate: (props) => {
        const warnings: string[] = []
        if (Array.isArray(props.images) && props.images.every((img: any) => !img.image)) {
          warnings.push('所有轮播图图片地址为空，请至少设置一张图片')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.Image,
    {
      type: ComponentType.Image,
      label: '图片',
      icon: 'PictureFilled',
      category: 'media',
      categoryLabel: '媒体',
      defaultProps: () => ({ src: '', link_type: 'page', link_url: '' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.Video,
    {
      type: ComponentType.Video,
      label: '视频',
      icon: 'VideoPlay',
      category: 'media',
      categoryLabel: '媒体',
      defaultProps: () => ({
        title: '视频播放',
        src: '',
        poster: '',
        button_text: '点击播放',
        autoplay: false,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!props.src) {
          warnings.push('视频地址为空，请设置视频源地址')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.ImageText,
    {
      type: ComponentType.ImageText,
      label: '图文组合',
      icon: 'Document',
      category: 'media',
      categoryLabel: '媒体',
      defaultProps: () => ({
        title: '图文介绍',
        layout: 'left-image',
        content: '请输入内容',
        image: '',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],

  // ==================== 商品 ====================
  [
    ComponentType.Search,
    {
      type: ComponentType.Search,
      label: '搜索组件',
      icon: 'Search',
      category: 'commerce',
      categoryLabel: '商品',
      defaultProps: () => ({ placeholder: '搜索商品/文章/活动', scope: 'all' }),
      defaultStyle: () => ({ margin_top: 8, margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.CategoryNav,
    {
      type: ComponentType.CategoryNav,
      label: '分类导航',
      icon: 'Menu',
      category: 'commerce',
      categoryLabel: '商品',
      defaultProps: () => ({ title: '快捷分类', layout: 'grid', columns: 4, items: [] }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!Array.isArray(props.items) || props.items.length === 0) {
          warnings.push('分类导航项为空，请添加导航分类')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.ProductList,
    {
      type: ComponentType.ProductList,
      label: '商品列表',
      icon: 'Goods',
      category: 'commerce',
      categoryLabel: '商品',
      defaultProps: () => ({
        title: '商品推荐',
        columns: 2,
        show_price: true,
        show_sales: true,
        show_cart: true,
        limit: 6,
        data_source: { type: 'api', params: { sort_by: 'sales' } },
      }),
      defaultStyle: () => ({ padding_left: 8, padding_right: 8 }),
    },
  ],
  [
    ComponentType.FlashSale,
    {
      type: ComponentType.FlashSale,
      label: '限时秒杀',
      icon: 'Timer',
      category: 'commerce',
      categoryLabel: '商品',
      defaultProps: () => ({ title: '限时秒杀', limit: 4, countdown: true }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 12 }),
    },
  ],
  [
    ComponentType.Coupon,
    {
      type: ComponentType.Coupon,
      label: '优惠券',
      icon: 'Ticket',
      category: 'commerce',
      categoryLabel: '商品',
      defaultProps: () => ({ title: '领券中心', limit: 3, style_type: 'horizontal' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!props.title) {
          warnings.push('优惠券标题为空，请设置标题')
        }
        return warnings
      },
    },
  ],

  // ==================== 内容 ====================
  [
    ComponentType.SectionTitle,
    {
      type: ComponentType.SectionTitle,
      label: '标题栏',
      icon: 'CollectionTag',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({ title: '标题', subtitle: '', align: 'left' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.ArticleList,
    {
      type: ComponentType.ArticleList,
      label: '文章列表',
      icon: 'Notebook',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        title: '精选内容',
        columns: 1,
        limit: 3,
        show_cover: true,
        show_date: true,
        data_source: { type: 'api', params: {} },
      }),
      defaultStyle: () => ({ padding_left: 10, padding_right: 10 }),
    },
  ],
  [
    ComponentType.RichText,
    {
      type: ComponentType.RichText,
      label: '富文本',
      icon: 'Document',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        content: '<p>请输入富文本内容</p>',
        text_color: '#333333',
        background_color: '#ffffff',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (props.content === '<p>请输入富文本内容</p>') {
          warnings.push('富文本内容仍为默认占位文本，请编辑实际内容')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.BrandIntro,
    {
      type: ComponentType.BrandIntro,
      label: '品牌介绍',
      icon: 'Memo',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({ title: '品牌介绍', subtitle: '', desc: '', logo: '' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.Certificate,
    {
      type: ComponentType.Certificate,
      label: '资质证书',
      icon: 'Medal',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({ title: '资质证书', items: [] }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],

  // ==================== 营销 ====================
  [
    ComponentType.NoticeBar,
    {
      type: ComponentType.NoticeBar,
      label: '公告栏',
      icon: 'Bell',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '公告', items: ['新内容发布', '活动报名中'] }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.ActivityEntry,
    {
      type: ComponentType.ActivityEntry,
      label: '活动入口',
      icon: 'Promotion',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        title: '热门活动',
        subtitle: '限时优惠',
        image: '',
        link_type: 'page',
        link_url: '',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.ActivityList,
    {
      type: ComponentType.ActivityList,
      label: '活动列表',
      icon: 'Tickets',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '进行中活动', limit: 4 }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.AppointmentService,
    {
      type: ComponentType.AppointmentService,
      label: '预约服务',
      icon: 'Calendar',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '预约服务', button_text: '立即预约', services: [] }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.MemberCard,
    {
      type: ComponentType.MemberCard,
      label: '会员卡',
      icon: 'Postcard',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        title: '会员权益',
        style_variant: 'gradient',
        benefits: ['专属折扣', '积分加倍', '生日特权'],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.Countdown,
    {
      type: ComponentType.Countdown,
      label: '倒计时',
      icon: 'Timer',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '距离活动开始', end_time: '', format: 'DHMS' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!props.end_time) {
          warnings.push('倒计时结束时间为空，请设置结束时间')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.FloatButton,
    {
      type: ComponentType.FloatButton,
      label: '悬浮按钮',
      icon: 'Position',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        icon: 'service',
        variant: 'circle',
        color: '#1769ff',
        action_type: 'link',
        link_type: 'page',
        link_url: '',
        position: 'right_bottom',
        offset_x: 16,
        offset_y: 100,
        size: 48,
        opacity: 100,
        shadow: true,
        draggable: false,
      }),
      defaultStyle: () => ({}),
      validate: (props) => {
        const warnings: string[] = []
        if (props.action_type === 'link' && !props.link_url) {
          warnings.push('悬浮按钮动作类型为链接但链接地址为空，请设置跳转地址')
        }
        return warnings
      },
    },
  ],
  [
    ComponentType.FormEntry,
    {
      type: ComponentType.FormEntry,
      label: '表单入口',
      icon: 'Document',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '填写信息', buttonText: '立即提交', formTemplateId: '' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.AIEntry,
    {
      type: ComponentType.AIEntry,
      label: 'AI入口',
      icon: 'ChatDotRound',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        title: 'AI智能助手',
        description: '可推荐商品、文章、活动',
        recommend_scope: '商品、文章、活动',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.ContactInfo,
    {
      type: ComponentType.ContactInfo,
      label: '联系方式',
      icon: 'Phone',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({ title: '联系我们', phone: '', address: '', service_time: '' }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],

  // ==================== 布局 ====================
  [
    ComponentType.Nav,
    {
      type: ComponentType.Nav,
      label: '导航栏',
      icon: 'Grid',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        items: [
          { icon: '🏠', title: '首页', link_type: 'page', link_url: '/pages/index/index' },
          { icon: '📋', title: '分类', link_type: 'page', link_url: '/pages/category/category' },
          { icon: '🛒', title: '购物车', link_type: 'page', link_url: '/pages/cart/cart' },
          { icon: '👤', title: '我的', link_type: 'page', link_url: '/pages/mine/mine' },
        ],
        columns: 4,
        style_type: 'icon_text',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.Divider,
    {
      type: ComponentType.Divider,
      label: '分割线',
      icon: 'Minus',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({ style: 'solid', color: '#e3e8f0', thickness: 1, margin: 16 }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.Spacer,
    {
      type: ComponentType.Spacer,
      label: '间距',
      icon: 'Expand',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({ height: 20 }),
      defaultStyle: () => ({}),
    },
  ],
])

// ==================== 辅助函数 ====================

/** 获取组件定义 */
export function getComponentDef(type: ComponentType): ComponentDefinition | undefined {
  return componentRegistry.get(type)
}

/** 获取默认属性 */
export function getDefaultProps(type: ComponentType): Record<string, any> {
  return componentRegistry.get(type)?.defaultProps() ?? {}
}

/** 获取默认样式 */
export function getDefaultStyle(type: ComponentType): Record<string, any> {
  return componentRegistry.get(type)?.defaultStyle() ?? {}
}

/** 按分类获取组件列表 */
export function getComponentsByCategory(category: string): ComponentDefinition[] {
  const result: ComponentDefinition[] = []
  for (const def of componentRegistry.values()) {
    if (def.category === category) {
      result.push(def)
    }
  }
  return result
}

/** 获取所有分类 */
export function getAllCategories(): Array<{ value: string; label: string }> {
  const seen = new Map<string, string>()
  for (const def of componentRegistry.values()) {
    if (!seen.has(def.category)) {
      seen.set(def.category, def.categoryLabel)
    }
  }
  return Array.from(seen.entries()).map(([value, label]) => ({ value, label }))
}

/** 校验组件属性，返回警告信息数组 */
export function validateComponent(type: ComponentType, props: Record<string, any>): string[] {
  const def = componentRegistry.get(type)
  if (!def?.validate) return []
  return def.validate(props)
}
