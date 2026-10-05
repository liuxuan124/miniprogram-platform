/**
 * 商品相关类型定义
 */

/** 商品分类 */
export interface ProductCategory {
  id: number
  name: string
  parent_id: number | null
  sort: number
  icon?: string
  status: number // 1=启用 0=禁用
  children?: ProductCategory[]
  created_at: string
  updated_at: string
}

/** 创建分类参数 */
export interface CreateCategoryParams {
  name: string
  parent_id?: number | null
  sort?: number
  icon?: string
  status?: number
}

/** 更新分类参数 */
export interface UpdateCategoryParams {
  name?: string
  parent_id?: number | null
  sort?: number
  icon?: string
  status?: number
}

/** 商品状态 */
export enum ProductStatus {
  Draft = 'draft',
  OnSale = 'on_sale',
  OffSale = 'off_sale',
}

/** 商品状态标签 */
export const ProductStatusLabels: Record<ProductStatus, string> = {
  [ProductStatus.Draft]: '草稿',
  [ProductStatus.OnSale]: '已上架',
  [ProductStatus.OffSale]: '已下架',
}

/** 商品状态标签类型 */
export const ProductStatusTagType: Record<ProductStatus, string> = {
  [ProductStatus.Draft]: 'info',
  [ProductStatus.OnSale]: 'success',
  [ProductStatus.OffSale]: 'warning',
}

/** SKU 规格项 */
export interface SkuSpec {
  name: string
  value: string
}

/** SKU */
export interface SkuItem {
  id?: number
  specs: SkuSpec[]
  price: number
  original_price?: number
  stock: number
  sku_code?: string
  image?: string
}

/** 商品记录 */
export interface ProductRecord {
  id: number
  name: string
  category_id: number
  category_name?: string
  /** 关联作者档案ID（可空） */
  authorId?: number
  author_id?: number
  /** 关联作者昵称（后台列表展示用；可空） */
  author_name?: string
  productType?: string
  description?: string
  content?: string
  main_image: string
  images?: string[]
  status: ProductStatus | string
  skus: SkuItem[]
  min_price?: number
  max_price?: number
  total_stock?: number
  sort: number
  created_at: string
  updated_at: string
}

/** 创建商品参数 */
export interface CreateProductParams {
  name: string
  category_id: number
  productType?: string
  description?: string
  content?: string
  main_image: string
  images?: string[]
  skus: SkuItem[]
  sort?: number
}

/** 更新商品参数 */
export interface UpdateProductParams {
  name?: string
  category_id?: number
  productType?: string
  description?: string
  content?: string
  main_image?: string
  images?: string[]
  skus?: SkuItem[]
  sort?: number
}

/** 商品列表查询参数 */
export interface ProductListParams {
  page?: number
  page_size?: number
  current?: number
  size?: number
  keyword?: string
  category_id?: number
  categoryId?: number
  status?: string
  productType?: string
}

/* ============================================================
   数字商品编辑页数据契约
   ------------------------------------------------------------
   与后端 mp_product 表结构一一对应，但**刻意保留视图模型的分组结构**：
   后端是扁平列（main_image / video_url / member_price / gift_* ...），
   前端编辑页是按「媒体池 / 定价 / 履约 / 商业化」四块组织的，
   提交时由 edit.vue 的 buildApiPayload() 做一次「视图模型 → 扁平 payload」压平。
   这样做的理由：后端加字段不影响编辑页结构，编辑页重组也不动后端 DTO。
   ⚠️ 唯一真源是 formData + buildApiPayload，本类型只做形状约束与文档说明，
   不要在这里加纯前端的临时字段（如裁切弹窗的 pendingFile）。
   ============================================================ */

/** 一级物理形态：决定履约链路与库存口径 */
export type ProductShape = 'physical' | 'digital' | 'service' | 'membership'

/**
 * 二级数字载体：只在「数字商品」形态下级联出现。
 * 后端 productTypes 数组 = [形态, ...载体]，首位形态。
 */
export type DigitalCarrier = 'resource_pack' | 'column' | 'ebook' | 'ticket'

/** 定价模式：一口价（数字商品默认）vs 多规格（实物多 SKU） */
export type PricingMode = 'flat' | 'matrix'

/**
 * 履约方式。
 * auto_instant = 即时自动发货（卡密 / 直链 / 兑换码），支付成功即完成交付；
 * manual_guide = 人工/半自动履约（社群入群、飞书 Wiki 权限人工开通），
 *                端上状态为「待开通凭证已生成」而非「已发货」。
 * ⚠️ 这两者的区分是防虚假发货客诉的关键，不要合并回一个布尔开关。
 */
export type FulfillmentMode = 'auto' | 'manual' | 'redeem_code'

/** VIP 定价三态互斥 */
export type VipPricingType = 'none' | 'fixed_vip_price' | 'vip_free'

/** 媒体池中的单张图片 */
export interface MediaImage {
  url: string
  /** 是否为主图/封面。池内永远只有一张为 true，且恒为 index 0 */
  isMain: boolean
  sortOrder: number
}

/** 宣传视频（含独立封面） */
export interface MediaVideo {
  url: string
  /** 独立封面；为空时端上回退用主图 */
  posterUrl?: string
  /** 上限约束（秒），仅前端防呆用，不落库 */
  durationLimit?: number
}

/** 一口价定价 */
export interface FlatPricing {
  price: number
  originalPrice?: number
  /** true = 不限量（stock 落 0）；false = 限量 stockLimit */
  unlimitedStock: boolean
  stockLimit?: number
}

/** 买赠权益 */
export interface BundleRewards {
  grantVipDays?: number
  autoJoinPlanetId?: string
  /** 赠送星球天数（星球门禁走订购，无期限会进不去） */
  autoJoinPlanetDays?: number
}

/** 商品编辑页视图模型（前端分组结构） */
export interface DigitalProductForm {
  id?: string
  name: string
  categoryId: string

  /** 1. 类型层级解耦 */
  productType: ProductShape
  digitalCarriers?: DigitalCarrier[]

  /** 2. 媒体资产池 */
  mediaGallery: {
    images: MediaImage[]
    video?: MediaVideo
  }

  /** 3. 价格与规格模式 */
  pricingMode: PricingMode
  flatPricing?: FlatPricing
  skus?: SkuItem[]

  /** 4. 履约方式强化 */
  fulfillment: {
    mode: FulfillmentMode
    /** 交付指引 / 客服话术；mode=auto_instant 时必须是用户能立刻自取的内容 */
    guideContent: string
    /**
     * 是否关联外部平台自动化（飞书 Wiki 等开放平台 API 授予协作者权限）。
     * ⚠️ 2026-10-05 仅保留扩展位，后端尚未实现，编辑页不下发此字段。
     */
    wikiAutoGrant?: boolean
  }

  /** 5. 会员与商业化联动 */
  commercialRights: {
    vipPricingType: VipPricingType
    vipPrice?: number
    bundleRewards: BundleRewards
  }

  /** 6. 详情与模板 */
  detailTemplate: string
  description: string
}
