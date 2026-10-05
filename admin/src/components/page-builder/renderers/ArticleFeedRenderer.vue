<template>
  <div class="render-article-feed split-text-typography" :class="{ 'render-article-feed--preview': previewMode }">
    <!-- 分类导航：形态由 tab_style 控制；编辑态点击只切换，不触发页面跳转 -->
    <div
      v-if="cfg.show_category_tabs && categoryTabs.length"
      class="feed-tabs"
      :class="`feed-tabs--${cfg.tab_style}`"
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
        @click.stop="onTabClick(tab)"
      >
        {{ tab.name }}
      </button>
    </div>

    <!-- 空态：结构完整 + 可操作提示，绝不白屏/塌陷 -->
    <div v-if="showFailState" class="feed-empty feed-empty--fail">
      <span class="feed-empty__icon">⚠️</span>
      <p class="feed-empty__title">文章数据读取失败</p>
      <p class="feed-empty__hint">{{ failMessage }}</p>
    </div>

    <div v-else-if="showSkeleton" class="feed-skeleton" aria-hidden="true">
      <div v-for="i in skeletonRows" :key="`sk-${i}`" class="feed-skeleton__row">
        <i class="feed-skeleton__thumb" />
        <div class="feed-skeleton__lines">
          <b /><b class="feed-skeleton__short" />
        </div>
      </div>
    </div>

    <div v-else-if="showFilteredEmpty" class="feed-empty">
      <span class="feed-empty__icon">🔍</span>
      <p class="feed-empty__title">{{ emptyTitle }}</p>
      <p class="feed-empty__hint">{{ emptyHint }}</p>
    </div>

    <div
      v-else
      class="feed-body"
      :class="[
        `layout-${cfg.layout}`,
        `divider-${cfg.divider_style}`,
        { 'is-tabs-mode': cfg.show_category_tabs, 'cover-left': coverOnLeft },
      ]"
      :style="{ gap: `${cfg.item_gap}px`, padding: `0 ${cfg.card_margin}px` }"
    >
      <article
        v-for="(item, index) in displayItems"
        :key="`${item.id || item.title || 'article'}-${index}`"
        class="article-card"
        :class="[`article-card--${cardModifier(index)}`, { 'is-clickable': canNavigate }]"
        :style="cardStyle(item, index)"
        @click="onArticleClick($event, item)"
      >
        <div v-if="showCoverFor(item)" class="article-img" :style="coverStyle(index)">
          <img v-if="item.cover" :src="item.cover" alt="" class="article-cover" />
          <span v-else class="article-img__ph">📖</span>
          <!-- 角标位置：封面上 -->
          <span v-if="cfg.badge_position === 'cover' && visibleBadges(item).length" class="article-badges article-badges--cover">
            <em v-for="b in visibleBadges(item)" :key="b" class="article-badge">{{ badgeText(b) }}</em>
          </span>
        </div>

        <div class="article-info">
          <div v-if="cfg.show_source_tag && item.source && isOverlayCard(index)" class="article-kicker">{{ resolveSourceTag(item).text }}</div>

          <!-- 专栏 / 话题胶囊 -->
          <span v-if="cfg.show_column_tag && item.columnName" class="article-column">{{ item.columnName }}</span>

          <div class="article-title" :style="titleStyle(item, index)">
            <!-- 角标位置：标题旁 -->
            <span v-if="cfg.badge_position === 'title' && visibleBadges(item).length" class="article-badges article-badges--title">
              <em v-for="b in visibleBadges(item)" :key="b" class="article-badge">{{ badgeText(b) }}</em>
            </span>
            {{ item.title || '文章标题' }}
          </div>

          <p v-if="cfg.show_excerpt && item.excerpt && !isOverlayCard(index)" class="article-excerpt" :style="excerptStyle">
            {{ item.excerpt }}
          </p>

          <div class="article-meta-row" :style="metaStyle">
            <!-- 发布者：头像 + 名称 + 认证 -->
            <span v-if="cfg.show_author && item.authorName" class="article-author">
              <img v-if="item.authorAvatar" :src="item.authorAvatar" alt="" class="article-author__avatar" />
              <span class="article-author__name">{{ item.authorName }}</span>
              <span v-if="item.authorVerified" class="article-author__v" title="认证主理人">V</span>
            </span>
            <span
              v-if="cfg.show_source_tag && item.source && !isOverlayCard(index)"
              class="article-source"
              :class="{ 'is-tagged': resolveSourceTag(item).colored }"
              :style="sourceTagStyle(item)"
            >{{ resolveSourceTag(item).text }}</span>
            <span v-if="cfg.show_date && item.meta">{{ item.meta }}</span>
            <!-- 互动热度：按勾选的维度展示 -->
            <span v-if="cfg.show_metrics.length" class="article-metrics">
              <span v-if="hasMetric('views') && item.viewCount">◉ {{ item.viewCount }}</span>
              <span v-if="hasMetric('likes') && item.likeCount">♥ {{ item.likeCount }}</span>
              <span v-if="hasMetric('reading') && item.readingMinutes">⏱ 阅读 {{ item.readingMinutes }} 分钟</span>
            </span>
            <!-- 角标位置：底部行 -->
            <span v-if="cfg.badge_position === 'meta' && visibleBadges(item).length" class="article-badges article-badges--meta">
              <em v-for="b in visibleBadges(item)" :key="b" class="article-badge">{{ badgeText(b) }}</em>
            </span>
            <!-- 行动引导 -->
            <span v-if="cfg.show_cta" class="article-cta">{{ cfg.cta_text }}</span>
          </div>
        </div>
      </article>
    </div>

    <div v-if="showFooter" class="feed-footer">
      <span>{{ footerText }}</span>
    </div>

    <!-- 编辑态点击保护：默认只用于选中组件，滑动/跳转需显式切到交互预览 -->
    <button
      v-if="!previewMode"
      type="button"
      class="feed-mode"
      :class="{ 'is-preview': interactive }"
      :title="interactive ? '交互预览：可点击卡片，点此回到编辑态' : '编辑态：点击仅选中组件，点此进入交互预览'"
      @click.stop.prevent="interactive = !interactive"
    >
      <span class="feed-mode__dot" aria-hidden="true"></span>
      {{ interactive ? '交互预览' : '编辑态' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { fetchTopContentCategoryTabs, withAllCategoryTab } from '@/utils/content-category-tabs'
import { loadHydratedComponent } from '@/utils/preview-datasource'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { articleCardModifier } from '../articleLayouts'
import {
  coverAspectCss,
  normalizeArticleFeedProps,
  hidesCoverInLayout,
  FEED_BADGE_TEXT,
  SOURCE_COLOR_PRESETS,
  type ArticleFeedProps,
  type FeedBadgeKey,
  type FeedMetricKey,
} from '../articleFeed/articleFeedSchema'

/**
 * 固定渠道的默认文案。
 * ⚠️ 与端上 `miniapp/utils/dsl-source-tag.js` 的 DEFAULTS **逐字一致** ——
 * 两端不一致会表现为「预览显示公众号、真机显示订阅号」。
 */
const SOURCE_DEFAULTS: Record<string, string> = {
  wechat_mp: '公众号',
  xiaohongshu: '小红书',
  qa: '问答',
  original: '原创',
}

type ArticleItem = {
  id?: number | string
  title?: string
  meta?: string
  cover?: string
  excerpt?: string
  link_url?: string
  source?: string
  categoryId?: string | number
  categoryName?: string
  authorName?: string
  authorAvatar?: string
  likeCount?: number
  viewCount?: number
  isOriginal?: boolean
  /** 本轮新增：专栏 / 认证 / 角标标记 / 阅读时长 */
  columnName?: string
  authorVerified?: boolean
  readingMinutes?: number
  isPinned?: boolean
  isFeatured?: boolean
  isLatest?: boolean
  isDeepReport?: boolean
  hasAudio?: boolean
  hasVideo?: boolean
  isMemberOnly?: boolean
  isFreeLimited?: boolean
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

/** 编辑态是否允许真实点击跳转 */
const interactive = ref(false)

/** 🔴 与属性面板读同一份归一化配置，杜绝「面板一种、画布另一种」 */
const cfg = computed<ArticleFeedProps>(() => normalizeArticleFeedProps(props.component.props))

/* ---------------- 封面位置 / 容器风格 ---------------- */
/** 纯文字版式强制隐藏封面（需求 2.1 形态 F） */
function showCoverFor(item: ArticleItem): boolean {
  if (hidesCoverInLayout(cfg.value.layout)) return false
  if (!cfg.value.show_cover) return false
  return !!item.cover
}

/** 封面是否在左（仅横向图文版式生效；网格/大图类版式封面在上方，忽略该设置） */
const coverOnLeft = computed(() => {
  const l = cfg.value.layout
  const supports = l === 'list' || l === 'card' || l === 'compact'
  return supports && cfg.value.cover_position === 'left'
})

/* ---------------- 状态角标 ---------------- */
/**
 * 按勾选的角标类型 ∩ 文章实际具备的标记。
 * 例如运营勾了「音频」但这篇没有音频字段，就不该显示空角标。
 */
function visibleBadges(item: ArticleItem): string[] {
  const flagMap: Record<string, unknown> = {
    original: item.isOriginal,
    pinned: item.isPinned,
    featured: item.isFeatured,
    latest: item.isLatest,
    deep_report: item.isDeepReport,
    audio: item.hasAudio,
    video: item.hasVideo,
    member_only: item.isMemberOnly,
    free_limited: item.isFreeLimited,
  }
  return cfg.value.show_badges.filter((k) => !!flagMap[k])
}

function badgeText(key: string): string {
  return FEED_BADGE_TEXT[key as FeedBadgeKey] || key
}

/**
 * 🔴 来源标签解析（2026-10-06）—— 与端上 `miniapp/utils/dsl-source-tag.js` **同规则**。
 *
 * 修复前的问题：面板能配「渠道 → 展示文案 / 配色」，但画布渲染的是文章原始的
 * `item.source`，**后台配的文案与配色在预览里完全看不到**；端上更是算了
 * `sourceTagLabel` 却从未在 wxml 里用过。
 *
 * ⚠️ 两端口径必须一致（文案优先级 + 配色色值），否则会表现为
 * 「预览是一种颜色、真机是另一种」，运营会以为配色没生效而反复重配。
 */
function resolveSourceTag(item: any) {
  const raw = String(item?.source || '').trim()
  const key = resolveSourceKey(item)
  const map = (cfg.value.source_tag_map || []) as Array<{ key: string; label: string; color?: string }>
  const row = key ? map.find((r) => String(r.key || '').trim() === key) : undefined
  const labels = (cfg.value.source_labels || {}) as Record<string, string>
  const text = String(
    row?.label || (key ? labels[key] : '') || (key ? SOURCE_DEFAULTS[key] : '') || raw || '',
  ).trim()
  if (!text) return { text: '', bg: '', fg: '', colored: false }
  const preset = row?.color ? SOURCE_COLOR_PRESETS[row.color] : undefined
  return {
    text,
    bg: preset?.bg || '',
    fg: preset?.fg || '',
    colored: Boolean(preset),
  }
}

/** 文章 → 渠道 key：显式 tag 优先 → 中文兜底 → 空串（无法归类不算错） */
function resolveSourceKey(item: any): string {
  const tag = String(item?.sourceTag || item?.source_tag || '').toLowerCase()
  if (tag === 'wechat_mp' || tag === 'wechat') return 'wechat_mp'
  if (tag === 'xiaohongshu' || tag === 'xhs') return 'xiaohongshu'
  if (tag === 'qa') return 'qa'
  if (tag === 'original') return 'original'
  const src = String(item?.source || '')
  if (src.indexOf('微信') >= 0 || src.indexOf('公众号') >= 0) return 'wechat_mp'
  if (src.indexOf('小红书') >= 0) return 'xiaohongshu'
  if (src.indexOf('问答') >= 0) return 'qa'
  if (src === '原创' || src === '手动录入') return 'original'
  return ''
}

/** 未配色时返回 null，让原有 .article-meta-row 继承色生效 */
function sourceTagStyle(item: any): Record<string, string> | null {
  const t = resolveSourceTag(item)
  if (!t.colored) return null
  return { background: t.bg, color: t.fg }
}

function hasMetric(key: FeedMetricKey): boolean {
  return cfg.value.show_metrics.includes(key)
}

const activeTabId = ref('')
const liveCategoryTabs = ref<Array<{ id: string; name: string }>>([])
const tabItems = ref<ArticleItem[]>([])
const tabLoading = ref(false)

const categoryTabs = computed(() => {
  const list = withAllCategoryTab(liveCategoryTabs.value)
  return cfg.value.tab_show_all ? list : list.filter((t) => String(t.id) !== '')
})

/* ---------------- 分类导航 ---------------- */
async function loadCategoryTabs() {
  if (!cfg.value.show_category_tabs) {
    liveCategoryTabs.value = []
    return
  }
  liveCategoryTabs.value = await fetchTopContentCategoryTabs()
}

watch(() => cfg.value.show_category_tabs, () => {
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
      data_source: { type: 'content', params, query: params },
    },
  }
}

async function loadTabArticles(tabId: string) {
  if (props.previewMode || !cfg.value.show_category_tabs) return
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
  [() => cfg.value.show_category_tabs, activeTabId, () => cfg.value.page_size, () => props.component.props?.data_source],
  () => {
    if (!cfg.value.show_category_tabs) {
      tabItems.value = []
      return
    }
    void loadTabArticles(String(activeTabId.value || ''))
  },
  { immediate: true },
)

/* ---------------- 版式 ---------------- */
function cardModifier(index: number) {
  return articleCardModifier(cfg.value.layout, index)
}

function isOverlayCard(index: number) {
  return cardModifier(index) === 'overlay'
}

/* ---------------- 数据 ---------------- */
const { items: liveItems, loading: liveLoading, empty: liveEmpty, failed: liveFailed } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
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
    excerpt: String(item.summary || item.excerpt || item.subtitle || '').trim(),
    link_url: item.link_url,
    source: item.source || item.categoryName || item.category_name || '',
    categoryId: item.categoryId ?? item.category_id,
    categoryName: item.categoryName || item.category_name || '',
    authorName: item.authorName || item.author_name || item.author?.name || '',
    authorAvatar: item.authorAvatar || item.author_avatar || item.author?.avatar || '',
    likeCount: Number(item.likeCount ?? item.like_count ?? 0) || 0,
    viewCount: Number(item.viewCount ?? item.view_count ?? 0) || 0,
    isOriginal: Number(item.isOriginal ?? item.is_original ?? 0) === 1,
    // —— 本轮新增的卡片要素字段 ——
    columnName: String(item.columnName || item.column_name || item.column || '').trim(),
    authorVerified: Number(item.authorVerified ?? item.author_verified ?? 0) === 1,
    // 预估阅读时长：优先用后端给的分钟数，否则按摘要长度粗估
    readingMinutes: Number(item.readingMinutes ?? item.reading_minutes ?? 0) || undefined,
    isPinned: Number(item.isPinned ?? item.is_pinned ?? 0) === 1,
    isFeatured: Number(item.isFeatured ?? item.is_featured ?? 0) === 1,
    isLatest: Number(item.isLatest ?? item.is_latest ?? 0) === 1,
    isDeepReport: Number(item.isDeepReport ?? item.is_deep_report ?? 0) === 1,
    hasAudio: Number(item.hasAudio ?? item.has_audio ?? 0) === 1,
    hasVideo: Number(item.hasVideo ?? item.has_video ?? 0) === 1,
    isMemberOnly: Number(item.isMemberOnly ?? item.is_member_only ?? 0) === 1,
    isFreeLimited: Number(item.isFreeLimited ?? item.is_free_limited ?? 0) === 1,
  }
}

const visibleArticleItems = computed<ArticleItem[]>(() => {
  const items = props.component.props?.items
  if (props.previewMode) {
    if (!Array.isArray(items) || items.length === 0) return []
    return items.slice(0, Math.max(cfg.value.page_size, 20)).map(mapArticle)
  }
  const live = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
  return live.map(mapArticle)
})

/**
 * 🔴 置顶优先：置顶项按配置顺序排在最前，其余按原序跟随。
 * 画布与端上同一口径（端上在 dsl-article-feed 里做同样处理）。
 */
const displayItems = computed<ArticleItem[]>(() => {
  const limit = cfg.value.page_size
  const pool = cfg.value.show_category_tabs
    ? (props.previewMode
        ? filterByTab(visibleArticleItems.value)
        : tabItems.value.slice(0, limit))
    : visibleArticleItems.value.slice(0, limit)

  const pinned = cfg.value.pinned
  if (!pinned.length) return pool

  const byId = new Map(pool.map((it) => [String(it.id ?? ''), it]))
  const head: ArticleItem[] = []
  for (const p of pinned) {
    const hit = byId.get(String(p.id))
    if (hit) {
      head.push(hit)
      byId.delete(String(p.id))
    } else {
      // 置顶的文章不在当前筛选结果里（常见：筛选条件变了）也要占位，
      // 否则运营会以为「置顶没生效」而反复排查
      head.push({ id: p.id, title: p.title || `文章 #${p.id}`, cover: p.cover })
    }
  }
  const headIds = new Set(head.map((h) => String(h.id ?? '')))
  const rest = pool.filter((it) => !headIds.has(String(it.id ?? '')))
  return [...head, ...rest].slice(0, Math.max(limit, head.length))
})

function filterByTab(list: ArticleItem[]): ArticleItem[] {
  const tabId = String(activeTabId.value || '')
  if (!tabId) return list
  const tab = categoryTabs.value.find((t) => String(t.id) === tabId)
  return list.filter((item) => {
    if (tab && /^\d+$/.test(String(tab.id)) && item.categoryId != null) {
      return String(item.categoryId) === String(tab.id)
    }
    const name = tab?.name || tabId
    return `${item.categoryName || ''} ${item.source || ''} ${item.title || ''}`.includes(name)
  })
}

/* ---------------- 空态 / 骨架 ---------------- */
const showFailState = computed(() => {
  if (props.previewMode) return !!props.component.props?._previewDataFailed
  return liveFailed.value
})

const failMessage = computed(() =>
  props.previewMode
    ? '文章数据加载失败，请确认内容已发布或稍后重试'
    : '文章数据请求失败，请检查网络',
)

/** 骨架：仅编辑态且正在拉取时显示（预览态失败已有独立提示） */
const showSkeleton = computed(() =>
  !props.previewMode && !showFailState.value && (liveLoading.value || tabLoading.value),
)

const skeletonRows = computed(() => Math.min(cfg.value.page_size, 5))

const showFilteredEmpty = computed(() => {
  if (showFailState.value || showSkeleton.value) return false
  return displayItems.value.length === 0
})

/** 空态提示要能指出「为什么空」，否则运营只会反复刷新 */
const emptyTitle = computed(() => {
  const reasons: string[] = []
  if (cfg.value.scope === 'category') reasons.push('分类')
  if (cfg.value.scope === 'column') reasons.push('专栏')
  if (cfg.value.filter_topic_tags.length) reasons.push('话题标签')
  if (cfg.value.filter_platform_codes.length) reasons.push('平台维度')
  if (cfg.value.show_category_tabs && activeTabId.value) reasons.push('当前分类')
  return reasons.length ? '当前筛选条件下暂无文章' : '暂无可展示的文章'
})

const emptyHint = computed(() => {
  const hasFilter = cfg.value.filter_topic_tags.length
    || cfg.value.filter_platform_codes.length
    || cfg.value.scope !== 'all'
  return hasFilter ? '请调整分类、专栏或标签筛选条件后重试' : '请先发布内容，或检查筛选条件是否过窄'
})

const showFooter = computed(() =>
  !showFailState.value && !showFilteredEmpty.value && !showSkeleton.value && displayItems.value.length > 0,
)

const footerText = computed(() => {
  const max = cfg.value.max_count
  if (max > 0 && displayItems.value.length >= max) return '已展示全部内容'
  if (props.previewMode) return '小程序下滑页面将自动加载更多'
  if (cfg.value.load_mode === 'button') return '点击「查看更多」加载下一篇'
  if (cfg.value.load_mode === 'pager') return '可通过分页器切换'
  return cfg.value.load_more_text
})

/* ---------------- 样式派生（响应配置） ---------------- */
function coverStyle(index: number): Record<string, string> {
  const style: Record<string, string> = {}
  if (index === 0 && cfg.value.layout === 'magazine') return style
  const aspect = coverAspectCss(cfg.value.cover_aspect)
  if (aspect) style.aspectRatio = aspect
  style.borderRadius = `${cfg.value.cover_radius}px`
  return style
}

/** 卡片外边距统一在 .feed-body 上用 padding 施加，这里不需要逐卡 inline 样式 */
function cardStyle(_item: ArticleItem, _index: number): Record<string, string> | undefined {
  return undefined
}

function titleStyle(item: ArticleItem, index: number): Record<string, string> | undefined {
  void item
  if (isOverlayCard(index)) return undefined
  return {
    fontSize: `${cfg.value.title_font_size}px`,
    fontWeight: cfg.value.title_bold ? '700' : '600',
  }
}

const excerptStyle = computed<Record<string, string>>(() => ({
  fontSize: `${cfg.value.subtitle_font_size}px`,
  WebkitLineClamp: String(cfg.value.excerpt_lines),
}))

const metaStyle = computed<Record<string, string>>(() => ({
  fontSize: `${cfg.value.subtitle_font_size}px`,
  color: cfg.value.subtitle_color,
}))

/* ---------------- 交互 ---------------- */
const canNavigate = computed(() => props.previewMode === true || interactive.value)

function onArticleClick(event: MouseEvent, item: ArticleItem) {
  // 编辑态：交回给外层做组件选中，绝不跳转
  if (!canNavigate.value) return
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

function onTabClick(tab: { id: string; name: string }) {
  activeTabId.value = String(tab.id)
  // 预览态允许切分类；编辑态仅切换展示，不做任何跳转
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
  position: relative;
  width: 100%;
  min-width: 0;
  overflow: visible;
}

/* ---------- 分类导航：三种形态 ---------- */
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
  box-sizing: border-box;

  &::-webkit-scrollbar {
    display: none;
  }

  /* 极简下划线：去掉底边线，改用文字下划线指示 */
  &--underline {
    gap: 14px;
    background: transparent;
    border-bottom: 0;

    .feed-tab {
      padding: 6px 2px;
      border-radius: 0;
    }

    .feed-tab.active {
      background: transparent;
      box-shadow: inset 0 -2px 0 0 currentColor;
    }
  }

  /* 分段选择器：整体灰底，选中项白底 */
  &--segmented {
    padding: 4px;
    background: #f1f5f9;
    border-radius: 9px;
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
  color: var(--theme-primary, var(--color-primary));
  font-weight: 700;
  background: color-mix(in srgb, var(--theme-primary, var(--color-primary)) 14%, transparent);
}

.feed-tabs--segmented .feed-tab {
  padding: 5px 12px;
  font-size: 13px;
}

.feed-tabs--segmented .feed-tab.active {
  color: var(--theme-primary, var(--color-primary));
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

/* ---------- 空态：结构完整 + 提示，绝不塌陷 ---------- */
.feed-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 132px;
  padding: 22px 16px;
  text-align: center;
  background: #f8faff;
  border: 1px dashed #dfe6f0;
  border-radius: var(--card-radius, 10px);
}

.feed-empty--fail {
  background: #fffbeb;
  border-color: #fde68a;
}

.feed-empty__icon {
  margin-bottom: 6px;
  font-size: 20px;
  line-height: 1;
}

.feed-empty__title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #475569;
}

.feed-empty__hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1.5;
}

/* ---------- 骨架屏 ---------- */
.feed-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px 12px;
}

.feed-skeleton__row {
  display: flex;
  gap: 10px;
  align-items: center;
}

.feed-skeleton__thumb {
  flex: none;
  width: 56px;
  height: 42px;
  background: linear-gradient(120deg, #eef2f7 0%, #f7f9fb 50%, #eef2f7 100%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: feed-sk 1.25s infinite linear;
}

.feed-skeleton__lines {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 7px;
  min-width: 0;
}

.feed-skeleton__lines b {
  height: 9px;
  background: #eef2f7;
  border-radius: 5px;
}

.feed-skeleton__lines .feed-skeleton__short {
  width: 56%;
}

@keyframes feed-sk {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .feed-skeleton__thumb { animation: none; }
}

.feed-body.is-tabs-mode {
  padding-top: 4px;
}

.feed-body {
  display: flex;
  flex-direction: column;

  &.layout-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  &.layout-editorial,
  &.layout-magazine {
    gap: 0 !important;
  }
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
  position: relative;
  width: 62px;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  background: #eef2f7;

  .article-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.article-img__ph {
  font-size: 22px;
}

.article-badge {
  padding: 1px 5px;
  font-size: 10px;
  font-style: normal;
  line-height: 1.5;
  color: #fff;
  white-space: nowrap;
  background: rgba(192, 57, 43, 0.9);
  border-radius: 4px;
}

/* ---------------- 封面位置 / 容器风格（本轮新增） ---------------- */
.feed-body.cover-left .article-card--list,
.feed-body.cover-left .article-card--compact {
  flex-direction: row-reverse;
}

/* 独立卡片：白底圆角 + 浅阴影；细分割线：无卡片边框 */
.feed-body.divider-card .article-card {
  border: 0;
  background: #fff;
  box-shadow: 0 2px 10px rgb(15 23 42 / 5%);
}

.feed-body.divider-line .article-card--list,
.feed-body.divider-line .article-card--compact {
  border: 0;
  border-bottom: 1px solid #eef1f6;
  border-radius: 0;
  box-shadow: none;
}

/* ---------------- 专栏胶囊 ---------------- */
.article-column {
  display: inline-block;
  align-self: flex-start;
  max-width: 100%;
  margin-bottom: 4px;
  overflow: hidden;
  font-size: 11px;
  line-height: 1.5;
  color: var(--el-color-primary, #c08e6e);
  text-overflow: ellipsis;
  white-space: nowrap;
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
  border-radius: 999px;
  padding: 1px 7px;
}

/* ---------------- 状态角标容器 ---------------- */
.article-badges {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.article-badges--title {
  margin-right: 5px;
  vertical-align: middle;
}

.article-badges--cover {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 2;
}

.article-badges--meta {
  margin-left: 2px;
}

/* ---------------- 认证 V ---------------- */
.article-author__v {
  display: inline-grid;
  place-items: center;
  width: 12px;
  height: 12px;
  font-size: 8px;
  font-weight: 700;
  color: #fff;
  background: #2b6cb0;
  border-radius: 50%;
}

/* ---------------- CTA ---------------- */
.article-cta {
  margin-left: auto;
  font-size: 11px;
  color: var(--el-color-primary, #c08e6e);
  white-space: nowrap;
}

.article-card--card .article-img {
  width: 100%;
  height: auto;
}

.article-card--compact .article-img {
  width: 48px;
  min-height: 40px;
}

.article-card--overlay {
  position: relative;
  display: block;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 16px;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
}

.article-card--overlay .article-img {
  width: 100%;
  min-height: 188px;
}

.article-card--overlay .article-info {
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

.article-card--overlay .article-title {
  color: #fff;
  font-size: 16px;
  font-weight: 700;
}

.article-card--grid {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  border: 0;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.08);
}

.article-card--grid .article-img {
  width: 100%;
  min-height: 96px;
}

.article-card--grid .article-info {
  padding: 8px 10px 10px;
}

.article-card--editorial {
  display: flex;
  flex-direction: row-reverse;
  gap: 14px;
  padding: 16px 2px;
  background: transparent;
  border: 0;
  border-bottom: 1px solid #ece7de;
  border-radius: 0;
  box-shadow: none;
}

.article-card--editorial .article-img {
  width: 86px;
  min-height: 64px;
}

.article-excerpt {
  display: -webkit-box;
  margin-top: 6px;
  overflow: hidden;
  color: #7a7468;
  line-height: 1.5;
  -webkit-box-orient: vertical;
}

.layout-magazine .article-card--overlay {
  margin-bottom: 8px;
  border-radius: 18px;
}

.article-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.article-title {
  color: #172033;
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
}

.article-author {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
}

.article-author__avatar {
  width: 14px;
  height: 14px;
  object-fit: cover;
  border-radius: 999px;
}

.article-author__name {
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.article-metrics {
  display: inline-flex;
  gap: 8px;
}

.feed-footer {
  margin-top: 10px;
  padding: 8px 0 4px;
  text-align: center;
  color: #94a3b8;
  font-size: 11px;
}

/* ---------- 编辑态 / 交互预览切换 ---------- */
.feed-mode {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 7;
  display: inline-flex;
  gap: 4px;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
  color: #6b5b4e;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e3ddd3;
  border-radius: 999px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.feed-mode.is-preview {
  color: #fff;
  background: var(--el-color-primary, #c08e6e);
  border-color: transparent;
}

.feed-mode__dot {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.8;
}

/* ---------------- 来源标签配色态（2026-10-06） ----------------
   🔴 配色态才加胶囊形状；未配色时保持原有的 meta 行灰字，
   避免「所有文章都套底色」把信息层级压平。
   ⚠️ 圆角与内距不可省：不给的话底色是一块方的色块直接贴在文字后面，像脏点。 */
.article-source.is-tagged {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.6;
  /* 🔴 与端上同口径：标签文字不折行。
     「小红书」折成两行会把整行高度从 20px 撑到 37px，整张卡片排版被带歪。 */
  white-space: nowrap;
}

</style>
