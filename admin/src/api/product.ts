/**
 * 商品相关 API
 */
import request from './request'
import type {
  ProductCategory,
  CreateCategoryParams,
  UpdateCategoryParams,
  ProductRecord,
  CreateProductParams,
  UpdateProductParams,
  ProductListParams,
} from '@/types/product'
import type { PaginatedResponse } from '@/types/global'

const BASE = '/api/v1/admin'

// ==================== 商品分类 ====================

/** 获取分类列表（树形） */
export function getCategoryList() {
  return request.get<ProductCategory[]>(`${BASE}/product-categories`)
}

/** 创建分类 */
export function createCategory(data: CreateCategoryParams) {
  const payload: Record<string, unknown> = {
    name: (data as any).name,
    parentId: (data as any).parentId ?? (data as any).parent_id ?? 0,
    sortOrder: (data as any).sortOrder ?? (data as any).sort ?? 0,
    icon: (data as any).icon,
    status: (data as any).status ?? 1,
  }
  return request.post<ProductCategory>(`${BASE}/product-categories`, payload)
}

/** 更新分类 */
export function updateCategory(id: number, data: UpdateCategoryParams) {
  const payload: Record<string, unknown> = {
    name: (data as any).name,
    parentId: (data as any).parentId ?? (data as any).parent_id ?? 0,
    sortOrder: (data as any).sortOrder ?? (data as any).sort ?? 0,
    icon: (data as any).icon,
    status: (data as any).status ?? 1,
  }
  return request.put<ProductCategory>(`${BASE}/product-categories/${id}`, payload)
}

/** 删除分类 */
export function deleteCategory(id: number) {
  return request.delete(`${BASE}/product-categories/${id}`)
}

// ==================== 商品 ====================

/** 获取商品列表 */
export function getProductList(params?: ProductListParams) {
  return request.get<PaginatedResponse<ProductRecord>>(`${BASE}/products`, { params })
}

/** 获取商品详情 */
export function getProduct(id: number) {
  return request.get<ProductRecord>(`${BASE}/products/${id}`)
}

/** 创建商品 */
export function createProduct(data: CreateProductParams) {
  return request.post<ProductRecord>(`${BASE}/products`, data)
}

/** 更新商品 */
export function updateProduct(id: number, data: UpdateProductParams) {
  return request.put<ProductRecord>(`${BASE}/products/${id}`, data)
}

/** 删除商品 */
export function deleteProduct(id: number) {
  return request.delete(`${BASE}/products/${id}`)
}

/** 上架 */
export function onSaleProduct(id: number) {
  return request.put(`${BASE}/products/${id}/on-sale`)
}

/** 下架 */
export function offSaleProduct(id: number) {
  return request.put(`${BASE}/products/${id}/off-sale`)
}
