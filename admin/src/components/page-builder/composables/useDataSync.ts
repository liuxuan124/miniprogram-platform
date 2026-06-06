import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getProductList } from '@/api/product'
import { getContentList } from '@/api/content'
import { get } from '@/api/request'

export function useDataSync() {
  const syncing = ref(false)

  async function syncFromApi(
    apiCall: () => Promise<any>,
    mapper: (item: any) => any,
    onSuccess: (items: any[]) => void
  ) {
    syncing.value = true
    try {
      const res = await apiCall()
      const data = res.data as any
      const records = data?.records || data?.list || (Array.isArray(data) ? data : [])
      const items = records.map(mapper)
      onSuccess(items)
      ElMessage.success(`已同步 ${items.length} 条数据`)
    } catch (e: any) {
      ElMessage.error('同步失败：' + (e?.message || '未知错误'))
    } finally {
      syncing.value = false
    }
  }

  async function syncProducts(onSuccess: (items: any[]) => void) {
    await syncFromApi(
      () => getProductList({ current: 1, size: 50 }),
      (item: any) => ({
        id: item.id,
        title: item.name || item.title || '',
        price: item.price || 0,
        image: item.coverImage || item.image || item.mainImage || '',
        sales: item.sales || item.salesCount || 0,
      }),
      onSuccess
    )
  }

  async function syncContents(onSuccess: (items: any[]) => void) {
    await syncFromApi(
      () => getContentList({ page: 1, page_size: 50 } as any),
      (item: any) => ({
        id: item.id,
        title: item.title || item.name || '',
        cover: item.coverImage || item.cover || '',
        createdAt: item.createdAt || item.createTime || '',
      }),
      onSuccess
    )
  }

  async function syncActivities(onSuccess: (items: any[]) => void) {
    await syncFromApi(
      () => get('/api/v1/admin/activities', { current: 1, size: 50 }),
      (item: any) => ({
        id: item.id,
        name: item.name || '',
        dateText: item.dateText || '',
        venue: item.venue || '',
      }),
      onSuccess
    )
  }

  async function syncCategories(onSuccess: (items: any[]) => void) {
    await syncFromApi(
      () => get('/api/v1/admin/product-categories', { current: 1, size: 50 }),
      (item: any) => ({
        id: item.id,
        name: item.name || '',
        icon: item.icon || '',
        image: item.image || '',
      }),
      onSuccess
    )
  }

  return { syncing, syncFromApi, syncProducts, syncContents, syncActivities, syncCategories }
}
