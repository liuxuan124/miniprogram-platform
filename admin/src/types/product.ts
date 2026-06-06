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
