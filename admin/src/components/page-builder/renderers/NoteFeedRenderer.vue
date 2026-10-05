<template>
  <div class="render-note-feed" :class="{ 'render-note-feed--preview': previewMode }">
    <div v-if="showTypeTabs" class="type-tabs" @mousedown.stop @pointerdown.stop @touchstart.stop>
      <div class="type-tabs__list">
        <button
          v-for="(t, i) in typeTabs"
          :key="`${t.label}-${i}`"
          type="button"
          class="type-tab"
          :class="{ active: activeType === i }"
          @click.stop="activeType = i"
        >
          {{ t.label }}
          <i v-if="activeType === i" class="type-tab__bar" />
        </button>
      </div>
      <span v-if="showSearch" class="type-search"><i /></span>
    </div>
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
        :class="{ 'is-clickable': previewMode, 'note-card--text': isTextCard(item) }"
        @click="onNoteClick($event, item)"
      >
        <div v-if="!isTextCard(item)" class="note-cover">
          <img v-if="item.cover" :src="item.cover" alt="" />
          <span v-else>📷</span>
          <template v-if="(item.imageCount || 0) > 1 && galleryBadge !== 'none'">
            <em v-if="galleryBadge === 'xhs'" class="note-badge-xhs">图文 {{ item.imageCount }}</em>
            <em v-if="galleryBadge === 'xhs'" class="note-badge-page">1/{{ item.imageCount }}</em>
            <em v-else class="note-badge-plain">{{ item.imageCount }} 图</em>
          </template>
        </div>
        <div class="note-body">
          <div class="note-title">{{ item.title || '笔记标题' }}</div>
          <div v-if="isTextCard(item) && item.summary" class="note-summary">{{ item.summary }}</div>
          <div class="note-foot">
            <template v-if="item.isProduct">
              <span class="note-price">{{ item.priceText }}</span>
            </template>
            <template v-else>
              <span class="note-av">{{ item.authorInitial || '作' }}</span>
              <span class="note-author">{{ item.author || '作者' }}</span>
              <span class="note-like" :class="{ 'note-like--heart': likeHeart }">{{ likeHeart ? '♥' : '♡' }} {{ item.likeText || '0' }}</span>
            </template>
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
  summary?: string
  imageCount?: number
  author?: string
  authorInitial?: string
  likeText?: string
  categoryId?: string | number
  categoryName?: string
  contentType?: string
  tags?: string[]
  isProduct?: boolean
  priceText?: string
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
const activeType = ref(0)

const showCategoryTabs = computed(() => props.component.props.show_category_tabs === true)
const itemGap = computed(() => Number(props.component.props.item_gap ?? 11))
const galleryBadge = computed(() => String(props.component.props.gallery_badge || 'plain'))
const textCard = computed(() => props.component.props.text_card === true)
const likeHeart = computed(() => props.component.props.like_heart === true)
const showSearch = computed(() => props.component.props.show_search === true)
const typeTabs = computed(() =>
  (Array.isArray(props.component.props.type_tabs) ? props.component.props.type_tabs : [])
    .map((t: any) => {
      // 内容形式：新结构 content_types 多选数组；旧结构 content_type 单值（映射为单元素数组）
      const rawTypes = Array.isArray(t?.content_types)
        ? t.content_types.map((v: any) => String(v).trim().toLowerCase()).filter(Boolean)
        : []
      const legacyType = String(t?.content_type || '').trim().toLowerCase()
      const contentTypes = rawTypes.length
        ? rawTypes
        : (['note', 'article', 'moment', 'product'].includes(legacyType) ? [legacyType] : [])
      // 类别：新结构 category_ids 多选；旧结构 category_id 单值
      const rawCids = Array.isArray(t?.category_ids) ? t.category_ids : []
      const legacyCid = String(t?.category_id ?? t?.categoryId ?? '').trim()
      const categoryIds = Array.from(new Set([
        ...rawCids.map((v: any) => String(v).trim()).filter((v: string) => /^\d+$/.test(v)),
        ...(legacyCid && /^\d+$/.test(legacyCid) ? [legacyCid] : []),
      ]))
      // 旧值 filter_type='type' 语义等价于新结构 all + content_types=[content_type]
      const rawFilter = String(t?.filter_type || 'all')
      const filterType = (['all', 'category', 'tag', 'ids'] as string[]).includes(rawFilter)
        ? rawFilter
        : 'all'
      return {
        label: String(t?.label || ''),
        filter_type: filterType,
        content_types: contentTypes,
        category_ids: categoryIds,
        tag: String(t?.tag || ''),
        content_ids: Array.isArray(t?.content_ids) ? t.content_ids.map((v: any) => String(v)) : [],
      }
    })
    .filter((t: any) => t.label),
)
// 只控制「页签条是否渲染」；只要有 1 个页签，筛选逻辑就必须生效（否则单页签配的类型形同虚设）
const showTypeTabs = computed(() => typeTabs.value.length > 1)
const hasTypeTabs = computed(() => typeTabs.value.length > 0)
const activeTab = computed(
  () => typeTabs.value[activeType.value] || typeTabs.value[0]
    || { filter_type: 'all', content_types: [] as string[], category_ids: [] as string[], tag: '', content_ids: [] as string[] },
)

function itemTagList(item: NoteItem): string[] {
  const raw = (item as Record<string, any>).tags
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(/[,，;；\s]+/).map((t) => t.trim()).filter(Boolean)
  return []
}

function isTextCard(item: NoteItem) {
  return textCard.value && !item.cover && !!item.summary && !item.isProduct
}

const feedComponent = computed(() => props.component)

const { items: liveItems, loading: liveLoading, failed: liveFailed } = useEditorLiveItems(
  () => feedComponent.value,
  () => props.previewMode === true,
)

const showFailState = computed(() => !!failMessage.value || !!liveFailed.value)
const sourceItems = computed(() => {
  // 两种模式都优先用 normalizeNote 归一化后的数据（type 过滤/文字卡/点赞依赖归一字段）
  if (hydratedItems.value.length) return hydratedItems.value
  return liveItems.value as NoteItem[]
})

const filteredNoteItems = computed(() => {
  let items = sourceItems.value || []
  if (hasTypeTabs.value) {
    const tab = activeTab.value
    const mode = tab.filter_type || 'all'
    // 内容形式过滤：空数组 = 全部形式；只勾 product = 仅商品（contentTypes 为空时不能放行内容）
    const types: string[] = tab.content_types || []
    if (types.length) {
      const wantProduct = types.includes('product')
      const contentTypes = types.filter((v) => v !== 'product')
      items = items.filter((item) => {
        if (item.isProduct === true) return wantProduct
        if (!contentTypes.length) return false
        return contentTypes.includes(String(item.contentType || '').toLowerCase())
      })
    }
    if (mode === 'category') {
      const cids = tab.category_ids || []
      items = cids.length
        ? items.filter((item) => cids.includes(String(item.categoryId ?? '')))
        : []
    } else if (mode === 'tag') {
      const tag = tab.tag.trim()
      items = tag ? items.filter((item) => itemTagList(item).includes(tag)) : []
    } else if (mode === 'ids') {
      const ids = tab.content_ids
      if (ids.length) {
        const pos = new Map<string, number>(ids.map((id, i) => [id, i] as [string, number]))
        items = items
          .filter((item) => item.id != null && pos.has(String(item.id)))
          .sort((a, b) => (pos.get(String(a.id)) ?? 0) - (pos.get(String(b.id)) ?? 0))
      } else {
        items = []
      }
    }
  }
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

function stripHtml(html: unknown) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeNote(raw: Record<string, any>): NoteItem {
  const author = String(raw.author || raw.authorName || '作者').trim() || '作者'
  const images = Array.isArray(raw.images) ? raw.images : []
  const cover = raw.coverImage || raw.cover_image || raw.cover || images[0] || ''
  const summary = stripHtml(raw.summary || raw.description || raw.desc || raw.content || '')
  const price = Number(raw.price)
  const isProduct = raw.isProduct === true || String(raw.contentType || raw.content_type || '') === 'product'
  return {
    id: raw.id,
    title: raw.title || raw.name || '笔记标题',
    cover,
    summary: summary.length > 70 ? `${summary.slice(0, 70)}…` : summary,
    imageCount: images.length || (cover ? 1 : 0),
    author,
    authorInitial: author.slice(0, 1),
    likeText: formatLike(raw.likeCount ?? raw.like_count ?? 0),
    categoryId: raw.categoryId ?? raw.category_id,
    categoryName: raw.categoryName ?? raw.category_name,
    tags: Array.isArray(raw.tags)
      ? raw.tags.map((t: any) => String(t).trim()).filter(Boolean)
      : (typeof raw.tags === 'string' ? raw.tags.split(/[,，;；\s]+/).map((t: string) => t.trim()).filter(Boolean) : []),
    contentType: String(raw.contentType || raw.content_type || (isProduct ? 'product' : 'note')).toLowerCase(),
    isProduct,
    priceText: Number.isFinite(price) ? `¥${price.toFixed(2)}` : '',
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
    const rows = Array.isArray(result?.props?.items) ? result.props.items : []
    hydratedItems.value = rows
      .filter((item: Record<string, any>) => {
        if (showTypeTabs.value) return true
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

.type-tabs {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  border-bottom: 1px solid #f0f1f5;
}

.type-tabs__list {
  display: flex;
  flex: 1;
  gap: 18px;
  overflow-x: auto;
}

.type-tab {
  position: relative;
  flex-shrink: 0;
  padding: 8px 0 10px;
  color: #727a8c;
  font-size: 14px;
  background: none;
  border: none;
  cursor: pointer;
}

.type-tab.active {
  color: #0f1219;
  font-weight: 700;
}

.type-tab__bar {
  position: absolute;
  right: 50%;
  bottom: 2px;
  width: 18px;
  height: 3px;
  background: #ec2f55;
  border-radius: 999px;
  transform: translateX(50%);
}

.type-search {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-left: 8px;
  border: 1.5px solid #c6cbd6;
  border-radius: 50%;
}

.type-search i {
  width: 8px;
  height: 2px;
  background: #c6cbd6;
  border-radius: 2px;
  transform: translate(5px, 5px) rotate(45deg);
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

.note-card--text {
  background: #f7f8fa;
  box-shadow: inset 0 0 0 1px #eceef3;
}

.note-card--text .note-body {
  padding: 12px 12px 10px;
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

.note-badge-xhs,
.note-badge-page,
.note-badge-plain {
  position: absolute;
  z-index: 1;
  padding: 2px 8px;
  color: #fff;
  font-size: 10px;
  font-style: normal;
  background: rgba(15, 18, 25, 0.55);
  border-radius: 999px;
}

.note-badge-xhs {
  top: 6px;
  left: 6px;
}

.note-badge-page {
  top: 6px;
  right: 6px;
}

.note-badge-plain {
  right: 6px;
  bottom: 6px;
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

.note-summary {
  display: -webkit-box;
  margin-top: 5px;
  overflow: hidden;
  color: #727a8c;
  font-size: 11px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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

.note-like--heart {
  color: #ec2f55;
}

.note-price {
  color: #ec2f55;
  font-size: 14px;
  font-weight: 700;
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
