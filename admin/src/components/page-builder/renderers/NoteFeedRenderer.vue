<template>
  <div class="render-note-feed" :class="{ 'render-note-feed--preview': previewMode }">
    <div
      v-if="showCategoryTabs && categoryTabs.length"
      class="feed-tabs"
      @mousedown.stop
      @pointerdown.stop
      @touchstart.stop
    >
      <button
        v-for="tab in categoryTabs"
        :key="`${tab.id}-${tab.name}`"
        type="button"
        class="feed-tab"
        :class="{ active: activeTabId === String(tab.id) }"
        @click.stop="activeTabId = String(tab.id)"
      >
        {{ tab.name }}
      </button>
    </div>
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showFilteredEmpty" class="preview-data-empty">
      {{ previewMode ? '暂无笔记数据，请确认内容已发布' : '当前筛选下没有已发布笔记' }}
    </div>
    <div v-else-if="!previewMode && (liveLoading || tabLoading)" class="preview-data-empty">正在读取已发布笔记…</div>
    <div
      v-else
      class="note-masonry"
      :style="{ gap: `${itemGap}px` }"
    >
      <div
        v-for="(item, index) in filteredNoteItems"
        :key="`${item.id || item.title || 'note'}-${index}`"
        class="note-card"
        :class="{ 'is-clickable': previewMode }"
        @click="onNoteClick($event, item)"
      >
        <div class="note-cover">
          <img v-if="item.cover" :src="item.cover" alt="" />
          <span v-else>📷</span>
        </div>
        <div class="note-body">
          <div class="note-title">{{ item.title || '笔记标题' }}</div>
          <div class="note-foot">
            <span class="note-av">{{ item.authorInitial || '作' }}</span>
            <span class="note-author">{{ item.author || '作者' }}</span>
            <span class="note-like">♡ {{ item.likeText || '0' }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!showFailState && !showFilteredEmpty && !liveLoading && filteredNoteItems.length" class="feed-footer">
      <span>{{ previewMode ? '预览：小程序下滑页面将自动加载更多笔记' : '下滑页面加载更多笔记…' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { fetchTopContentCategoryTabs, withAllCategoryTab } from '@/utils/content-category-tabs'
import { loadHydratedComponent } from '@/utils/preview-datasource'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

type NoteItem = {
  id?: number | string
  title?: string
  cover?: string
  author?: string
  authorInitial?: string
  likeText?: string
  categoryId?: string | number
  categoryName?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const activeTabId = ref('')
const tabLoading = ref(false)
const categoryTabs = ref<{ id: string | number; name: string }[]>([])
const hydratedItems = ref<NoteItem[]>([])
const failMessage = ref('')

const showCategoryTabs = computed(() => props.component.props.show_category_tabs === true)
const itemGap = computed(() => Number(props.component.props.item_gap ?? 11))

const feedComponent = computed(() => props.component)

const { items: liveItems, loading: liveLoading, error: liveError } = useEditorLiveItems(
  () => feedComponent.value,
  () => props.previewMode === true,
)

const showFailState = computed(() => !!failMessage.value || !!liveError.value)
const sourceItems = computed(() => {
  if (props.previewMode && hydratedItems.value.length) return hydratedItems.value
  return liveItems.value as NoteItem[]
})

const filteredNoteItems = computed(() => {
  const items = sourceItems.value || []
  if (!showCategoryTabs.value || !activeTabId.value) return items
  const tab = categoryTabs.value.find((t) => String(t.id) === String(activeTabId.value))
  if (!tab || !tab.id) return items
  return items.filter((item) => {
    if (item.categoryId != null && String(item.categoryId) === String(tab.id)) return true
    return `${item.categoryName || ''} ${item.title || ''}`.includes(tab.name)
  })
})

const showFilteredEmpty = computed(() => {
  if (showFailState.value) return false
  if (liveLoading.value || tabLoading.value) return false
  return !filteredNoteItems.value.length
})

function formatLike(n: unknown) {
  const num = Math.max(0, Number(n) || 0)
  if (num >= 10000) return `${(num / 10000).toFixed(1).replace(/\.0$/, '')}w`
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`
  return String(num)
}

function normalizeNote(raw: Record<string, any>): NoteItem {
  const author = String(raw.author || raw.authorName || '作者').trim() || '作者'
  const images = Array.isArray(raw.images) ? raw.images : []
  const cover = raw.coverImage || raw.cover_image || raw.cover || images[0] || ''
  return {
    id: raw.id,
    title: raw.title || raw.name || '笔记标题',
    cover,
    author,
    authorInitial: author.slice(0, 1),
    likeText: formatLike(raw.likeCount ?? raw.like_count ?? 0),
    categoryId: raw.categoryId ?? raw.category_id,
    categoryName: raw.categoryName ?? raw.category_name,
  }
}

async function loadCategoryTabs() {
  if (!showCategoryTabs.value) {
    categoryTabs.value = []
    return
  }
  tabLoading.value = true
  try {
    const tabs = await fetchTopContentCategoryTabs()
    categoryTabs.value = withAllCategoryTab(tabs)
    if (!activeTabId.value && categoryTabs.value.length) {
      activeTabId.value = String(categoryTabs.value[0].id ?? '')
    }
  } catch (e: any) {
    categoryTabs.value = [{ id: '', name: '全部' }]
    activeTabId.value = ''
  } finally {
    tabLoading.value = false
  }
}

async function loadPreviewItems() {
  if (!props.previewMode) return
  try {
    const result = await loadHydratedComponent(props.component)
    const rows = Array.isArray(result?.runtimeData) ? result.runtimeData : []
    hydratedItems.value = rows
      .filter((item: Record<string, any>) => {
        const t = String(item.contentType || item.content_type || '').toLowerCase()
        return !t || t === 'note'
      })
      .map(normalizeNote)
  } catch (e: any) {
    failMessage.value = e?.message || '笔记数据加载失败'
  }
}

function onNoteClick(event: Event, item: NoteItem) {
  if (!props.previewMode) return
  event.stopPropagation()
  ElMessage.info(`预览：${item.title || '笔记'}`)
}

watch(
  () => [props.component.props.show_category_tabs, props.previewMode],
  () => {
    loadCategoryTabs()
    loadPreviewItems()
  },
  { immediate: true },
)

watch(liveItems, (items) => {
  if (props.previewMode) return
  hydratedItems.value = (items as Record<string, any>[]).map(normalizeNote)
})
</script>

<style scoped lang="scss">
.render-note-feed {
  width: 100%;
}

.feed-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.feed-tab {
  flex-shrink: 0;
  padding: 6px 14px;
  color: #727a8c;
  font-size: 12px;
  background: #f5f6f9;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

.feed-tab.active {
  color: #ec2f55;
  font-weight: 700;
  background: #ffedf1;
}

.note-masonry {
  display: flex;
  flex-wrap: wrap;
}

.note-card {
  width: calc(50% - 5.5px);
  overflow: hidden;
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 2px 8px rgba(15, 18, 25, 0.06);
}

.note-card.is-clickable {
  cursor: pointer;
}

.note-cover {
  position: relative;
  width: 100%;
  padding-top: 125%;
  background: linear-gradient(135deg, #ffedf1, #fff5f7);
}

.note-cover img,
.note-cover span {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.note-cover span {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.note-body {
  padding: 8px 10px 10px;
}

.note-title {
  display: -webkit-box;
  overflow: hidden;
  color: #0f1219;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.38;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.note-foot {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  color: #727a8c;
  font-size: 11px;
}

.note-av {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  background: linear-gradient(135deg, #4f6dff, #8ea3ff);
  border-radius: 50%;
}

.note-author {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-like {
  flex-shrink: 0;
  color: #a5abb9;
}

.preview-data-empty,
.feed-footer {
  padding: 12px 0;
  color: #909399;
  font-size: 12px;
  text-align: center;
}

.preview-data-fail {
  color: #e2564a;
}
</style>
