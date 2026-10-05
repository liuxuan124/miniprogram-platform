<template>
  <!--
    🔴 empty_mode=hide 时整个组件不渲染（2026-10-05 新增）。
    装修器画布上留一个空白框会让运营以为坏了，所以这里在**预览模式**也一并隐藏；
    真机端由 dsl-article-list.wxml 自己判断（背景：运营选了冷门分类导致 0 篇）。
  -->
  <div
    v-if="!hideWhenEmpty"
    class="render-article-list split-text-typography"
    :class="{ 'render-article-list--preview': previewMode }"
  >
    <div
      v-if="showCategoryTabs && categoryTabs.length"
      class="article-tabs"
      :class="`article-tabs--${categoryTabStyle}`"
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
    <div v-if="showHeader" class="article-unified-card">
      <div class="article-unified-card__head">
        <div class="article-unified-card__titles">
          <div class="article-unified-card__title">{{ sectionTitle || '文章列表' }}</div>
          <div v-if="sectionSubtitle" class="article-unified-card__subtitle">{{ sectionSubtitle }}</div>
        </div>
        <button
          v-if="showHeaderMore"
          type="button"
          class="article-unified-card__more"
          @click.stop="onMoreClick"
        >
          {{ moreText }}
        </button>
      </div>
      <div v-if="showFailState" class="preview-data-empty preview-data-fail">
        {{ failMessage }}
      </div>
      <div v-else-if="showFilteredEmpty" class="preview-data-empty">
        <span v-if="emptyIconValue" class="preview-data-empty__icon">{{ emptyIconValue }}</span>
        {{ emptyTextValue }}
      </div>
      <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已发布内容…</div>
      <div
        v-else
        class="article-list-body article-list-body--in-card"
        :class="[`layout-${articleLayout}`, { 'is-tabs-mode': showCategoryTabs }]"
        :style="{ gap: unifiedInCard ? 0 : `${itemGap}px` }"
      >
        <div
          v-for="(item, index) in displayArticleItems"
          :key="`${item.title || 'article'}-${index}`"
          class="article-card"
          :class="`article-card--${cardModifier(index)}`"
        >
          <div v-if="component.props.show_cover !== false" class="article-img">
            <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
            <span v-else>📖</span>
          </div>
          <div class="article-info">
            <div v-if="item.source && isOverlayCard(index)" class="article-kicker">{{ item.source }}</div>
            <div class="article-title" :style="isOverlayCard(index) ? undefined : itemTitleStyle">
              {{ item.title || '文章标题' }}
              <span
                v-if="showSourceTag && item.sourceTagLabel && sourceTagPosition === 'title'"
                class="article-source-tag"
              >{{ item.sourceTagLabel }}</span>
            </div>
            <div v-if="showSummaryOn && item.excerpt && !isOverlayCard(index)" class="article-excerpt">{{ item.excerpt }}</div>
            <div v-if="component.props.show_date !== false && (item.meta || item.source || viewsOf(item) || (showSourceTag && item.sourceTagLabel))" class="article-meta-row" :style="itemMetaStyle">
              <span v-if="item.meta">{{ item.meta }}</span>
              <span
                v-if="showSourceTag && item.sourceTagLabel && sourceTagPosition === 'meta'"
                class="article-source-tag"
              >{{ item.sourceTagLabel }}</span>
              <span v-else-if="item.source && !isOverlayCard(index)">{{ item.source }}</span>
              <span v-if="viewsOf(item)">{{ viewsLabel(item) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <template v-else>
      <div v-if="showFailState" class="preview-data-empty preview-data-fail">
        {{ failMessage }}
      </div>
      <div v-else-if="showFilteredEmpty" class="preview-data-empty">
        <span v-if="emptyIconValue" class="preview-data-empty__icon">{{ emptyIconValue }}</span>
        {{ emptyTextValue }}
      </div>
      <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已发布内容…</div>
      <div
        v-else
        class="article-list-body"
        :class="[`layout-${articleLayout}`, { 'is-tabs-mode': showCategoryTabs }]"
        :style="{ gap: `${itemGap}px` }"
      >
        <div
          v-for="(item, index) in displayArticleItems"
          :key="`${item.title || 'article'}-${index}`"
          class="article-card"
          :class="`article-card--${cardModifier(index)}`"
        >
          <div v-if="component.props.show_cover !== false" class="article-img">
            <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
            <span v-else>📖</span>
          </div>
          <div class="article-info">
            <div v-if="item.source && isOverlayCard(index)" class="article-kicker">{{ item.source }}</div>
            <div class="article-title" :style="isOverlayCard(index) ? undefined : itemTitleStyle">
              {{ item.title || '文章标题' }}
              <span
                v-if="showSourceTag && item.sourceTagLabel && sourceTagPosition === 'title'"
                class="article-source-tag"
              >{{ item.sourceTagLabel }}</span>
            </div>
            <div v-if="showSummaryOn && item.excerpt && !isOverlayCard(index)" class="article-excerpt">{{ item.excerpt }}</div>
            <div v-if="component.props.show_date !== false && (item.meta || item.source || viewsOf(item) || (showSourceTag && item.sourceTagLabel))" class="article-meta-row" :style="itemMetaStyle">
              <span v-if="item.meta">{{ item.meta }}</span>
              <span
                v-if="showSourceTag && item.sourceTagLabel && sourceTagPosition === 'meta'"
                class="article-source-tag"
              >{{ item.sourceTagLabel }}</span>
              <span v-else-if="item.source && !isOverlayCard(index)">{{ item.source }}</span>
              <span v-if="viewsOf(item)">{{ viewsLabel(item) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { getCategoryList } from '@/api/content'
import { titleFontStyle } from '../composables/titleFontStyle'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { filterBySourceKeys, resolveSourceLabel } from '@/utils/dsl-source-tag'
import { articleCardModifier, resolveArticleLayout } from '../articleLayouts'
import {
  resolveShowSummary,
  type PinnedArticle,
} from '../articleFeed/articleListSchema'

type ArticleItem = {
  id?: number | string
  title?: string
  meta?: string
  cover?: string
  excerpt?: string
  link_url?: string
  source?: string
  sourceTagLabel?: string
  categoryId?: string | number
  categoryName?: string
  /** 阅读量；仅 show_views 开启时渲染 */
  viewCount?: number
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const activeTabId = ref('')
const liveCategoryTabs = ref<Array<{ id: string; name: string }>>([])

const showCategoryTabs = computed(() => props.component.props?.show_category_tabs === true)

/** 顶部标签的视觉形式：pill（滑动胶囊）/ underline（下划线）/ bold（文字加粗） */
const categoryTabStyle = computed(() => {
  const v = String(props.component.props?.category_tab_style || 'pill')
  return v === 'underline' || v === 'bold' ? v : 'pill'
})

const categoryTabs = computed(() => {
  /**
   * 「分类范围」= picked 时只保留运营手选的分类。
   * ⚠️ 比较时统一按字符串，避免 el-select 回传数字 id 而接口 tabs 是字符串导致全被滤掉。
   */
  const pickedRaw = props.component.props?.category_tab_ids
  const picked = Array.isArray(pickedRaw) && pickedRaw.length
    ? new Set(pickedRaw.map((x) => String(x)))
    : null

  const build = (list: Array<{ id: string; name: string }>) => {
    const filtered = picked ? list.filter((t) => t.id !== '' && picked.has(String(t.id))) : list
    const tabs = [{ id: '', name: '全部' }, ...filtered]
    // 手选分类可能已被删除，全被滤掉时至少保留「全部」，避免顶部整条消失
    return tabs.length > 1 ? tabs : [{ id: '', name: '全部' }]
  }

  if (liveCategoryTabs.value.length) {
    return build(liveCategoryTabs.value)
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
  return build(tabs)
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

const articleLayout = computed(() => resolveArticleLayout(
  props.component.props?.layout || props.component.props?.style_type,
  'list',
))

const showExcerpt = computed(() => resolveShowSummary(
  articleLayout.value,
  props.component.props?.show_summary,
))

function cardModifier(index: number) {
  return articleCardModifier(articleLayout.value, index)
}

function isOverlayCard(index: number) {
  return cardModifier(index) === 'overlay'
}

const itemGap = computed(() => {
  const n = Number(props.component.props?.item_gap)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : 8
})

const showHeader = computed(() => props.component.props?.show_header === true)
const unifiedInCard = computed(() => showHeader.value && articleLayout.value === 'list')
const sectionTitle = computed(() => String(props.component.props?.title ?? '').trim())
const sectionSubtitle = computed(() => String(props.component.props?.subtitle ?? '').trim())
const showHeaderMore = computed(() => {
  if (!showHeader.value || showCategoryTabs.value) return false
  return props.component.props?.show_more === true
})
const sectionStyle = computed(() => {
  const raw = String(props.component.props?.section_style || 'plain')
  return ['bar', 'plain', 'card'].includes(raw) ? raw : 'plain'
})
const sectionAlign = computed(() => (props.component.props?.section_align === 'center' ? 'center' : 'left'))
const sectionDivider = computed(() => props.component.props?.section_divider === true)
const moreText = computed(() => String(props.component.props?.more_text || '更多 ›').trim() || '更多 ›')
const moreLink = computed(() =>
  String(props.component.props?.more_link || '/pkg-content/content-list/content-list').trim()
  || '/pkg-content/content-list/content-list',
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
    ? '/pkg-content/content-list/content-list'
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

/**
 * 🔴 拉取量必须与展示量解耦（2026-10-05 修复）。
 *
 * 原实现里 `visibleArticleItems` 用 `limit` 截断，`filteredArticleItems` 之后才做
 * source_filter / 分类 Tab 筛选 —— 于是「拉多少」和「留多少」共用了同一个 limit。
 * 典型翻车：配置「显示数量 2」+「筛选来源=公众号」，接口按最新返回的前 2 篇恰好都是
 * 原创/小红书 → 客户端把它们全筛掉 → 画布空白或只剩 1 篇，运营完全不知道为什么。
 *
 * 正解：拉取按 FETCH_BUFFER_FACTOR 放大余量，筛选完再截 limit。
 * 余量不够时（内容池本身就没那么多）如实少给，不做假数据。
 */
const FETCH_BUFFER_FACTOR = 4
const FETCH_BUFFER_MIN = 20

function resolveFetchSize(limit: number, hasFilter: boolean): number {
  if (!hasFilter) return Math.max(limit, 50)
  return Math.max(limit * FETCH_BUFFER_FACTOR, FETCH_BUFFER_MIN, limit)
}

const hasClientSideFilter = computed(() => {
  const p = props.component.props || {}
  const sourceFilter = Array.isArray(p.source_filter) && p.source_filter.length > 0
  return sourceFilter || p.show_category_tabs === true || hasContentTagFilter(p)
})

function hasContentTagFilter(p: Record<string, any>): boolean {
  const platforms = Array.isArray(p.filter_platform_codes) && p.filter_platform_codes.length > 0
  const topics = Array.isArray(p.filter_topic_tags) && p.filter_topic_tags.length > 0
  return platforms || topics
}

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)
  const fetchSize = resolveFetchSize(limit, hasClientSideFilter.value)
  const source = (() => {
    if (props.previewMode) {
      if (!Array.isArray(items) || items.length === 0) return []
      return items.slice(0, fetchSize)
    }
    const live = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
    return live.slice(0, fetchSize)
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
      excerpt: String(item.summary || item.excerpt || item.subtitle || '').trim(),
      link_url: item.link_url,
      source: item.source || item.categoryName || item.category_name || '',
      sourceTagLabel: resolveSourceLabel(item, props.component.props?.source_labels),
      categoryId: item.categoryId ?? item.category_id,
      categoryName: item.categoryName || item.category_name || '',
      viewCount: Number(item.viewCount ?? item.view_count ?? 0) || 0,
    }
  })
})

const showSourceTag = computed(() => props.component.props?.show_source_tag === true)
const sourceTagPosition = computed(() => props.component.props?.source_tag_position || 'meta')

const filteredArticleItems = computed(() => {
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)
  const tabId = String(activeTabId.value || '')
  let list = visibleArticleItems.value
  if (showSourceTag.value && Array.isArray(props.component.props?.source_filter) && props.component.props.source_filter.length) {
    list = filterBySourceKeys(list as any[], props.component.props.source_filter) as ArticleItem[]
  }
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

/**
 * 🔴 手动置顶：置顶项按配置顺序排在最前，其余按筛选后原序跟随。
 * 与 ArticleFeedRenderer.displayItems、miniapp dsl-article-list._applyPinned 同规则。
 */
const displayArticleItems = computed<ArticleItem[]>(() => {
  const pool = filteredArticleItems.value
  const pinned = (Array.isArray(props.component.props?.pinned) ? props.component.props.pinned : []) as PinnedArticle[]
  if (!pinned.length) return pool

  const byId = new Map(pool.map((it) => [String(it.id ?? ''), it]))
  const head: ArticleItem[] = []
  for (const p of pinned) {
    const hit = byId.get(String(p.id))
    if (hit) {
      head.push(hit)
      byId.delete(String(p.id))
    } else {
      // 置顶的文章不在当前筛选结果里（筛选条件变了）也要占位，
      // 否则运营会以为「置顶没生效」而反复排查
      head.push({ id: p.id, title: p.title || `文章 #${p.id}`, cover: p.cover })
    }
  }
  const headIds = new Set(head.map((h) => String(h.id ?? '')))
  const rest = pool.filter((it) => !headIds.has(String(it.id ?? '')))
  const limit = Math.max(Number(props.component.props?.limit || 6), 1)
  return [...head, ...rest].slice(0, Math.max(limit, head.length))
})

/** 阅读热度：旧页面无 show_views 字段 → 不显示（保持原观感） */
const showViews = computed(() => props.component.props?.show_views === true)

/**
 * 逐条计算阅读量文案。
 *
 * 「阅读热度」对运营的意义是**量级对比**（三位数 vs 五位数），
 * 所以 ≥10000 折成「1.2万」—— 直接显示 12345 会把日期行撑破。
 *返回空串表示「本次不渲染阅读量」，供模板直接 v-if。
 */
function viewsOf(item: ArticleItem): string {
  if (!showViews.value) return ''
  const n = Number(item.viewCount ?? 0)
  if (!Number.isFinite(n) || n <= 0) return '0 阅读'
  return n >= 10000 ? `${(n / 10000).toFixed(1)}万 阅读` : `${n} 阅读`
}

/** 纯文本版（模板里字符串插值用，避免每条都走 v-if 表达式） */
function viewsLabel(item: ArticleItem): string {
  return viewsOf(item)
}

/** 摘要简介：报刊细排 / 杂志首篇强制显示，其余布局看开关（与 dsl-article-list 同规则） */
const showSummaryOn = computed(() =>
  resolveShowSummary(articleLayout.value, props.component.props?.show_summary),
)

const showFilteredEmpty = computed(() => {
  if (showFailState.value || liveLoading.value) return false
  if (showCategoryTabs.value) return filteredArticleItems.value.length === 0
  if (props.previewMode) {
    const items = props.component.props?.items
    return !Array.isArray(items) || items.length === 0
  }
  return liveEmpty.value
})

/** 运营可自定义空态文案；未配置时回落到各自的默认提示 */
const emptyTextValue = computed(() => {
  const custom = String(props.component.props?.empty_text || '').trim()
  if (custom) return custom
  return props.previewMode
    ? '暂无文章数据，请确认内容已发布或稍后重试'
    : '当前筛选下没有已发布内容'
})

/** empty_mode=hide 且确实没数据时，整个组件不渲染 */
const hideWhenEmpty = computed(
  () => props.component.props?.empty_mode === 'hide' && showFilteredEmpty.value,
)

/** 空状态图标：运营自选 Emoji；未配置时不渲染图标（旧页面观感不变） */
const emptyIconValue = computed(() => String(props.component.props?.empty_icon || '').trim())

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

/* ── 标签视觉形式（category_tab_style） ──
 *  pill 是默认（原样式即胶囊内的下划线观感），另给下划线与加粗两种更克制的形态。
 *  三者共用同一套 DOM，只切 padding / 伪元素，避免三份结构走偏。 */
.article-tabs--pill {
  gap: 8px;
  padding: 6px 10px 8px;

  .article-tab {
    padding: 5px 12px;
    border-radius: 999px;

    &.active {
      background: #f2f5f9;
    }
  }
}

.article-tabs--underline {
  .article-tab {
    position: relative;
    padding-bottom: 7px;

    &.active::after {
      position: absolute;
      bottom: 0;
      left: 50%;
      width: 100%;
      height: 2px;
      content: '';
      background: #0f2744;
      border-radius: 2px;
      transform: translateX(-50%);
    }
  }
}

.article-tabs--bold {
  gap: 20px;

  .article-tab {
    padding: 4px 0 8px;
    font-weight: 400;

    &.active {
      font-weight: 800;
    }
  }
}

.article-source-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 0 6px;
  font-size: 10px;
  font-weight: 500;
  color: #a66b1f;
  background: #fff7ed;
  border-radius: 4px;
  vertical-align: middle;
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

.article-unified-card {
  background: #fffdf9;
  border: 1px solid #efe7da;
  border-radius: 14px;
  padding: 12px;
  box-sizing: border-box;
}

.article-unified-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.article-unified-card__titles {
  min-width: 0;
  flex: 1;
}

.article-unified-card__title {
  font-weight: 700;
  font-size: 15px;
  color: #1d1b18;
  line-height: 1.3;
}

.article-unified-card__subtitle {
  margin-top: 2px;
  font-size: 11.5px;
  color: #7a7268;
  line-height: 1.35;
}

.article-unified-card__more {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #c2410c;
  font-size: 11.5px;
  cursor: pointer;
  line-height: 1.3;
}

.article-unified-card .preview-data-empty {
  border-radius: 8px;
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
      background: var(--theme-primary, var(--color-primary));

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

  /* 空状态图标：与文案同列居中，字号放大让「空」的情绪更明确 */
  .preview-data-empty__icon {
    display: block;
    margin-bottom: 6px;
    font-size: 26px;
    line-height: 1.2;
    filter: saturate(0.85);
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
    &.layout-compact,
    &.layout-overlay,
    &.layout-magazine,
    &.layout-editorial {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    &.layout-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    &.layout-editorial,
    &.layout-magazine {
      gap: 0;
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

    &--overlay {
      position: relative;
      display: block;
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: 16px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);

      .article-img {
        width: 100%;
        height: 188px;
        border-radius: 0;
      }

      .article-info {
        position: absolute;
        right: 0;
        bottom: 0;
        left: 0;
        padding: 36px 14px 14px;
        background: linear-gradient(180deg, transparent 0%, rgba(12, 18, 32, 0.82) 72%);
      }

      .article-kicker {
        margin-bottom: 6px;
        color: rgba(255, 255, 255, 0.72);
        font-size: 10px;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .article-title {
        color: #fff;
        font-size: 16px;
        font-weight: 700;
        line-height: 1.35;
        letter-spacing: 0.01em;
      }

      .article-meta-row {
        color: rgba(255, 255, 255, 0.68);
      }
    }

    &--grid {
      display: flex;
      flex-direction: column;
      padding: 0;
      overflow: hidden;
      border: 0;
      border-radius: 14px;
      box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);

      .article-img {
        width: 100%;
        height: 96px;
        border-radius: 0;
      }

      .article-info {
        padding: 8px 10px 10px;
      }

      .article-title {
        font-size: 12px;
        font-weight: 650;
      }
    }

    &--editorial {
      display: flex;
      flex-direction: row-reverse;
      gap: 14px;
      padding: 16px 2px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid #ece7de;
      border-radius: 0;
      box-shadow: none;

      .article-img {
        width: 86px;
        height: 64px;
        border-radius: 2px;
      }

      .article-title {
        font-size: 14px;
        font-weight: 650;
        letter-spacing: 0.02em;
      }

      .article-excerpt {
        display: -webkit-box;
        margin-top: 6px;
        overflow: hidden;
        color: #7a7468;
        font-size: 11px;
        line-height: 1.5;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      }

      .article-meta-row {
        color: #a39b8d;
      }
    }
  }

  .layout-magazine .article-card--overlay {
    margin-bottom: 4px;
    border-radius: 18px;
  }

  .layout-magazine .article-card--overlay .article-img {
    height: 210px;
  }

  /* show_header：同卡内 list 条目扁平化（覆盖上方 .article-card 独立成卡样式） */
  .article-unified-card .article-list-body .article-card.article-card--list {
    display: flex;
    gap: 10px;
    padding: 10px 0;
    background: transparent;
    border: none;
    border-radius: 0;
    box-shadow: none;
    border-top: 1px solid #f1e9dc;

    &:first-child {
      border-top: none;
    }

    .article-img {
      width: 78px;
      height: 58px;
      border-radius: 9px;
    }

    .article-info .article-title {
      font-size: 13px;
      font-weight: 600;
      line-height: 1.4;
    }
  }
}
</style>
