import { ComponentType, ComponentTypeLabels } from '@/types/page'

/** 组件定义接口 */
export interface ComponentDefinition {
  /** 组件类型枚举值 */
  type: ComponentType
  /** 中文显示名称 */
  label: string
  /** Element Plus 图标名称 */
  icon: string
  /** 组件分类 */
  category: 'commerce' | 'content' | 'marketing' | 'layout'
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
  // ==================== 内容（含原媒体组件） ====================
  [
    ComponentType.Banner,
    {
      type: ComponentType.Banner,
      label: '轮播图',
      icon: 'Picture',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        images: [{ image: '', title: '轮播图1', link_type: 'none', link_url: '' }],
        autoplay: true,
        interval: 3000,
        indicator_dots: true,
      }),
      defaultStyle: () => ({ margin_left: 0, margin_right: 0, border_radius: 0 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!Array.isArray(props.images) || props.images.length === 0) {
          warnings.push('轮播图至少需要一个图片项（items/images 不能为空）')
        } else if (props.images.every((img: any) => !img.image)) {
          warnings.push('所有轮播图图片地址为空，请至少设置一张图片')
        }
        const images = Array.isArray(props.images) ? props.images : []
        images.forEach((img: any, index: number) => {
          const type = String(img?.link_type || img?.type || '').trim()
          const target = String(img?.link_url || img?.target || '').trim()
          if (!type) warnings.push(`轮播图第 ${index + 1} 张缺少跳转类型`)
          else if (!['page', 'webview', 'url', 'miniapp', 'phone', 'none'].includes(type)) {
            warnings.push(`轮播图第 ${index + 1} 张跳转类型不合法`)
          } else if (type !== 'none' && !target) {
            warnings.push(`轮播图第 ${index + 1} 张缺少跳转地址`)
          }
        })
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
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        image: '',
        aspect_ratio: '16:9',
        link_type: 'none',
        link_url: '',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
    },
  ],
  [
    ComponentType.Video,
    {
      type: ComponentType.Video,
      label: '视频',
      icon: 'VideoPlay',
      category: 'content',
      categoryLabel: '内容',
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
      category: 'content',
      categoryLabel: '内容',
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
      defaultProps: () => ({
        title: '快捷分类',
        layout: 'grid',
        columns: 4,
        items: [
          { icon: '/images/nav-icons/cart.svg', title: '全部', link_url: '/pages/product-list/product-list' },
          { icon: '/images/nav-icons/fire.svg', title: '热卖', link_url: '/pages/product-list/product-list' },
          { icon: '/images/nav-icons/gift.svg', title: '新品', link_url: '/pages/product-list/product-list' },
          { icon: '/images/nav-icons/crown.svg', title: '精选', link_url: '/pages/product-list/product-list' },
        ],
      }),
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
        title: '',
        subtitle: '',
        layout: 'grid',
        columns: 2,
        show_price: true,
        zero_price_display: 'amount',
        show_sales: true,
        show_cart: false,
        title_bold: true,
        title_font_size: 14,
        price_font_size: 13,
        sales_font_size: 11,
        item_border_radius: 12,
        image_border_radius: 0,
        show_rating: true,
        item_gap: 8,
        source_mode: 'auto',
        product_ids: [],
        display_mode: 'fixed',
        limit: 6,
        page_size: 10,
        items: [
          { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128 },
          { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86 },
        ],
        data_source: {
          type: 'product',
          params: { status: 'on_sale', sort_by: 'sales', sort_order: 'desc' },
          query: { status: 'on_sale', sort_by: 'sales', sort_order: 'desc' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12 }),
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
      defaultProps: () => {
        const end = new Date(Date.now() + 2 * 3600 * 1000)
        const pad = (n: number) => String(n).padStart(2, '0')
        const end_time = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`
        return { title: '限时秒杀', limit: 4, countdown: true, end_time }
      },
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
      defaultProps: () => ({
        title: '领券中心',
        limit: 3,
        layout: 'horizontal',
        style_type: 'horizontal',
        button_text: '领取',
        title_font_size: 15,
        subtitle_font_size: 12,
        data_source: {
          type: 'coupon',
          params: { status: 'active' },
          query: { status: 'active' },
        },
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!props.title) {
          warnings.push('优惠券标题为空，请设置标题')
        }
        return warnings
      },
    },
  ],

  // ==================== 内容（续） ====================
  [
    ComponentType.SectionTitle,
    {
      type: ComponentType.SectionTitle,
      label: '分区标题',
      icon: 'CollectionTag',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        title: '分区标题',
        subtitle: '',
        align: 'left',
        title_bold: true,
        padding_top: 4,
        padding_bottom: 8,
        title_font_size: 16,
        subtitle_font_size: 11,
        title_color: '#172033',
        subtitle_color: '#7b8798',
        show_more: false,
        more_text: '查看更多>',
        more_link: '',
        more_color: '#7b8798',
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12 }),
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
        title: '',
        subtitle: '',
        layout: 'list',
        style_type: 'list',
        columns: 1,
        limit: 3,
        item_gap: 8,
        show_cover: true,
        show_date: true,
        show_category_tabs: false,
        category_tabs: [
          { id: '', name: '全部' },
          { id: '行业动态', name: '行业动态' },
          { id: '协会动态', name: '协会动态' },
          { id: '政策解读', name: '政策解读' },
          { id: '出海干货', name: '出海干货' },
          { id: '税务合规', name: '税务合规' },
          { id: '物流仓储', name: '物流仓储' },
        ],
        data_source: {
          type: 'content',
          params: { status: 'published' },
          query: { status: 'published' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, border_radius: 12 }),
    },
  ],
  [
    ComponentType.ArticleFeed,
    {
      type: ComponentType.ArticleFeed,
      label: '文章流',
      icon: 'Reading',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        layout: 'list',
        page_size: 10,
        show_cover: true,
        show_date: true,
        show_category_tabs: false,
        item_gap: 8,
        title_font_size: 13,
        subtitle_font_size: 11,
        data_source: {
          type: 'content',
          params: { status: 'published' },
          query: { status: 'published' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, border_radius: 12 }),
    },
  ],
  [
    ComponentType.HotNews,
    {
      type: ComponentType.HotNews,
      label: '今日热门资讯',
      icon: 'Histogram',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        title: '今日跨境头条',
        layout: 'star',
        limit: 3,
        item_gap: 10,
        show_cover: true,
        date_mode: 'today',
        header_date: '',
        show_more: true,
        more_text: '查看更多 >',
        more_link: '/pages/content-list/content-list',
        more_bg: '#EEF1FF',
        more_color: '#5B6CFF',
        more_radius: 20,
        header_from: '#4F7CFF',
        header_to: '#7BA3FF',
        header_opacity: 96,
        title_width: 72,
        title_radius: 12,
        content_radius: 14,
        data_source: {
          type: 'content',
          params: { status: 'published', sort_by: 'popular' },
          query: { status: 'published', sort_by: 'popular' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12 }),
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
      defaultProps: () => ({
        title: '出海笔记 · 阿哲',
        subtitle: '已认证',
        desc: '陪你把跨境生意，从经验变成方法',
        eyebrow: 'CROSS-BORDER GROWTH LAB',
        avatar_text: '海',
        verified: true,
        kpi: '238 篇内容 · 1.2w 关注者 · 4.9 咨询评分',
        logo: '',
        logo_position: 'left',
        content_align: 'left',
        logo_size: 48,
        logo_offset_x: 0,
        logo_offset_y: 0,
        text_offset_x: 0,
        text_offset_y: 0,
      }),
      defaultStyle: () => ({ margin_left: 0, margin_right: 0 }),
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
      defaultProps: () => ({
        title: '资质证书',
        columns: 2,
        title_font_size: 15,
        subtitle_font_size: 11,
        items: [
          { name: '营业执照', desc: '', image: '' },
          { name: '资质证书', desc: '', image: '' },
        ],
      }),
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
      defaultProps: () => ({
        title: '公告',
        items: ['新内容发布', '活动报名中'],
        scrollable: true,
        direction: 'horizontal',
        speed: 50,
        duration: 3000,
        show_icon: true,
        show_more: false,
        closable: false,
        text_color: '#E53935',
        background_color: '#FFF9E6',
        font_size: 12,
        link_url: '',
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 8 }),
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
        cover_text: '品牌开放日沙龙',
        image: '',
        date: '2026-05-10 10:00',
        location: '品牌中心',
        button_text: '立即预约',
        show_button: true,
        show_countdown: true,
        show_quota: true,
        layout: 'card',
        style_type: 'card',
        theme: 'blue',
        link_type: 'page',
        link_url: '',
        title_font_size: 14,
        subtitle_font_size: 11,
        data_source: {
          type: 'activity',
          params: { status: 'registering' },
          query: { status: 'registering' },
        },
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 12 }),
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
      defaultProps: () => ({
        title: '进行中活动',
        limit: 4,
        button_text: '报名',
        show_button: true,
        section_title_font_size: 15,
        title_font_size: 12,
        subtitle_font_size: 10,
        items: [
          { title: '品牌开放日沙龙', date: '2026-05-20 10:00', location: '品牌中心', cover: '', link_url: '' },
          { title: '药食同源研学活动', date: '2026-05-24 14:00', location: '展会中心', cover: '', link_url: '' },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
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
      defaultProps: () => ({
        title: '预约服务',
        section_title_font_size: 15,
        title_font_size: 12,
        subtitle_font_size: 11,
        services: [
          { name: '专家咨询', desc: '一对一咨询服务', button_text: '立即预约', link_url: '' },
          { name: '到店体验', desc: '门店体验预约', button_text: '立即预约', link_url: '' },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
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
        subtitle: '点击查看权益',
        theme: 'blue',
        bg_mode: 'gradient',
        background_image: '',
        show_level: true,
        show_points: true,
        show_balance: true,
        show_coupons: true,
        show_upgrade: true,
        upgrade_text: '升级会员',
        upgrade_link: '/pages/member-center/member-center',
        link_url: '/pages/member-center/member-center',
        benefits: ['专属折扣', '积分加倍', '生日特权'],
        title_font_size: 15,
        subtitle_font_size: 11,
        benefit_font_size: 10,
        stat_value_font_size: 16,
        stat_label_font_size: 10,
        upgrade_font_size: 11,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 14 }),
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
      defaultProps: () => {
        const end = new Date(Date.now() + 3 * 24 * 3600 * 1000)
        const pad = (n: number) => String(n).padStart(2, '0')
        const end_time = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())} ${pad(end.getHours())}:${pad(end.getMinutes())}:${pad(end.getSeconds())}`
        return {
          title: '距离活动开始',
          end_time,
          target_time: end_time,
          format: 'dhms',
          style_type: 'card',
          show_days: true,
          end_text: '已结束',
          title_font_size: 15,
        }
      },
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
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
        title: '客服',
        icon: 'service',
        icon_emoji: '🎧',
        icon_image: '',
        color: '#1769ff',
        action_type: 'ai',
        link_url: '/pages/service-chat/service-chat',
        phone: '',
        position: 'right_bottom',
        offset_x: 16,
        offset_y: 100,
        size: 52,
        opacity: 100,
        show_text: false,
        draggable: true,
        edge_hide: true,
      }),
      defaultStyle: () => ({}),
      validate: (props) => {
        const warnings: string[] = []
        if (props.action_type === 'link' && !props.link_url) {
          warnings.push('悬浮按钮动作为跳转页面但链接为空，请设置页面路径')
        }
        if (props.action_type === 'phone' && !props.phone) {
          warnings.push('悬浮按钮动作为拨打电话但号码为空')
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
      defaultProps: () => ({
        title: '填写信息',
        subtitle: '',
        button_text: '立即填写',
        buttonText: '立即填写',
        style: 'card',
        formTemplateId: '',
        formId: '',
        form_name: '',
        title_font_size: 14,
        subtitle_font_size: 11,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!(props.formId || props.formTemplateId)) {
          warnings.push('表单入口尚未关联表单，发布前请选择已启用表单')
        }
        return warnings
      },
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
        avatar: '',
        theme: 'blue',
        title_font_size: 15,
        desc_font_size: 12,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
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
      defaultProps: () => ({
        title: '联系我们',
        phone: '',
        address: '',
        service_time: '',
        layout: 'list',
        style: 'card',
        align: 'left',
        show_icons: true,
        show_phone: true,
        show_address: true,
        show_service_time: true,
        title_font_size: 14,
        subtitle_font_size: 12,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
    },
  ],
  [
    ComponentType.JoinGroup,
    {
      type: ComponentType.JoinGroup,
      label: '加入群聊',
      icon: 'ChatLineSquare',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        avatar: '',
        title: '跨境电商交流群',
        tags: ['跨境咨询', '找资源'],
        button_text: '加入群聊',
        sheet_title: '加入群聊',
        tip_text: '长按二维码可识别加群',
        groups: [
          { id: 'g1', name: '深跨协交流群', icon: '', qrcode: '' },
          { id: 'g2', name: '数据报告分享群', icon: '', qrcode: '' },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 12 }),
      validate: (props) => {
        const warnings: string[] = []
        const groups = Array.isArray(props.groups) ? props.groups : []
        if (!groups.length) warnings.push('请至少添加一个群')
        groups.forEach((g: any, i: number) => {
          if (!String(g?.name || '').trim()) warnings.push(`第 ${i + 1} 个群缺少名称`)
          if (!String(g?.qrcode || '').trim()) warnings.push(`「${g?.name || `群${i + 1}`}」未上传二维码`)
        })
        return warnings
      },
    },
  ],

  // ==================== 布局 ====================
  [
    ComponentType.BrandHeader,
    {
      type: ComponentType.BrandHeader,
      label: '品牌顶栏',
      icon: 'OfficeBuilding',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        logo: '',
        logo_text: '墨太白',
        title: '墨太白 · 跨境工具与知识平台',
        subtitle: '',
        style_type: 'plain',
        background_color: '#ffffff',
        gradient_from: '#002FA7',
        gradient_to: '#1A4BBF',
        title_color: '#172033',
        title_color_light: '#ffffff',
        subtitle_color: '#7b8798',
        show_divider: true,
        logo_height: 28,
        logo_max_width: 88,
        title_font_size: 15,
        subtitle_font_size: 11,
        logo_text_color: '#002FA7',
        divider_color: '#d0d8e8',
        bar_padding_left: 12,
        bar_padding_right: 12,
        fixed_top: true,
      }),
      defaultStyle: () => ({ margin_left: 0, margin_right: 0, margin_top: 0, margin_bottom: 0 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!String(props.title || '').trim()) {
          warnings.push('品牌顶栏主标题不能为空')
        }
        return warnings
      },
    },
  ],
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
          { icon: '/images/nav-icons/book.svg', title: '首页', link_type: 'page', link_url: '/pages/index/index' },
          { icon: '/images/nav-icons/chart.svg', title: '分类', link_type: 'page', link_url: '/pages/category/category' },
          { icon: '/images/nav-icons/cart.svg', title: '购物车', link_type: 'page', link_url: '/pages/cart/cart' },
          { icon: '/images/nav-icons/user.svg', title: '我的', link_type: 'page', link_url: '/pages/mine/mine' },
        ],
        columns: 4,
        style_type: 'icon_text',
        show_frame: true,
        frame_radius: 16,
        frame_bg: '#ffffff',
        padding_top: 14,
        padding_bottom: 10,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        const items = Array.isArray(props.items) ? props.items : []
        if (items.length === 0) {
          warnings.push('导航栏 items 不能为空，请至少保留一个导航项')
        }
        items.forEach((item: any, index: number) => {
          if (!String(item?.title || '').trim()) {
            warnings.push(`导航第 ${index + 1} 项缺少标题`)
          }
        })
        return warnings
      },
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

/** 获取所有分类（固定展示顺序；已无独立「媒体」分类） */
export function getAllCategories(): Array<{ value: string; label: string }> {
  const preferred = [
    { value: 'content', label: '内容' },
    { value: 'commerce', label: '商品' },
    { value: 'marketing', label: '营销' },
    { value: 'layout', label: '布局' },
  ]
  const present = new Set<string>()
  for (const def of componentRegistry.values()) {
    present.add(def.category)
  }
  return preferred.filter((cat) => present.has(cat.value))
}

/**
 * C2：小程序端渲染支持清单
 *
 * 维护原因：曾发生过 admin 侧已注册组件（如 form_entry）但小程序端
 * miniapp/components/dsl-renderer 未实现对应渲染分支的情况——后台能正常保存发布，
 * 但小程序端渲染成空白，且发布前校验不会拦截，属于静默失败。
 *
 * 此清单需与 miniapp/utils/render.js 中的 COMPONENT_TYPES 手动保持同步。
 * 新增组件类型时，必须同时完成三处：
 *   1. admin 端 componentRegistry 注册（本文件）
 *   2. miniapp/utils/render.js 的 COMPONENT_TYPES 白名单
 *   3. miniapp/components/dsl-renderer 的 wxml/wxss 渲染分支
 * 只要漏做第 2/3 步，下面的校验就会在发布前拦截，而不是等用户在小程序端看到白屏。
 */
const MINIAPP_RENDER_SUPPORTED_TYPES = new Set<ComponentType>([
  ComponentType.Search,
  ComponentType.NoticeBar,
  ComponentType.CategoryNav,
  ComponentType.Banner,
  ComponentType.Image,
  ComponentType.Nav,
  ComponentType.ProductList,
  ComponentType.FlashSale,
  ComponentType.ArticleList,
  ComponentType.ArticleFeed,
  ComponentType.HotNews,
  ComponentType.ActivityEntry,
  ComponentType.ActivityList,
  ComponentType.AppointmentService,
  ComponentType.MemberCard,
  ComponentType.Coupon,
  ComponentType.AIEntry,
  ComponentType.Video,
  ComponentType.BrandIntro,
  ComponentType.ImageText,
  ComponentType.ContactInfo,
  ComponentType.Certificate,
  ComponentType.Countdown,
  ComponentType.FloatButton,
  ComponentType.RichText,
  ComponentType.SectionTitle,
  ComponentType.Divider,
  ComponentType.Spacer,
  ComponentType.FormEntry,
  ComponentType.JoinGroup,
  ComponentType.BrandHeader,
])

/** 判断组件类型是否已在小程序端实现渲染 */
export function isRenderSupportedByMiniapp(type: ComponentType): boolean {
  return MINIAPP_RENDER_SUPPORTED_TYPES.has(type)
}

/** 后台装修器是否已注册该组件 type */
export function isKnownComponentType(type: string): type is ComponentType {
  return componentRegistry.has(type as ComponentType)
}

/**
 * 校验组件属性，返回警告信息数组
 * 校验分两层：
 *   1. 渲染端能力校验——组件类型小程序端是否支持，不支持则返回阻断级警告（含"不支持"关键字）
 *   2. 组件自身的 props 校验（沿用原有各组件 validate 逻辑，含占位内容检测）
 */
export function validateComponent(type: ComponentType, props: Record<string, any>): string[] {
  const warnings: string[] = []
  const label = ComponentTypeLabels[type] || type

  if (!isRenderSupportedByMiniapp(type)) {
    warnings.push(`「${label}」组件小程序端暂不支持渲染，发布后将在小程序端显示为空白，请先移除或替换`)
  }

  const def = componentRegistry.get(type)
  if (def?.validate) {
    warnings.push(...def.validate(props))
  }

  return warnings
}
