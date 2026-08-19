<template>
  <div class="render-article-list split-text-typography" :class="{ 'render-article-list--preview': previewMode }">
    <div
      v-if="showCategoryTabs && categoryTabs.length"
      class="article-tabs"
    >
      <button
        v-for="tab in categoryTabs"
        :key="`${tab.id}-${tab.name}`"
        type="button"
        class="article-tab"
        :class="{ active: activeTabId === String(tab.id) }"
        @click="activeTabId = String(tab.id)"
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
    <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已发布内容…</div>
    <div
      v-else
      class="article-list-body"
      :class="[`layout-${articleLayout}`, { 'is-tabs-mode': showCategoryTabs }]"
      :style="{ gap: `${itemGap}px` }"
    >
      <div
        v-for="(item, index) in filteredArticleItems"
        :key="`${item.title || 'article'}-${index}`"
        class="article-card"
        :class="`article-card--${articleLayout}`"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { getCategoryList } from '@/api/content'
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

const activeTabId = ref('')
const liveCategoryTabs = ref<Array<{ id: string; name: string }>>([])

const showCategoryTabs = computed(() => props.component.props?.show_category_tabs === true)
const categoryTabs = computed(() => {
  if (liveCategoryTabs.value.length) {
    return [{ id: '', name: '全部' }, ...liveCategoryTabs.value]
  }
  const raw = Array.isArray(props.component.props?.category_tabs) ? props.component.props.category_tabs : []
  const tabs = raw
    .map((t: any) => {
      const name = String(t?.name || t?.label || '').trim()
      if (!name) return null
      const id = t?.id == null || t?.id === '' ? (name === '全部' ? '' : name) : String(t.id)
      return { id, name }
    })
    .filter(Boolean) as Array<{ id: string; name: string }>
  if (!tabs.length) {
    return [{ id: '', name: '全部' }]
  }
  if (!tabs.some((t) => t.name === '全部')) tabs.unshift({ id: '', name: '全部' })
  return tabs
})

onMounted(async () => {
  if (!showCategoryTabs.value) return
  try {
    const res = await getCategoryList()
    const tree = ((res as any)?.data || res || []) as any[]
    const flat: Array<{ id: string; name: string }> = []
    const walk = (nodes: any[]) => {
      nodes.forEach((n) => {
        if (n && (n.status === undefined || Number(n.status) === 1)) {
          const isTop = n.parentId == null || Number(n.parentId) === 0
          if (isTop && n.name) flat.push({ id: String(n.id), name: String(n.name) })
        }
        if (Array.isArray(n.children) && n.children.length) walk(n.children)
      })
    }
    walk(Array.isArray(tree) ? tree : [])
    liveCategoryTabs.value = flat
  } catch {
    /* 预览降级用 DSL tabs */
  }
})

const articleLayout = computed(() => {
  const raw = props.component.props?.layout || props.component.props?.style_type || 'list'
  return ['card', 'list', 'compact'].includes(raw) ? raw : 'list'
})

const itemGap = computed(() => {
  const n = Number(props.component.props?.item_gap)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : 8
})

const sectionTitle = computed(() => String(props.component.props?.title ?? '').trim())
const sectionSubtitle = computed(() => String(props.component.props?.subtitle ?? '').trim())
const sectionStyle = computed(() => {
  const raw = String(props.component.props?.section_style || 'plain')
  return ['bar', 'plain', 'card'].includes(raw) ? raw : 'plain'
})
const sectionAlign = computed(() => (props.component.props?.section_align === 'center' ? 'center' : 'left'))
const sectionDivider = computed(() => props.component.props?.section_divider === true)
const showMore = computed(() =>
  props.component.props?.show_category_tabs === true
    ? false
    : props.component.props?.show_more !== false,
)
const moreText = computed(() => String(props.component.props?.more_text || '查看更多>').trim() || '查看更多>')
const moreLink = computed(() =>
  String(props.component.props?.more_link || '/pages/content-list/content-list').trim()
  || '/pages/content-list/content-list',
)
const sectionMoreStyle = computed(() => {
  const isBand = sectionStyle.value === 'bar'
  const custom = props.component.props?.more_color
  const color = custom || (isBand ? '#D4E2FF' : '#7b8798')
  return { color }
})
const sectionTitleStyle = computed(() => {
  const isBand = sectionStyle.value === 'bar'
  const custom = props.component.props?.section_title_color
  const fallback = isBand ? '#F3F7FC' : '#172033'
  const color = !custom || (isBand && custom === '#172033') ? fallback : custom
  return {
    ...titleFontStyle(props.component.props?.section_title_font_size, 16),
    color,
    fontWeight: props.component.props?.section_title_bold === false ? '400' : '800',
  }
})
const sectionSubtitleStyle = computed(() => {
  const isBand = sectionStyle.value === 'bar'
  const custom = props.component.props?.section_subtitle_color
  const fallback = isBand ? '#D4E2FF' : '#7b8798'
  return {
    ...titleFontStyle(props.component.props?.section_subtitle_font_size, 11),
    color: custom || fallback,
  }
})

const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 13))
const itemMetaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

function resolvePreviewTab(link: string, fallback: string) {
  const path = link.toLowerCase()
  if (path.includes('product') || path.includes('shop') || path.includes('cart')) return 'shop'
  if (path.includes('content') || path.includes('article')) return 'content'
  if (path.includes('activity')) return 'activity'
  if (path.includes('mine') || path.includes('member')) return 'mine'
  return fallback
}

function onMoreClick() {
  if (!props.previewMode) return
  const raw = moreLink.value
  const link = (/page-builder/i.test(raw) || (/^https?:\/\/[^/]*localhost/i.test(raw) && !/\/pages\//i.test(raw)))
    ? '/pages/content-list/content-list'
    : raw
  if (/^https?:\/\//i.test(link)) {
    window.open(link, '_blank')
    ElMessage.success('已在新窗口打开链接')
    return
  }
  emit('preview-action', {
    tab: resolvePreviewTab(link, 'content'),
    message: `已打开内容列表（${link}）`,
  })
}

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
    : '文章数据请求失败，请检查网络或数据源配置',
)

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)
  const source = (() => {
    if (props.previewMode) {
      if (!Array.isArray(items) || items.length === 0) return []
      return items.slice(0, Math.max(limit, 50))
    }
    const live = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
    return live.slice(0, Math.max(limit, 50))
  })()

  return source.map((item: any) => {
    const dateRaw = item.publishedAt
      || item.publishTime
      || item.publish_time
      || item.createTime
      || item.createdAt
      || item.created_at
      || item.meta
    const meta = formatDisplayDate(dateRaw)
    return {
      id: item.id,
      title: item.title || item.name || '文章标题',
      meta,
      cover: item.cover || item.coverUrl || item.image || '',
      link_url: item.link_url,
      source: item.source || item.categoryName || item.category_name || '',
      categoryId: item.categoryId ?? item.category_id,
      categoryName: item.categoryName || item.category_name || '',
    }
  })
})

const filteredArticleItems = computed(() => {
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)
  const tabId = String(activeTabId.value || '')
  let list = visibleArticleItems.value
  if (showCategoryTabs.value && tabId) {
    const tab = categoryTabs.value.find((t) => String(t.id) === tabId)
    const name = tab?.name || tabId
    list = list.filter((item) => {
      if (tab && /^\d+$/.test(String(tab.id)) && item.categoryId != null && String(item.categoryId) === String(tab.id)) {
        return true
      }
      const blob = `${item.categoryName || ''} ${item.source || ''} ${item.title || ''}`
      return blob.includes(name)
    })
  }
  return list.slice(0, limit)
})

const showFilteredEmpty = computed(() => {
  if (showFailState.value || liveLoading.value) return false
  if (showCategoryTabs.value) return filteredArticleItems.value.length === 0
  if (props.previewMode) {
    const items = props.component.props?.items
    return !Array.isArray(items) || items.length === 0
  }
  return liveEmpty.value
})

function formatDisplayDate(value: unknown): string {
  if (value == null || value === '') return ''
  const raw = String(value).trim()
  // 已是摘要/描述类文案则忽略
  if (!/\d{4}/.test(raw)) return ''
  const matched = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/)
  if (matched) return `${matched[1]} ${matched[2]}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw} 00:00`
  const d = new Date(raw.includes('T') || raw.includes('-') ? raw.replace(/-/g, '/') : raw)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style lang="scss" scoped>
.article-tabs {
  position: sticky;
  top: 0;
  z-index: 6;
  display: flex;
  gap: 18px;
  padding: 6px 12px 10px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  background: #fff;
  border-bottom: 1px solid #edf0f5;
  scrollbar-width: none;
  -ms-overflow-style: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.article-tab {
  flex: 0 0 auto;
  padding: 4px 0 8px;
  border: 0;
  background: transparent;
  color: #94a3b8;
  font-size: 14px;
  cursor: pointer;
}

.article-tab.active {
  color: #0f2744;
  font-weight: 700;
}

.article-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  margin-top: auto;
  padding-top: 6px;
  color: #94a3b8;
  font-size: 11px;
}

.article-list-body.is-tabs-mode {
  padding: 8px 10px;
  background: transparent;
  gap: 8px;
}

.article-list-body.is-tabs-mode .article-card--list {
  padding: 10px 12px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(28, 43, 76, 0.06);
}

.article-list-body.is-tabs-mode .article-img,
.article-list-body.is-tabs-mode .article-cover {
  border-radius: 0 !important;
}

.render-article-list {
  background: transparent;
  padding: 0;

  &.render-article-list--preview {
    padding: 0;
  }

  .section-header {
    display: flex;
    align-items: stretch;
    gap: 8px;
    margin: 0 0 10px;
    padding: 2px 0 2px;
    position: relative;

    &.align-center {
      justify-content: center;
      text-align: center;

      .section-header__bars {
        display: none;
      }
    }

    &.style-plain,
    &.style-card {
      .section-header__bars {
        display: none;
      }
    }

    &.style-bar {
      align-items: center;
      margin: 0 0 8px;
      padding: 12px 14px 12px 12px;
      min-height: 48px;
      border-left: none;
      border-radius: 0;
      background-color: #002FA7;
      background-image:
        linear-gradient(90deg, rgba(0, 47, 167, 0.5) 0%, rgba(26, 75, 191, 0.22) 42%, rgba(42, 91, 201, 0.06) 100%),
        url('/section-bar-tech-bg.jpg'),
        linear-gradient(90deg, #002FA7 0%, #1A4BBF 52%, #2A5BC9 100%);
      background-size: cover, cover, auto;
      background-position: center, center bottom, center;
      background-repeat: no-repeat;

      .section-header__main {
        color: #f3f7fc;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      }

      .section-header__sub {
        color: #e8eeff;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.28);
      }

      .section-header__bar {
        background: #B8D0FF;
      }

      &.has-divider {
        margin-bottom: 8px;
        padding-bottom: 8px;

        &::after {
          left: 0;
          right: 0;
          background: rgba(255, 255, 255, 0.14);
        }
      }
    }

    &.style-card {
      padding: 10px 12px;
      border-radius: 0;
      background: linear-gradient(90deg, #f3f7ff 0%, #ffffff 70%);
      border: 1px solid #e8eef8;
    }

    &.style-card.align-center {
      text-align: center;
    }

    &__bars {
      display: flex;
      flex-direction: row;
      align-items: stretch;
      gap: 3px;
      width: 9px;
      flex-shrink: 0;
      min-height: 18px;
      height: 18px;
    }

    &__bar {
      width: 3px;
      border-radius: 1px;
      background: var(--theme-primary, #1769ff);

      &--down {
        height: 72%;
        align-self: flex-start;
      }

      &--up {
        height: 72%;
        align-self: flex-end;
      }
    }

    &__text {
      min-width: 0;
      flex: 1;
    }

    &__main {
      color: #172033;
      font-size: 16px;
      font-weight: 800;
      line-height: 1.3;
    }

    &__sub {
      margin-top: 2px;
      color: #7b8798;
      font-size: 11px;
      line-height: 1.35;
    }

    &__more {
      flex-shrink: 0;
      align-self: center;
      margin-left: auto;
      font-size: 12px;
      line-height: 1.2;
      white-space: nowrap;
      cursor: pointer;
      user-select: none;
      opacity: 0.92;
    }

    &.align-center .section-header__more {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      margin-left: 0;
    }

    &.style-bar .section-header__more {
      color: #d4e2ff;
    }

    &.has-divider {
      position: relative;
      margin-bottom: 8px;
      padding-bottom: 8px;
      border-bottom: none;

      &::after {
        content: '';
        position: absolute;
        left: -10px;
        right: -10px;
        bottom: 0;
        height: 1px;
        background: #e8edf5;
      }
    }

    &.style-bar {
      padding-top: 8px;
      padding-bottom: 8px;
    }

    &.style-card.has-divider {
      border-bottom: none;
    }
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

  .article-list-body {
    display: flex;
    flex-direction: column;
    gap: 8px;

    &.layout-list,
    &.layout-card,
    &.layout-compact {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }

  .article-card {
    background: #fff;
    border: 1px solid #edf1f7;
    border-radius: var(--card-radius, 12px);
    box-shadow: 0 4px 12px rgba(28, 43, 76, 0.06);

    &--list {
      display: flex;
      gap: 8px;
      padding: 10px 12px;
    }

    &--card {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      background: #fff;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
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
      }
    }

    &--card .article-img {
      width: 100%;
      height: 140px;
      border-radius: 0;
    }

    .article-info {
      flex: 1;
      min-width: 0;

      .article-title {
        font-size: 13px;
        color: #172033;
        font-weight: 500;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .article-date {
        margin-top: 4px;
        color: #909399;
        font-size: 11px;
        line-height: 1.3;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    &--card .article-info {
      padding: 10px 12px;
    }

    &--compact {
      display: flex;
      gap: 8px;
      padding: 6px 0;
      background: transparent;

      .article-img {
        width: 40px;
        height: 40px;
        border-radius: 4px;
        font-size: 16px;
      }

      .article-title {
        -webkit-line-clamp: 2;
      }

      .article-date {
        margin-top: 2px;
      }
    }
  }
}
</style>
