import { ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { loadHydratedComponent } from '@/utils/preview-datasource'

export function useEditorLiveItems(
  getComponent: () => ComponentInstance,
  isPreview: () => boolean,
) {
  const items = ref<any[]>([])
  const loading = ref(false)
  const empty = ref(false)
  const failed = ref(false)

  async function refresh() {
    // 仅 H5/弹窗等显式 previewMode=true 时跳过；装修器画布不得传 previewMode
    if (isPreview()) return
    loading.value = true
    failed.value = false
    try {
      const next = await loadHydratedComponent(getComponent())
      if (next.props?._previewDataFailed) {
        items.value = []
        empty.value = true
        failed.value = true
        return
      }
      const list = Array.isArray(next.props?.items) ? next.props.items : []
      items.value = list
      empty.value = list.length === 0
    } catch {
      items.value = []
      empty.value = true
      failed.value = true
    } finally {
      loading.value = false
    }
  }

  watch(
    () => JSON.stringify({
      type: getComponent().type,
      limit: getComponent().props?.limit,
      pageSize: getComponent().props?.page_size,
      showCategoryTabs: getComponent().props?.show_category_tabs,
      showHeader: getComponent().props?.show_header,
      sourceMode: getComponent().props?.source_mode,
      productIds: getComponent().props?.product_ids,
      typeTabs: getComponent().props?.type_tabs,
      ds: getComponent().props?.data_source || getComponent().data_source,
    }),
    refresh,
    { immediate: true },
  )

  return { items, loading, empty, failed, refresh }
}
