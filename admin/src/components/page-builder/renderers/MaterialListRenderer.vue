<template>
  <div class="render-material-list">
    <div v-if="showFilterBar" class="material-filter">
      <button
        v-for="tab in filterTabs"
        :key="tab.id"
        type="button"
        class="material-filter__tab"
        :class="{ active: activeGroup === tab.id }"
        @click="activeGroup = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <div v-if="state === 'loading'" class="material-state">
      <div v-for="i in skeletonCount" :key="i" class="material-skeleton" />
    </div>
    <div v-else-if="state === 'error'" class="material-state material-state--error">
      <p>{{ errorMessage }}</p>
      <button type="button" class="material-retry" @click="refresh">重试</button>
    </div>
    <div v-else-if="state === 'empty'" class="material-state material-state--empty">
      {{ previewMode ? '暂无资料，请先在资料库发布文件' : '暂无符合条件的资料' }}
    </div>
    <div
      v-else
      class="material-body"
      :class="[`material-body--${layoutMode}`, { 'material-body--card': layoutMode === 'card' }]"
    >
      <div
        v-for="item in displayItems"
        :key="String(item.id)"
        class="material-row"
        :class="{ 'material-row--card': layoutMode === 'card' }"
      >
        <div class="material-icon" :style="{ background: item.fileColor }">{{ item.fileIcon }}</div>
        <div class="material-main">
          <div class="material-title">{{ item.title }}</div>
          <div v-if="showMeta" class="material-meta">{{ item.metaLine }}</div>
          <div class="material-sub">
            <span v-if="showDownloads">下载 {{ item.downloadCount }}</span>
            <span v-if="showAccess" class="material-access" :data-type="item.access.type">{{ item.access.label }}</span>
          </div>
        </div>
        <div class="material-arrow">›</div>
      </div>
    </div>

    <div v-if="showMoreLink && state === 'data'" class="material-more">
      <span>{{ moreText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { getFileGroups, getFileList } from '@/api/files'
import { demoMaterialItems, mapMaterialRecord, type MaterialListItem } from '@/utils/dsl-material'
import { loadHydratedComponent } from '@/utils/preview-datasource'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const activeGroup = ref('')
const items = ref<MaterialListItem[]>([])
const loading = ref(false)
const failed = ref(false)
const empty = ref(false)

const limit = computed(() => Math.max(Number(props.component.props?.limit) || 5, 1))
const layoutMode = computed(() => (props.component.props?.layout === 'card' ? 'card' : 'list'))
const showFilterBar = computed(() => props.component.props?.show_filter_bar === true)
const showMeta = computed(() => props.component.props?.show_meta !== false)
const showDownloads = computed(() => props.component.props?.show_downloads !== false)
const showAccess = computed(() => props.component.props?.show_access !== false)
const showMoreLink = computed(() => props.component.props?.show_more === true)
const moreText = computed(() => props.component.props?.more_text || '查看更多资料 ›')
const skeletonCount = computed(() => Math.min(limit.value, 4))

const filterTabs = computed(() => {
  const raw = Array.isArray(props.component.props?.category_ids)
    ? props.component.props.category_ids
    : []
  const names = props.component.props?.category_names || {}
  const tabs = [{ id: '', name: '全部' }]
  raw.forEach((id: string | number) => {
    tabs.push({ id: String(id), name: String(names[String(id)] || `分组 ${id}`) })
  })
  return tabs
})

const displayItems = computed(() => {
  let list = items.value
  if (activeGroup.value) {
    // 客户端按 group 过滤需 items 带 groupId；映射时暂用 props 手工 ids
    const manualIds = Array.isArray(props.component.props?.manual_ids)
      ? props.component.props.manual_ids.map(String)
      : null
    if (manualIds && manualIds.length) {
      list = list.filter((x) => manualIds.includes(String(x.id)))
    }
  }
  return list.slice(0, limit.value)
})

const state = computed(() => {
  if (loading.value) return 'loading'
  if (failed.value) return 'error'
  if (empty.value || !displayItems.value.length) return 'empty'
  return 'data'
})

const errorMessage = computed(() => '资料加载失败，请检查网络或资料是否已发布')

async function refresh() {
  if (props.previewMode) {
    items.value = demoMaterialItems(limit.value)
    empty.value = false
    failed.value = false
    return
  }
  loading.value = true
  failed.value = false
  try {
    const mode = String(props.component.props?.source_mode || 'all')
    if (mode === 'manual') {
      const ids = Array.isArray(props.component.props?.manual_ids) ? props.component.props.manual_ids : []
      if (!ids.length) {
        items.value = demoMaterialItems(limit.value)
        empty.value = false
        return
      }
      const res = await getFileList({ current: 1, size: Math.max(ids.length, limit.value), status: 'published' })
      const records = (res as any)?.data?.records || (res as any)?.records || []
      const map = new Map(records.map((r: any) => [String(r.id), r]))
      items.value = ids
        .map((id: any, i: number) => map.get(String(id)))
        .filter(Boolean)
        .map((r: any, i: number) => mapMaterialRecord(r, i))
      empty.value = !items.value.length
      return
    }
    const hydrated = await loadHydratedComponent(props.component)
    if (hydrated.props?._previewDataFailed) {
      failed.value = true
      items.value = []
      empty.value = true
      return
    }
    const list = Array.isArray(hydrated.props?.items) ? hydrated.props.items : []
    items.value = list as MaterialListItem[]
    empty.value = !list.length
  } catch {
    failed.value = true
    items.value = []
    empty.value = true
  } finally {
    loading.value = false
  }
}

onMounted(refresh)
watch(
  () => JSON.stringify({
    limit: props.component.props?.limit,
    source_mode: props.component.props?.source_mode,
    manual_ids: props.component.props?.manual_ids,
    sort: props.component.props?.sort,
    category_ids: props.component.props?.category_ids,
  }),
  refresh,
)

onMounted(async () => {
  if (!showFilterBar.value) return
  try {
    const res = await getFileGroups()
    const groups = (res as any)?.data || res || []
    if (Array.isArray(groups) && groups.length && !props.component.props?.category_ids?.length) {
      // 仅用于画布展示分组名（不写回 DSL）
    }
  } catch {
    /* ignore */
  }
})
</script>

<style scoped>
.render-material-list {
  font-size: 13px;
  color: #1e293b;
}
.material-filter {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 4px;
}
.material-filter__tab {
  border: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 999px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
}
.material-filter__tab.active {
  border-color: #c8923a;
  color: #a66b1f;
  background: #fff8ed;
}
.material-body--list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.material-body--card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.material-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eef2f6;
}
.material-row--card {
  flex-direction: column;
  align-items: flex-start;
}
.material-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.material-main {
  flex: 1;
  min-width: 0;
}
.material-title {
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.material-meta {
  font-size: 11px;
  color: #64748b;
  margin-top: 2px;
}
.material-sub {
  display: flex;
  gap: 8px;
  font-size: 11px;
  color: #94a3b8;
  margin-top: 4px;
}
.material-access {
  padding: 0 6px;
  border-radius: 4px;
  background: #f1f5f9;
  color: #475569;
}
.material-access[data-type='free'] {
  background: #ecfdf5;
  color: #047857;
}
.material-access[data-type='vip'],
.material-access[data-type='planet'] {
  background: #fff7ed;
  color: #c2410c;
}
.material-arrow {
  color: #cbd5e1;
  font-size: 18px;
}
.material-state {
  padding: 16px;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}
.material-skeleton {
  height: 56px;
  border-radius: 12px;
  background: linear-gradient(90deg, #f1f5f9, #e2e8f0, #f1f5f9);
  background-size: 200% 100%;
  animation: shimmer 1.2s infinite;
  margin-bottom: 8px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.material-retry {
  margin-top: 8px;
  border: none;
  background: #c8923a;
  color: #fff;
  border-radius: 999px;
  padding: 6px 16px;
  cursor: pointer;
}
.material-more {
  text-align: center;
  margin-top: 10px;
  font-size: 12px;
  color: #c8923a;
}
</style>
