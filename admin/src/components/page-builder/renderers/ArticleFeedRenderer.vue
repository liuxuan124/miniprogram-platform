<template>
  <div class="render-article-feed split-text-typography" :class="{ 'render-article-feed--preview': previewMode }">
    <div
      v-if="showCategoryTabs && categoryTabs.length"
      class="feed-tabs"
      @mousedown.stop
      @pointerdown.stop
      @touchstart.stop
      @wheel="onTabsWheel"
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
      {{ previewMode ? '暂无文章数据，请确认内容已发布或稍后重试' : '当前筛选下没有已发布内容' }}
    </div>
    <div v-else-if="!previewMode && (liveLoading || tabLoading)" class="preview-data-empty">正在读取已发布内容…</div>
    <div
      v-else
      class="feed-body"
      :class="[`layout-${articleLayout}`, { 'is-tabs-mode': showCategoryTabs }]"
      :style="{ gap: `${itemGap}px` }"
    >
      <div
        v-for="(item, index) in filteredArticleItems"
        :key="`${item.id || item.title || 'article'}-${index}`"
        class="article-card"
        :class="[`article-card--${articleLayout}`, { 'is-clickable': previewMode }]"
        @click="onArticleClick($event, item)"
      >
        <div v-if="component.props.show_cover !== false" class="article-img">
          <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
          <span v-else>📖</span>
        </div>
        <div class="article-info">
          <div class="article-title" :style="itemTitleStyle">{{ item.title || '文章标题' }}</div>
          <div v-if="component.props.show_date !== false && (item.meta || item.source)" class="article-meta-row" :style="itemMetaStyle">
            <span v-if="item.meta">时间 {{ item.meta }}</span>
            <span v-if="item.source">来源 {{ item.source }}</span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="!showFailState && !showFilteredEmpty && !liveLoading && filteredArticleItems.length" class="feed-footer">
      <span>{{ previewMode ? '预览：小程序下滑页面将自动加载更多' : '下滑页面加载更多文章…' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { fetchTopContentCategoryTabs, withAllCategoryTab } from '@/utils/content-category-tabs'
import { loadHydratedComponent } from '@/utils/preview-datasource'
import { titleFontStyle } from '../composables/titleFontStyle'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

type ArticleItem = {
  id?: number | string
  title?: string
  meta?: string
  cover?: string
  link_url?: string
  source?: string
  categoryId?: string | number
  categoryName?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const activeTabId = ref('')
const liveCategoryTabs = ref<Array<{ id: string; name: string }>>([])
const tabItems = ref<ArticleItem[]>([])
const tabLoading = ref(false)

const showCategoryTabs = computed(() => props.component.props?.show_category_tabs === true)
const categoryTabs = computed(() => withAllCategoryTab(liveCategoryTabs.value))

async function loadCategoryTabs() {
  if (!showCategoryTabs.value) {
    liveCategoryTabs.value = []
    return
  }
  liveCategoryTabs.value = await fetchTopContentCategoryTabs()
}

watch(showCategoryTabs, () => {
  void loadCategoryTabs()
}, { immediate: true })

function buildTabFetchComponent(tabId: string): ComponentInstance {
  const base = props.component
  const params: Record<string, unknown> = {
    ...(base.props?.data_source?.params || {}),
    ...(base.props?.data_source?.query || {}),
    status: 'published',
  }
  delete params.category_id
  delete params.categoryId
  if (tabId && /^\d+$/.test(tabId)) {
    params.categoryId = Number(tabId)
  }
  return {
    ...base,
    props: {
      ...base.props,
      data_source: {
        type: 'content',
        params,
        query: params,
      },
    },
  }
}

async function loadTabArticles(tabId: string) {
  if (props.previewMode || !showCategoryTabs.value) return
  tabLoading.value = true
  try {
    const next = await loadHydratedComponent(buildTabFetchComponent(tabId))
    if (next.props?._previewDataFailed) {
      tabItems.value = []
      return
    }
    const list = Array.isArray(next.props?.items) ? next.props.items : []
    tabItems.value = list.map(mapArticle)
  } catch {
    tabItems.value = []
  } finally {
    tabLoading.value = false
  }
}

watch(
  [showCategoryTabs, activeTabId, () => props.component.props?.page_size, () => props.component.props?.data_source],
  () => {
    if (!showCategoryTabs.value) {
      tabItems.value = []
      return
    }
    void loadTabArticles(String(activeTabId.value || ''))
  },
  { immediate: true },
)

const articleLayout = computed(() => {
  const raw = props.component.props?.layout || props.component.props?.style_type || 'list'
  return ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
})

const itemGap = computed(() => {
  const n = Number(props.component.props?.item_gap)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : 8
})

const pageSize = computed(() => Math.max(Number(props.component.props?.page_size || 10), 5))

const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 13))
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

const { items: liveItems, loading: liveLoading, empty: liveEmpty, failed: liveFailed } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

const showFailState = computed(() => {
  if (props.previewMode) return !!props.component.props?._previewDataFailed
  return liveFailed.value
})

const failMessage = computed(() =>
  props.previewMode
    ? '文章数据加载失败，请确认内容已发布或稍后重试'
    : '文章数据请求失败，请检查网络',
)

function formatDisplayDate(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  if (!/\d{4}/.test(raw)) return ''
  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (matched) return `${matched[1]} ${matched[2]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`
  const d = new Date(raw.includes('T') || raw.includes('-') ? raw.replace(/-/g, '/') : raw)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function mapArticle(item: any): ArticleItem {
  const dateRaw = item.publishedAt
    || item.publishTime
    || item.publish_time
    || item.createTime
    || item.createdAt
    || item.created_at
    || item.meta
  return {
    id: item.id,
    title: item.title || item.name || '文章标题',
    meta: formatDisplayDate(dateRaw),
    cover: item.cover || item.coverUrl || item.image || '',
    link_url: item.link_url,
    source: item.source || item.categoryName || item.category_name || '',
    categoryId: item.categoryId ?? item.category_id,
    categoryName: item.categoryName || item.category_name || '',
  }
}

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  const limit = pageSize.value
  const source = (() => {
    if (props.previewMode) {
      if (!Array.isArray(items) || items.length === 0) return []
      return items.slice(0, Math.max(limit, 20))
    }
    const live = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
    return live
  })()
  return source.map(mapArticle)
})

const filteredArticleItems = computed(() => {
  const limit = pageSize.value
  if (showCategoryTabs.value) {
    if (!props.previewMode) {
      return tabItems.value.slice(0, limit)
    }
    const tabId = String(activeTabId.value || '')
    let list = visibleArticleItems.value
    if (tabId) {
      const tab = categoryTabs.value.find((t) => String(t.id) === tabId)
      list = list.filter((item) => {
        if (tab && /^\d+$/.test(String(tab.id)) && item.categoryId != null) {
          return String(item.categoryId) === String(tab.id)
        }
        const name = tab?.name || tabId
        const blob = `${item.categoryName || ''} ${item.source || ''} ${item.title || ''}`
        return blob.includes(name)
      })
    }
    return list.slice(0, limit)
  }
  const live = visibleArticleItems.value
  return live.slice(0, limit)
})

const showFilteredEmpty = computed(() => {
  if (showFailState.value || liveLoading.value || tabLoading.value) return false
  if (showCategoryTabs.value) return filteredArticleItems.value.length === 0
  if (props.previewMode) {
    const items = props.component.props?.items
    return !Array.isArray(items) || items.length === 0
  }
  return liveEmpty.value
})

function onArticleClick(event: MouseEvent, item: ArticleItem) {
  if (!props.previewMode) return
  event.stopPropagation()
  const id = item.id
  if (id == null) {
    ElMessage.info('演示文章无真实详情')
    return
  }
  emit('preview-action', {
    tab: 'content',
    message: `已打开文章「${item.title}」`,
    detailType: 'article',
    detailTitle: item.title || '文章详情',
    detailDesc: item.meta || '',
  })
}

function onTabsWheel(event: WheelEvent) {
  const el = event.currentTarget as HTMLElement | null
  if (!el || el.scrollWidth <= el.clientWidth + 1) return
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
  if (!delta) return
  el.scrollLeft += delta
  event.preventDefault()
  event.stopPropagation()
}
</script>

<style lang="scss" scoped>
.render-article-feed {
  width: 100%;
  min-width: 0;
  overflow: visible;
}

.feed-tabs {
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  padding: 6px 12px 10px;
  overflow-x: auto;
  overflow-y: hidden;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
  scrollbar-width: none;
  -ms-overflow-style: none;
  box-sizing: border-box;

  &::-webkit-scrollbar {
    display: none;
  }
}

.feed-tab {
  flex: 0 0 auto;
  flex-shrink: 0;
  padding: 6px 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  cursor: pointer;
}

.feed-tab.active {
  color: var(--theme-primary, #1769ff);
  font-weight: 700;
  background: color-mix(in srgb, var(--theme-primary, #1769ff) 14%, transparent);
}

.feed-body.is-tabs-mode {
  padding-top: 4px;
}

.preview-data-empty {
  padding: 24px 12px;
  text-align: center;
  font-size: 12px;
  color: #909399;
  background: #f8faff;
  border-radius: var(--card-radius, 10px);
}

.preview-data-fail {
  color: #b45309;
  background: #fffbeb;
}

.feed-body {
  display: flex;
  flex-direction: column;
}

.article-card {
  background: #fff;
  border: 1px solid #edf1f7;
  border-radius: var(--card-radius, 12px);
  box-shadow: 0 4px 12px rgba(28, 43, 76, 0.06);

  &.is-clickable {
    cursor: pointer;
  }

  &--list {
    display: flex;
    gap: 8px;
    padding: 10px 12px;
  }

  &--compact {
    display: flex;
    gap: 8px;
    padding: 8px 10px;
  }

  &--card {
    display: flex;
    flex-direction: column;
    padding: 0;
    overflow: hidden;
  }
}

.article-img {
  width: 62px;
  height: 52px;
  border-radius: 4px;
  font-size: 22px;
  background: #eef2f7;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;

  .article-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.article-card--card .article-img {
  width: 100%;
  height: 120px;
  border-radius: 0;
}

.article-card--compact .article-img {
  width: 48px;
  height: 40px;
}

.article-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.article-title {
  color: #172033;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 6px;
  color: #94a3b8;
  font-size: 11px;
}

.feed-footer {
  margin-top: 10px;
  padding: 8px 0 4px;
  text-align: center;
  color: #94a3b8;
  font-size: 11px;
}
</style>
