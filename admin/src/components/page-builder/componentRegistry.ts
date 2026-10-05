import { BRAND_PLANET_NAME, BRAND_WARM_COMPONENT_DEFAULTS } from '@/constants/brand-defaults'
import { WARM_KIT_METAS, WARM_KIT_TYPES } from './warmKitRegistry'
import { ComponentType, ComponentTypeLabels } from '@/types/page'
import { normalizeSearchProps, SEARCH_DEFAULT_PROPS } from './search/searchSchema'
import { CATEGORY_NAV_DEFAULT_PROPS, normalizeCategoryNavProps } from './categoryNav/categoryNavSchema'
import { COUPON_DEFAULT_PROPS, normalizeCouponProps } from './coupon/couponSchema'
import { ARTICLE_LIST_DEFAULT_PROPS } from './articleFeed/articleListSchema'
import { FLASH_SALE_DEFAULT_PROPS, normalizeFlashSaleProps } from './flashSale/flashSaleSchema'
import { PRODUCT_LIST_DEFAULT_PROPS, normalizeProductListProps } from './productList/productListSchema'

const W = BRAND_WARM_COMPONENT_DEFAULTS

/** 组件定义接口 */
export interface ComponentDefinition {
  /** 组件类型枚举值 */
  type: ComponentType
  /** 中文显示名称 */
  label: string
  /** Element Plus 图标名称 */
  icon: string
  /** 组件分类 */
  category: 'commerce' | 'content' | 'marketing' | 'layout' | 'planet' | 'warm' | 'growth' | 'horizontal'
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
        images: [{ id: `bnr_seed_${Date.now().toString(36)}`, image: '', title: '轮播图1', subtitle: '', link_type: 'none', link_url: '', visible: true }],
        autoplay: true,
        interval: 3000,
        loop: true,
        allow_touch: true,
        layout_mode: 'fullbleed',
        aspect: '2.35:1',
        // 🔴 默认 cover = 端上历史行为（mode="aspectFill"），老页面不会突然出现黑边
        object_fit: 'cover',
        radius_preset: 0,
        shadow: 'none',
        indicator_type: 'dots',
        indicator_pos: 'center',
        overlay: true,
        title_align: 'left',
      }),
      defaultStyle: () => ({ margin_left: 0, margin_right: 0, border_radius: 0 }),
      validate: (props) => {
        const warnings: string[] = []
        if (!Array.isArray(props.images) || props.images.length === 0) {
          warnings.push('轮播图至少需要一个图片项（items/images 不能为空）')
        } else if (props.images.every((img: any) => !img?.image)) {
          warnings.push('所有轮播图图片地址为空，请至少设置一张图片')
        }
        const images = Array.isArray(props.images) ? props.images : []
        images.forEach((img: any, index: number) => {
          const type = String(img?.link_type || img?.type || '').trim()
          const target = String(img?.link_url || img?.target || '').trim()
          if (!type) warnings.push(`轮播图第 ${index + 1} 张缺少跳转类型`)
          // 白名单需覆盖 BannerLinkDialog 提供的全部类型，否则选「内容/商品/秒杀」会被误报
          else if (!['page', 'product', 'content', 'flashsale', 'webview', 'url', 'miniapp', 'phone', 'none'].includes(type)) {
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
      // 2026-10-05：默认值改由 searchSchema 单一真相源提供（多词轮播 / 多选范围 / 样式组）。
      // 旧字段 placeholder / scope 仍被 normalizeSearchProps 识别，老页面不受影响。
      defaultProps: () => ({ ...SEARCH_DEFAULT_PROPS, placeholders: [...SEARCH_DEFAULT_PROPS.placeholders] }),
      defaultStyle: () => ({ margin_top: 8, margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const cfg = normalizeSearchProps(props)
        const warnings: string[] = []
        if (cfg.tap_target === 'link' && !cfg.link_url) {
          warnings.push('跳转落地目标选了「自定义页面」但还没选页面，留空会回落到默认搜索页')
        }
        return warnings
      },
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
        // 2026-10-05：默认值改由 categoryNavSchema 单一真相源提供
        // （布局三档 / 标题开关 / 副标题 / 角标 / 背景模式）。
        // 旧字段 layout='grid' + columns=4 仍被 normalizeCategoryNavProps 识别，老页面观感不变。
        ...CATEGORY_NAV_DEFAULT_PROPS,
        items: [
          { icon: '/images/nav-icons/cart.svg', title: '全部', link_url: '/pkg-content/product-list/product-list' },
          { icon: '/images/nav-icons/fire.svg', title: '热卖', link_url: '/pkg-content/product-list/product-list' },
          { icon: '/images/nav-icons/gift.svg', title: '新品', link_url: '/pkg-content/product-list/product-list' },
          { icon: '/images/nav-icons/crown.svg', title: '精选', link_url: '/pkg-content/product-list/product-list' },
        ].map((it, i) => ({ ...it, id: `cnav_seed_${i}` })),
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const warnings: string[] = []
        const cfg = normalizeCategoryNavProps(props)
        if (!cfg.items.length) {
          warnings.push('分类导航项为空，请添加导航分类')
        }
        if (cfg.layout === 'paged' && cfg.items.length > 0 && cfg.items.length <= cfg.page_size) {
          warnings.push(`双行分页每页 ${cfg.page_size} 项，当前只有 ${cfg.items.length} 项，分页条不会出现`)
        }
        const noLink = cfg.items.filter((it) => !it.link_url).length
        if (noLink) warnings.push(`有 ${noLink} 个分类项没设跳转，真机点击不会有反应`)
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
        // 2026-10-06：默认值以 productListSchema 为准。
        // ⚠️ 老默认的 `title: ''`（无标题）+ `limit: 6` 保留 —— 新建组件的初始观感不变。
        //    show_title 缺省 true 但 title 为空 → 画布不渲染标题行，与老行为一致。
        ...PRODUCT_LIST_DEFAULT_PROPS,
        title: '',
        limit: 6,
        // 旧字段一并写入：端上 dsl-product-list 读的是 show_price/show_sales/source_mode
        show_price: true,
        show_sales: true,
        source_mode: 'auto',
        product_ids: [],
        display_mode: 'fixed',
        items: [
          { id: 'demo-1', name: '示例商品 A', price: '99.00', sales: 128 },
          { id: 'demo-2', name: '示例商品 B', price: '199.00', sales: 86 },
        ],
        data_source: {
          type: 'product',
          params: { status: 'on_sale', sort_by: 'sales', sort_order: 'desc' },
          query: { status: 'on_sale', sort_by: 'sales', sort_order: 'desc' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12 }),
      validate: (props) => {
        const cfg = normalizeProductListProps(props)
        const warnings: string[] = []
        if (cfg.pick_mode === 'manual' && !cfg.manual_ids.length) {
          warnings.push('选取方式是「手动添加」但一件商品都没选，真机会显示空态')
        }
        if (cfg.show_more && !cfg.more_link) {
          warnings.push('开启了「查看更多」但没设跳转，真机点了会跳默认商品列表页')
        }
        return warnings
      },
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
        return {
          // 2026-10-05：默认值以 couponSchema 同套路改由 flashSaleSchema 提供。
          // end_time 仍按旧口径「2 小时后」显式给出（新建组件的初始观感不变）。
          ...FLASH_SALE_DEFAULT_PROPS,
          end_time,
        }
      },
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 12 }),
      validate: (props) => {
        const cfg = normalizeFlashSaleProps(props)
        const warnings: string[] = []
        if (cfg.data_mode === 'manual' && !cfg.manual_items.length) {
          warnings.push('手动自选模式下一件商品都没选，真机不会渲染商品卡')
        }
        if (cfg.show_more && !cfg.more_link) {
          warnings.push('开启了「查看全部」但没设跳转，真机点了不会有反应')
        }
        if (cfg.show_progress && !cfg.manual_items.some((it) => Number(it.stock) > 0)) {
          warnings.push('开启了抢购进度条，但没有任何商品设置库存，进度条不会出现')
        }
        if (cfg.badge_mode === 'autoDiscount' && !cfg.manual_items.some((it) => Number(it.original_price) > 0)) {
          warnings.push('角标选了「自动折扣率」，但没有商品填原价，角标算不出来')
        }
        return warnings
      },
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
        // 2026-10-05：默认值改由 couponSchema 单一真相源提供
        // （数据源双模式 / 标题栏更多入口 / 按钮三态文案 / 兜底策略 / 布局三档 / 票券风格三档）。
        // 旧字段 limit / button_text / style_type / title_font_size / subtitle_font_size
        // 仍被 normalizeCouponProps 识别，老页面观感与行为不变。
        ...COUPON_DEFAULT_PROPS,
        // ⚠️ data_source 保留：历史「数据源绑定」校验与端上 fillDataSource 仍读它。
        // 面板已不再暴露这个字段（内容面板的数据源改走 data_mode/filters），
        // 但**不能删** —— 删了会让 dataSourceBinding 校验判为「未配置」并在端上取不到数。
        data_source: {
          type: 'coupon',
          params: { status: 'active' },
          query: { status: 'active' },
        },
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 10 }),
      validate: (props) => {
        const cfg = normalizeCouponProps(props)
        const warnings: string[] = []
        if (!cfg.title.trim()) {
          warnings.push('优惠券标题为空，请设置标题')
        }
        if (cfg.data_mode === 'manual' && !cfg.manual_items.length) {
          warnings.push('手动自选模式下一张券都没选，真机不会渲染任何券卡')
        }
        if (cfg.show_more && !cfg.more_link) {
          warnings.push('开启了「查看更多」但没设跳转，真机点了不会有反应')
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
        // 2026-10-06：默认值收进 articleListSchema 单一真相源，
        // 与 ArticleListProps / ArticleListRenderer / dsl-article-list 共用同一份定义。
        // ⚠️ data_source 保留：运营界面上已不再暴露它（PropsPanel 的技术调试卡对
        // ArticleList 屏蔽），但 preview-datasource 的取数链路仍读它 —— 删了画布取不到数。
        ...ARTICLE_LIST_DEFAULT_PROPS,
        // 旧页面写死过的 limit 若大于新上限 20，展示时按 normalizeLimit 夹紧
        limit: 3,
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
        // —— 新增配置（与 articleFeedSchema 默认值对齐）——
        scope: 'all',
        sort: 'latest',
        pinned: [],
        tab_style: 'pill',
        tab_show_all: true,
        load_mode: 'infinite',
        max_count: 0,
        load_more_text: '下滑加载更多文章…',
        cover_aspect: '16:9',
        cover_radius: 8,
        show_excerpt: false,
        excerpt_lines: 2,
        show_author: false,
        show_badge: true,
        show_meta: false,
        card_margin: 0,
        title_bold: false,
        subtitle_color: '#94a3b8',
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
    ComponentType.NoteFeed,
    {
      type: ComponentType.NoteFeed,
      label: '笔记瀑布流',
      icon: 'PictureFilled',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        layout: 'masonry',
        page_size: 10,
        show_category_tabs: true,
        show_sub_tabs: true,
        item_gap: 10,
        // —— 新增字段（与 noteFeedSchema 默认值对齐）——
        type_tabs: [
          { label: '全部', content_types: [], filter_type: 'all', category_ids: [], tag: '', content_ids: [], sort: 'new', layout: '' },
        ],
        show_search: false,
        tab_font_size: 16,
        tab_active_style: 'bar',
        text_card: true,
        gallery_badge: 'plain',
        like_heart: true,
        card_metric: 'like',
        show_source_badge: false,
        show_author: true,
        item_border_radius: 12,
        page_gutter: 0,
        card_bg: '#ffffff',
        background_color: '#f7f7f7',
        // 🔴 标题字号改 13~18px 逻辑口径（旧默认 32 是设计稿 2 倍，实际只有约 16px）
        title_size: 15,
        title_lines: 2,
        text_color: '#333333',
        meta_color: '#7b8798',
        data_source: {
          type: 'content',
          params: { status: 'published', contentType: 'note' },
          query: { status: 'published', contentType: 'note' },
        },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, border_radius: 12 }),
    },
  ],
  [
    ComponentType.MomentsFeed,
    {
      type: ComponentType.MomentsFeed,
      label: '动态时间线',
      icon: 'ChatLineSquare',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        page_size: 10,
        show_author: true,
        show_publish_time: true,
        item_gap: 12,
        data_source: {
          type: 'content',
          params: { status: 'published', contentType: 'moment' },
          query: { status: 'published', contentType: 'moment' },
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
        title: '今日精选',
        layout: 'star',
        limit: 3,
        item_gap: 10,
        show_cover: true,
        date_mode: 'today',
        header_date: '',
        show_more: true,
        more_text: '查看更多 >',
        more_link: '/pkg-content/content-list/content-list',
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
        // —— 新增容器排版字段（与 richTextSchema 默认值对齐）——
        base_font_size: 14,
        line_height: 1.75,
        paragraph_gap: 8,
        padding_x: 16,
        padding_y: 12,
        margin_y: 8,
        container_bg: 'none',
        container_radius: true,
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
    ComponentType.ContentPaywall,
    {
      type: ComponentType.ContentPaywall,
      label: '内容付费墙',
      icon: 'Lock',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        title: '解锁全文',
        subtitle: '剩余 {剩余比例} 内容需解锁',
        hint: '开通会员或购买单篇即可阅读完整内容与附件',
        button_text: '立即解锁',
        secondary_text: '加入星球也可畅读',
        content_id: '',
        primary_link: '/pages/member-center/member-center',
        secondary_link: '/pages/planet/planet',
        theme: 'warm',
        unlock_methods: ['vip', 'single', 'planet'],
        mask_height: 72,
        mask_color: '',
        unlocked_behavior: 'hide',
        preview_identity: 'guest',
        paywall: { remainPercent: 30, price: '9.9', memberPrice: '0' },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, margin_top: 8, margin_bottom: 8 }),
    },
  ],
  [
    ComponentType.MaterialList,
    {
      type: ComponentType.MaterialList,
      label: '资料列表',
      icon: 'FolderOpened',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        layout: 'list',
        limit: 5,
        sort: 'newest',
        source_mode: 'all',
        category_ids: [],
        manual_ids: [],
        show_filter_bar: false,
        show_meta: true,
        show_downloads: true,
        show_access: true,
        show_more: true,
        more_text: '查看更多资料 ›',
        more_link: '/pkg-content/resources/resources',
        data_source: { type: 'file', params: { status: 'published' } },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, border_radius: 12 }),
    },
  ],
  [
    ComponentType.QaList,
    {
      type: ComponentType.QaList,
      label: '问答列表',
      icon: 'ChatDotRound',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        limit: 5,
        source_mode: 'public',
        show_more: true,
        more_text: '查看更多问答 ›',
        // 2026-10-05 修正：这两个默认值原来都指向小程序里不存在的目录
        // （/pages/qa-list/qa-list、/pages/ask/ask），点了报「页面不存在」。
        // more_link 走 custom 宿主页 + ?path= 形式（motai-qa 是 mp_page.path 里的
        // 数据库 DSL 路径，不是文件系统页面，小程序里必须经 /pages/custom/custom 加载）。
        // ask_link 直接指分包真身。
        more_link: '/pages/custom/custom?path=' + encodeURIComponent('pages/custom/motai-qa'),
        show_ask_entry: true,
        ask_link: '/pkg-content/question-ask/question-ask',
        topic_tabs: [],
        summary_lines: 2,
        filter_private: true,
        data_source: { type: 'paid_qa', params: {} },
      }),
      defaultStyle: () => ({ margin_left: 12, margin_right: 12, border_radius: 12 }),
    },
  ],
  [
    ComponentType.MemberPlan,
    {
      type: ComponentType.MemberPlan,
      label: '会员方案',
      icon: 'GoldMedal',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        scope: 'platform',
        planet_id: '',
        recommend_plan_id: null,
        badge_text: '推荐',
        benefit_mode: 'list',
        scroll_direction: 'vertical',
        show_banner: true,
        banner_title: '选择适合你的会员方案',
        banner_subtitle: '解锁全文、资料下载与星球权益',
        show_agreement: true,
        agreement_text: '开通即表示同意《会员服务协议》',
        ios_alt_copy: '由于相关规范，iOS 端暂不支持虚拟支付，请使用其他方式开通',
        data_source: { type: 'membership_plan', params: { scope: 'platform', status: 1 } },
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, margin_bottom: 72 }),
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
        title: '品牌介绍',
        subtitle: '已认证',
        desc: '一句话介绍你的产品与服务',
        eyebrow: 'BRAND',
        avatar_text: '品',
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
    ComponentType.PromoBanner,
    {
      type: ComponentType.PromoBanner,
      label: '促销横幅',
      icon: 'Promotion',
      category: 'marketing',
      categoryLabel: '营销',
      defaultProps: () => ({
        title: '年度会员 · 全站资料免费下',
        subtitle: '300+ 份报告 / SOP / 模板 · 每天 0.55 元',
        button_text: '立即开通 ›',
        button_link: '/pages/member-center/member-center',
        gradient_from: '#1d1b18',
        gradient_mid: '#3b2f22',
        gradient_to: '#7a4a1d',
        title_color: '#f3dcaa',
        subtitle_color: '#d9ccb8',
        button_bg: '#f3dcaa',
        button_color: '#3a2708',
        show_glow: true,
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 16 }),
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
        color: '#002FA7',
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
        title: '读者交流群',
        tags: ['咨询', '找资源'],
        button_text: '加入群聊',
        sheet_title: '加入群聊',
        tip_text: '长按二维码可识别加群',
        groups: [
          { id: 'g1', name: '深跨协交流群', icon: '', join_type: 'qrcode', qrcode: '', wecom_url: '' },
          { id: 'g2', name: '数据报告分享群', icon: '', join_type: 'qrcode', qrcode: '', wecom_url: '' },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10, border_radius: 12 }),
      validate: (props) => {
        const warnings: string[] = []
        const groups = Array.isArray(props.groups) ? props.groups : []
        if (!groups.length) warnings.push('请至少添加一个群')
        groups.forEach((g: any, i: number) => {
          if (!String(g?.name || '').trim()) warnings.push(`第 ${i + 1} 个群缺少名称`)
          const mode = String(g?.join_type || 'qrcode')
          if (mode === 'wecom') {
            if (!String(g?.wecom_url || '').trim()) {
              warnings.push(`「${g?.name || `群${i + 1}`}」未填写企微加入群聊链接`)
            }
          } else if (!String(g?.qrcode || '').trim()) {
            warnings.push(`「${g?.name || `群${i + 1}`}」未上传二维码`)
          }
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
        logo_text: '品牌',
        // 新增：Logo 展示形式。留空则由 normalizeBrandHeaderProps 按 logo/logo_text 反推，
        // 历史草稿零改动可用；这里显式给 'text' 是新建组件的默认。
        logo_mode: 'text',
        logo_text_bold: true,
        title: '品牌名称 · 一句话定位',
        subtitle: '',
        // 新增：背景模式（bg_mode 取代 style_type，immersive 为沉浸透明）
        bg_mode: 'plain',
        style_type: 'plain',
        background_color: '#ffffff',
        gradient_from: '#002FA7',
        gradient_to: '#1A4BBF',
        bottom_border: true,
        bottom_border_color: '#eef1f6',
        title_color: '#172033',
        title_color_light: '#ffffff',
        subtitle_color: '#7b8798',
        show_divider: true,
        logo_height: 28,
        logo_max_width: 88,
        // 新增：保持宽高比 + 适应方式（防压扁/拉伸的根治点）
        logo_keep_ratio: true,
        logo_fit: 'contain',
        title_font_size: 15,
        subtitle_font_size: 11,
        logo_text_color: '#002FA7',
        divider_color: '#d0d8e8',
        bar_padding_left: 12,
        bar_padding_right: 12,
        item_gap: 10,
        // 新增：点击跳转 + 右侧功能区
        tap_action: 'none',
        show_action: false,
        action_icon: 'search',
        action_tap_action: 'none',
        // sticky 为新字段，fixed_top 保留为历史别名（两者同步）
        sticky: true,
        fixed_top: true,
        backdrop_blur: false,
        scroll_shadow: false,
        data_source: {
          type: 'content',
          params: { status: 'published' },
          query: { status: 'published' },
        },
      }),
      defaultStyle: () => ({ margin_left: 0, margin_right: 0, margin_top: 0, margin_bottom: 0 }),
      validate: (props) => {
        const warnings: string[] = []
        const logo = String(props.logo || '').trim()
        const logoText = String(props.logo_text || '').trim()
        const title = String(props.title || '').trim()
        // 标题与 Logo 全空时顶栏会退化成空占位（画布有占位提示，但上线后是空白条）
        if (!title && !logo && !logoText) {
          warnings.push('品牌顶栏的主标题与 Logo 不能同时为空')
        }
        if (props.tap_action === 'custom' && !String(props.tap_link_url || '').trim()) {
          warnings.push('点击品牌区选了「自定义跳转」但未填写跳转目标')
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
          { icon: '/images/nav-icons/chart.svg', title: '资讯', link_type: 'page', link_url: '/pkg-content/content-list/content-list' },
          { icon: '/images/nav-icons/fire.svg', title: '长文', link_type: 'page', link_url: '/pkg-content/content-list/content-list' },
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
  [
    ComponentType.Container,
    {
      type: ComponentType.Container,
      label: '容器/分栏',
      icon: 'Grid',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        layout: 'row',
        columns: 2,
        gap: 12,
        background_color: '',
        title: '',
      }),
      defaultStyle: () => ({ padding_top: 12, padding_bottom: 12, padding_left: 12, padding_right: 12 }),
    },
  ],
  [
    ComponentType.ImageHotspot,
    {
      type: ComponentType.ImageHotspot,
      label: '图片热区',
      icon: 'Picture',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        image: '',
        aspect_ratio: '750:400',
        hotspots: [],
      }),
      defaultStyle: () => ({}),
      validate: (props) => {
        const warnings: string[] = []
        if (!String(props.image || '').trim()) warnings.push('图片热区未设置底图')
        return warnings
      },
    },
  ],
  [
    ComponentType.SectionBg,
    {
      type: ComponentType.SectionBg,
      label: '通栏背景',
      icon: 'CollectionTag',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        background_type: 'color',
        background_color: '#F5F7FB',
        gradient_from: '#F5F7FB',
        gradient_to: '#FFFFFF',
        background_image: '',
        min_height: 120,
        title: '',
      }),
      defaultStyle: () => ({ padding_top: 16, padding_bottom: 16 }),
    },
  ],
  [
    ComponentType.FeatureCards,
    {
      type: ComponentType.FeatureCards,
      label: '卖点卡片组',
      icon: 'Postcard',
      category: 'content',
      categoryLabel: '内容',
      defaultProps: () => ({
        columns: 3,
        items: [
          { icon: '✨', title: '卖点一', desc: '一句话说明' },
          { icon: '🚀', title: '卖点二', desc: '一句话说明' },
          { icon: '🛡️', title: '卖点三', desc: '一句话说明' },
        ],
      }),
      defaultStyle: () => ({ item_gap: 10 }),
    },
  ],
  [
    ComponentType.ImageCube,
    {
      type: ComponentType.ImageCube,
      label: '图片魔方',
      icon: 'Grid',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        layout: '2x2',
        gap: 6,
        radius: 8,
        items: [
          { image: '', link_type: 'none', link_url: '' },
          { image: '', link_type: 'none', link_url: '' },
          { image: '', link_type: 'none', link_url: '' },
          { image: '', link_type: 'none', link_url: '' },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const items = Array.isArray(props.items) ? props.items : []
        if (!items.some((it: any) => String(it?.image || '').trim())) {
          return ['图片魔方请至少上传一张图']
        }
        return []
      },
    },
  ],
  [
    ComponentType.ContentTabs,
    {
      type: ComponentType.ContentTabs,
      label: '选项卡',
      icon: 'Menu',
      category: 'layout',
      categoryLabel: '布局',
      defaultProps: () => ({
        panes: [
          {
            title: '资讯',
            items: [
              { image: '', title: '条目一', desc: '', link_type: 'page', link_url: '/pkg-content/content-list/content-list' },
            ],
          },
          {
            title: '活动',
            items: [
              { image: '', title: '条目一', desc: '', link_type: 'page', link_url: '/pkg-extra/activity-list/activity-list' },
            ],
          },
        ],
      }),
      defaultStyle: () => ({ margin_left: 10, margin_right: 10 }),
      validate: (props) => {
        const panes = Array.isArray(props.panes) ? props.panes : []
        if (panes.length < 2) return ['选项卡至少需要 2 个分页']
        return []
      },
    },
  ],
  [
    ComponentType.PlanetHero,
    {
      type: ComponentType.PlanetHero,
      label: '星球顶栏',
      icon: 'Sunrise',
      category: 'planet',
      categoryLabel: '星球',
      defaultProps: () => ({
        source_mode: 'auto',
        logo_emoji: '🪐',
        title: BRAND_PLANET_NAME,
        subtitle: '内容创作者的自留地',
        join_text: '加入',
        join_link: '/pages/member-center/member-center',
        expire_text: '会员有效期至 2027-03-18 · 剩余 185 天 · 续费享 8 折',
        join_row_text: '👥 加入球友微信群，第一时间收到更新通知',
        join_row_go: '去加入 ›',
        join_row_link: '',
        kpis: [
          { value: '3,241', label: '球友' },
          { value: '1.2万', label: '沉淀内容' },
          { value: '27', label: '今日新增' },
        ],
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.PlanetTopics,
    {
      type: ComponentType.PlanetTopics,
      label: '星球话题预测',
      icon: 'DataLine',
      category: 'planet',
      categoryLabel: '星球',
      defaultProps: () => ({
        source_mode: 'auto',
        icon: '📈',
        title: '本周星球话题预测',
        badge: 'AI 推演',
        note: '基于近 30 天星球发帖、提问与互动数据推演。预计下周「AI 写作工具」将持续升温，建议提前储备相关选题。',
        items: [
          { name: 'AI 写作工具', width: 88, pct: '↑ 62%' },
          { name: '小红书新规', width: 71, pct: '↑ 34%' },
          { name: '付费社群定价', width: 54, pct: '↑ 12%' },
          { name: '公众号流量主', width: 31, pct: '↓ 8%', down: true },
        ],
      }),
      defaultStyle: () => ({ margin_left: 16, margin_right: 16 }),
    },
  ],
  [
    ComponentType.PlanetFeed,
    {
      type: ComponentType.PlanetFeed,
      label: '星球动态流',
      icon: 'ChatLineSquare',
      category: 'planet',
      categoryLabel: '星球',
      defaultProps: () => ({
        source_mode: 'auto',
        // 排序/条数/星球 ID：与 ContentServiceImpl.applyPlanetFeedSort 的白名单对齐。
        // planet_id 留空 = 跟随用户设置的主星球；sort_by 默认 new = 最新发布。
        planet_id: '',
        sort_by: 'new',
        page_size: 20,
        resources_url: '/pkg-content/resources/resources',
        // 标签栏默认「胶囊 + 吸顶 + 继承品牌色」= 线上现状，
        // 写成显式值而非留空，是为了让运营在面板上一眼看到当前口径。
        tabStyle: {
          variant: 'pill',
          inherit_brand: true,
          active_bg: '',
          active_text: '',
          text: '',
          sticky: true,
        },
        cardStyle: {
          margin_bottom: 12,
          padding: 14,
          radius: 16,
          shadow: 'light',
          image_ratio: 'square',
        },
        // 截断行数默认 0 = 不截断。给默认 3 会把线上长文动态凭空截掉，属破坏性变更。
        visibility: {
          show_top_badge: true,
          show_interactions: true,
          clamp_lines: 0,
        },
        // 默认高亮分段留空 = 选第一段；显式指定可做「落地即精华」这类默认位。
        default_seg: '',
        // 与线上「墨太白-星球」实际配置一致：8 个分段 key 全用上，
        // 避免新拖的组件与线上表现不同（预览里少了 host / homework 两个分段）。
        segs: [
          { key: 'all', label: '最新' },
          { key: 'essence', label: '精华' },
          { key: 'host', label: '只看星主' },
          { key: 'ask', label: '问答' },
          { key: 'checkin', label: '打卡' },
          { key: 'homework', label: '作业' },
          { key: 'official', label: '官方' },
          { key: 'resources', label: '资料' },
        ],
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmGreet,
    {
      type: ComponentType.WarmGreet,
      label: '品牌问候条',
      icon: 'User',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        greet_template: '你好',
        greet_skin: 'classic',
        show_notice: true,
        show_member_badge: false,
        show_search: true,
        search_placeholder: '搜索文章、笔记、专栏……',
        brand_initial: '',
        greet_title_font_size: 20,
        greet_sub_font_size: 11,
        member_cta_label: '开通会员 ›',
        member_active_label: '年度会员',
        member_link: '/pages/member-center/member-center',
        show_nav: true,
        navs: [
          { key: 'list', icon: '📚', label: '长文', url: '/pkg-content/content-list/content-list' },
          { key: 'column', icon: '🎧', label: '专栏课', url: '/pkg-content/product-list/product-list?type=column' },
          { key: 'planet', icon: '🪐', label: '星球', url: '/pages/planet/planet', tab: true },
          { key: 'shop', icon: '🛍', label: '商城', url: '/pages/shop/shop', tab: true },
          { key: 'resources', icon: '🗂', label: '资料库', url: '/pkg-content/resources/resources' },
        ],
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmAuthors,
    {
      type: ComponentType.WarmAuthors,
      label: '品牌作者列表',
      icon: 'UserFilled',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        title: W.authorsTitle,
        more_text: '全部作者 ›',
        more_url: '/pkg-content/content-list/content-list',
        more_tab: false,
        empty_text: '暂无作者',
        // 留空 = 用首页聚合接口的 warm_home_config.authors；填了则以这里为准
        authors: [] as Array<Record<string, unknown>>,
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmFeature,
    {
      type: ComponentType.WarmFeature,
      label: '品牌精选',
      icon: 'PictureFilled',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({ empty_text: '暂无精选内容' }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmColumns,
    {
      type: ComponentType.WarmColumns,
      label: '品牌专栏',
      icon: 'Notebook',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        title: '精品专栏',
        more_text: '全部 ›',
        more_url: '/pages/shop/shop',
        more_tab: true,
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmPlanetRec,
    {
      type: ComponentType.WarmPlanetRec,
      label: '品牌星球推荐',
      icon: 'Sunrise',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        title: '我的星球',
        more_text: '进入 ›',
        more_url: '/pkg-content/planet-list/planet-list',
        more_tab: false,
        // 2026-10-04 多星球推荐：卡片内容由后端按 planetId 下发，
        // props 只控展示策略。详见 props/WarmPlanetRecProps.vue 与小程序端 _syncPlanetUi。
        planet_mode: 'multi',
        planet_action: 'auto',
        planet_ids: [],
        planet_limit: 0,
        feed_url: '/pkg-content/planet-feed/planet-feed?planetId=warm-main',
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmFeed,
    {
      type: ComponentType.WarmFeed,
      label: '品牌信息流',
      icon: 'Reading',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({ footer: W.footer }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmHome,
    {
      type: ComponentType.WarmHome,
      label: '品牌首页模板',
      icon: 'House',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        authors_title: W.authorsTitle,
        columns_title: W.columnsTitle,
        planet_title: W.planetTitle,
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmDiscover,
    {
      type: ComponentType.WarmDiscover,
      label: '品牌发现模板',
      icon: 'Compass',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({
        title: '发现',
        tabs: [
          {
            key: 'all',
            label: '全部',
            source: 'all',
            visible: true,
            showBanner: true,
            chips: [
              { label: '全部', filter: 'all' },
              { label: '创作日常', filter: 'tag', tag: '创作日常' },
              { label: '工位美学', filter: 'tag', tag: '工位美学' },
              { label: '读书', filter: 'tag', tag: '读书' },
              { label: '副业', filter: 'tag', tag: '副业' },
            ],
          },
          {
            key: 'note',
            label: '笔记',
            source: 'note',
            visible: true,
            showBanner: true,
            chips: [
              { label: '全部', filter: 'all' },
              { label: '创作日常', filter: 'tag', tag: '创作日常' },
              { label: '工位美学', filter: 'tag', tag: '工位美学' },
              { label: '读书', filter: 'tag', tag: '读书' },
              { label: '副业', filter: 'tag', tag: '副业' },
              { label: '咖啡', filter: 'tag', tag: '咖啡' },
              { label: '数字游民', filter: 'tag', tag: '数字游民' },
            ],
          },
          {
            key: 'article',
            label: '长文',
            source: 'article',
            visible: true,
            chips: [
              { label: '全部', filter: 'all' },
              { label: '内容创业', filter: 'tag', tag: '内容创业' },
              { label: '写作方法', filter: 'tag', tag: '写作方法' },
              { label: '私域运营', filter: 'tag', tag: '私域运营' },
              { label: '年度精选', filter: 'tag', tag: '年度精选' },
            ],
          },
          {
            key: 'goods',
            label: '好物',
            source: 'goods',
            visible: true,
            chips: [
              { label: '全部', filter: 'all' },
              { label: '电子书', filter: 'tag', tag: '电子书' },
              { label: '资料包', filter: 'tag', tag: '资料包' },
              { label: '专栏', filter: 'tag', tag: '专栏' },
              { label: '周边', filter: 'tag', tag: '周边' },
            ],
          },
        ],
        article_layout: {
          mode: 'all_duo',
          fullEvery: 3,
          fullOnNoCover: true,
          duoStyles: ['magazine', 'row'],
        },
      }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmPlanet,
    {
      type: ComponentType.WarmPlanet,
      label: '星球固定页',
      icon: 'Sunrise',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({ title: W.planetShellTitle }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmShop,
    {
      type: ComponentType.WarmShop,
      label: '商城固定页',
      icon: 'Goods',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({ title: W.shopTitle }),
      defaultStyle: () => ({}),
    },
  ],
  [
    ComponentType.WarmMine,
    {
      type: ComponentType.WarmMine,
      label: '我的固定页',
      icon: 'User',
      category: 'warm',
      categoryLabel: '品牌组件',
      defaultProps: () => ({ title: '我的' }),
      defaultStyle: () => ({}),
    },
  ],
])

// ==================== 辅助函数 ====================

// ==================== 2026-10-05 新增 22 个组件（5 大类）====================
/**
 * 统一从 warmKitRegistry 注入，避免在此处重抄一遍 label/icon/defaultProps。
 * 每个组件的 defaultProps 自带完整 mock 假数据，拖入画布立即可视化。
 */
for (const meta of WARM_KIT_METAS) {
  componentRegistry.set(meta.type, {
    type: meta.type,
    label: meta.label,
    icon: meta.icon,
    category: meta.category as any,
    categoryLabel: meta.categoryLabel,
    defaultProps: meta.defaultProps,
    defaultStyle: meta.defaultStyle,
    ...(meta.validate ? { validate: meta.validate } : {}),
  })
}

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

/**
 * 整页模板类型（第三层资产）。
 *
 * 背景（2026-10-05）：品牌首页模板 / 品牌发现模板本质是整页壳，却混在
 * componentRegistry 里与原子组件同列，运营在「组件」Tab 会误当普通组件拖进去，
 * 造成资产概念混淆。这里只**收敛展示入口**——注册、渲染、DSL 加载逻辑一律不动
 * （历史 DSL 里存的就是这两个 type，删注册会直接白屏）。
 *
 * 它们的入口改到「区块模板」Tab 顶部的「整页模板」分区，见 blockTemplates.ts。
 */
export const PAGE_TEMPLATE_TYPES: ReadonlySet<ComponentType> = new Set<ComponentType>([
  ComponentType.WarmHome,
  ComponentType.WarmDiscover,
])

/** 是否为整页模板（而非原子/业务组件） */
export function isPageTemplateType(type: ComponentType): boolean {
  return PAGE_TEMPLATE_TYPES.has(type)
}

/** 按分类获取组件列表；默认排除整页模板（组件库只放可拖入的原子/业务组件） */
export function getComponentsByCategory(category: string, options?: { includePageTemplates?: boolean }): ComponentDefinition[] {
  const includePageTemplates = options?.includePageTemplates === true
  const result: ComponentDefinition[] = []
  for (const def of componentRegistry.values()) {
    if (def.category !== category) continue
    if (!includePageTemplates && PAGE_TEMPLATE_TYPES.has(def.type)) continue
    result.push(def)
  }
  return result
}

/** 获取所有分类（固定展示顺序；已无独立「媒体」分类） */
export function getAllCategories(): Array<{ value: string; label: string }> {
  const preferred = [
    { value: 'content', label: '内容' },
    { value: 'planet', label: '星球' },
    { value: 'commerce', label: '商品' },
    { value: 'marketing', label: '营销' },
    { value: 'layout', label: '布局' },
    { value: 'warm', label: '品牌组件' },
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
  ComponentType.NoteFeed,
  ComponentType.MomentsFeed,
  ComponentType.HotNews,
  ComponentType.ActivityEntry,
  ComponentType.ActivityList,
  ComponentType.AppointmentService,
  ComponentType.MemberCard,
  ComponentType.PromoBanner,
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
  ComponentType.ContentPaywall,
  ComponentType.MaterialList,
  ComponentType.QaList,
  ComponentType.MemberPlan,
  ComponentType.SectionTitle,
  ComponentType.Divider,
  ComponentType.Spacer,
  ComponentType.FormEntry,
  ComponentType.JoinGroup,
  ComponentType.BrandHeader,
  ComponentType.Container,
  ComponentType.ImageHotspot,
  ComponentType.SectionBg,
  ComponentType.FeatureCards,
  ComponentType.ImageCube,
  ComponentType.ContentTabs,
  ComponentType.PlanetHero,
  ComponentType.PlanetTopics,
  ComponentType.PlanetFeed,
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
])

/** 判断组件类型是否已在小程序端实现渲染 */
/** 本批 22 个组件已在小程序端 dsl-renderer 内联实现渲染 */
for (const t of WARM_KIT_TYPES) {
  MINIAPP_RENDER_SUPPORTED_TYPES.add(t as ComponentType)
}

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
