<template>
  <div
    class="render-note-feed"
    :class="[
      { 'render-note-feed--preview': previewMode },
      `note-feed--tabs-${tabActiveStyle}`,
    ]"
    :style="[containerStyle, cardShadowStyle]"
  >
    <!-- 导航容器：2026-10-06 新增，包住两层导航，承载 nav_bg / nav_radius。
         ⚠️ 只在「有任一层要显示」时才包，避免空容器占位。 -->
    <div
      v-if="showTypeTabs || (showCategoryTabs && categoryTabs.length)"
      class="note-feed__nav"
      :style="navWrapStyle"
    >
    <div v-if="showTypeTabs" class="type-tabs" :style="[typeTabsStyle, typeTabVars]" @mousedown.stop @pointerdown.stop @touchstart.stop>
      <div class="type-tabs__list" :style="tabListStyle">
        <button
          v-for="(t, i) in typeTabs"
          :key="`${t.label}-${i}`"
          type="button"
          class="type-tab"
          :class="{ active: activeType === i }"
          :style="typeTabStyle"
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
      :style="[feedTabsStyle, subTabActiveVars]"
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
        :style="feedTabStyle"
        @click.stop="activeTabId = String(tab.id)"
      >
        {{ tab.name }}
      </button>
    </div>
    </div>
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showFilteredEmpty" class="note-empty">
      <span class="note-empty__art" aria-hidden="true">
        <i class="note-empty__box" /><i class="note-empty__box" /><i class="note-empty__box" />
      </span>
      <p class="note-empty__title">暂无相关笔记</p>
      <p class="note-empty__hint">请调整筛选维度，或确认内容已发布</p>
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
        :style="cardStyle"
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
          <div class="note-title" :style="titleStyle">{{ item.title || '笔记标题' }}</div>
          <div v-if="isTextCard(item) && item.summary" class="note-summary">{{ item.summary }}</div>
          <div class="note-foot">
            <template v-if="item.isProduct">
              <span class="note-price">{{ item.priceText }}</span>
            </template>
            <template v-else>
              <!-- 🔴 作者栏与来源标改为可配置（此前恒显，画布无法预览关掉后的样子） -->
              <template v-if="showAuthor">
                <span class="note-av">{{ item.authorInitial || '作' }}</span>
                <span class="note-author">{{ item.author || '作者' }}</span>
              </template>
              <span v-if="showSourceBadge && item.source" class="note-source">{{ item.source }}</span>
              <span
                v-if="cardMetric !== 'none'"
                class="note-like"
                :class="{ 'note-like--heart': likeHeart && cardMetric === 'like' }"
              >
                <template v-if="cardMetric === 'like'">{{ likeHeart ? '♥' : '♡' }} {{ item.likeText || '0' }}</template>
                <template v-else-if="cardMetric === 'view'">◉ {{ item.viewText || '0' }}</template>
                <template v-else>☆ {{ item.collectText || '0' }}</template>
              </span>
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
import { normalizeNoteFeedProps, noteContainerStyle, TAB_INDICATOR_COLOR } from '../noteFeed/noteFeedSchema'

type NoteItem = {
  id?: number | string
  title?: string
  cover?: string
  summary?: string
  imageCount?: number
  author?: string
  authorInitial?: string
  likeText?: string
  viewText?: string
  collectText?: string
  source?: string
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

/**
 * 🔴 与属性面板读同一份归一化配置（noteFeedSchema），
 * 避免「面板改了画布不变」——此前 title_size / item_border_radius /
 * page_gutter / background_color / tab_font_size 五个字段画布根本没读。
 */
const cfg = computed(() => normalizeNoteFeedProps(props.component.props))

const showCategoryTabs = computed(() => cfg.value.show_category_tabs)
const itemGap = computed(() => cfg.value.item_gap)
const galleryBadge = computed(() => cfg.value.gallery_badge)
const textCard = computed(() => cfg.value.text_card)
const likeHeart = computed(() => cfg.value.like_heart)
const showSearch = computed(() => cfg.value.show_search)
const showAuthor = computed(() => cfg.value.show_author)
const showSourceBadge = computed(() => cfg.value.show_source_badge)
const cardMetric = computed(() => cfg.value.card_metric)
const titleSize = computed(() => cfg.value.title_size)
const titleLines = computed(() => cfg.value.title_lines)
const cardRadius = computed(() => cfg.value.item_border_radius)
const cardBg = computed(() => cfg.value.card_bg)
const tabFontSize = computed(() => cfg.value.tab_font_size)
const tabActiveStyle = computed(() => cfg.value.tab_active_style)

/** 容器样式：列表底色 + 左右边距 */
const containerStyle = computed(() => noteContainerStyle(cfg.value))
/** 卡片样式：圆角 + 底色 + 标题字号/行数 */
const cardStyle = computed<Record<string, string>>(() => ({
  borderRadius: `${cardRadius.value}px`,
  background: cardBg.value,
}))
/** 标题样式：字号 px（与真机一致）+ 行数限制 */
const titleStyle = computed<Record<string, string>>(() => {
  const style: Record<string, string> = { fontSize: `${titleSize.value}px` }
  if (titleLines.value > 0) {
    style.display = '-webkit-box'
    style.WebkitBoxOrient = 'vertical'
    style.WebkitLineClamp = String(titleLines.value)
    style.overflow = 'hidden'
  }
  return style
})
/** Tab 字号 */
const tabListStyle = computed<Record<string, string>>(() => ({
  fontSize: `${tabFontSize.value}px`,
  // 2026-10-06：首层字间距（原硬编码 gap:18px，现可配）
  gap: `${cfg.value.tab_gap}px`,
}))

/* ================================================================
 * 两层导航样式（2026-10-06 新增，此前全部硬编码）
 * ================================================================ */

/** 导航区包裹底色 + 圆角。空色不输出 background，避免写成 `background:` 空值。 */
const navWrapStyle = computed<Record<string, string>>(() => {
  const c = cfg.value
  const st: Record<string, string> = {}
  if (c.nav_bg) st.background = c.nav_bg
  if (c.nav_radius > 0) st.borderRadius = `${c.nav_radius}px`
  return st
})

/**
 * 首层导航（全部 / 笔记 / 长文 / 好物）。
 * ⚠️ 分割线：`tab_divider_color` 为空串 = 运营主动关掉，不画线。
 * 用 borderColor 而非 border —— 写 border 会把 1px 的线补回来，关不掉。
 */
const typeTabsStyle = computed<Record<string, string>>(() => {
  const c = cfg.value
  const st: Record<string, string> = {}
  if (c.tab_bar_bg) st.background = c.tab_bar_bg
  if (c.tab_divider_color) {
    st.borderBottom = `1px solid ${c.tab_divider_color}`
  } else {
    st.borderBottom = '1px solid transparent'
  }
  return st
})

/** 首层未选中文字色（选中色走原有 tab_active_color，两条通道不打架） */
const typeTabStyle = computed<Record<string, string>>(() => ({
  color: cfg.value.tab_text_color,
}))

/** 次层分类胶囊容器：间距（字号/底色等在 .feed-tab 上） */
const feedTabsStyle = computed<Record<string, string>>(() => ({
  gap: `${cfg.value.sub_tab_gap}px`,
}))

/** 次层选中态色（也做成可配；用 CSS 变量下发，避免与内联常态色打架） */
const subTabActiveVars = computed<Record<string, string>>(() => {
  const c = cfg.value
  return {
    '--nt-active-color': c.sub_tab_active_color,
    '--nt-active-bg': c.sub_tab_active_bg,
  }
})

/**
 * 🔴 2026-10-06：首层导航的「解写死」通道。
 *
 * 此前 `.type-tab__bar` 的 `background: #ec2f55` 与 `.type-search` 的
 * `#c6cbd6` **全部写死在 CSS**，换主题只能改代码。
 * 现在由 CSS 变量下发，值给同值兜底（变量没注入时仍是原效果）。
 *
 * ⚠️ 口径：
 *   · `tab_indicator_color` 空 = **跟随激活主色**（清空即回退激活色，不是回红条）
 *   · `search_icon_color` 空 = **跟随未选文字色**
 *   · 未配置的老页面 = 拿到缺省 #ec2f55 → 视觉零变化
 */
/**
 * 🔴 卡片阴影预设档位（2026-10-06）—— **唯一定义处**。
 *
 * ⚠️ `light` 档必须逐字等于改前渲染器的原值
 * `0 2px 8px rgba(15, 18, 25, 0.06)`，否则老页面加载后阴影会变。
 * ⚠️ 面板的说明文案也按这张表生成，改这里就等于改文档。
 */
const CARD_SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  light: '0 2px 8px rgba(15, 18, 25, 0.06)',
  normal: '0 4px 16px rgba(15, 18, 25, 0.10)',
}

/** 卡片阴影 → CSS 变量（选 custom 时用 5 列参数自己拼） */
const cardShadowStyle = computed<Record<string, string>>(() => {
  const c = cfg.value
  let value: string
  if (c.card_shadow === 'custom') {
    const b = c.card_shadow_custom
    value = `${b.x}px ${b.y}px ${b.blur}px ${b.spread}px ${b.color}`
  } else {
    value = CARD_SHADOW_PRESETS[c.card_shadow] || CARD_SHADOW_PRESETS.light
  }
  return { '--nt-card-shadow': value }
})

const typeTabVars = computed<Record<string, string>>(() => {
  const c = cfg.value
  const indicator = c.tab_indicator_color || c.tab_active_color || TAB_INDICATOR_COLOR.fallback
  return {
    '--nt-indicator-color': indicator,
    '--nt-indicator-width': c.tab_indicator_color === '' ? '0px' : '18px',
    '--nt-search-color': c.search_icon_color || c.tab_text_color,
  }
})

/**
 * 次层单个胶囊：底色 / 圆角 / 内边距 / 字号 / 未选中文字色。
 * ⚠️ 选中态（.active）由 CSS 类负责，这里只给常态 ——
 * 两处都写会因优先级打架，出现「选了没变色」。
 */
const feedTabStyle = computed<Record<string, string>>(() => {
  const c = cfg.value
  return {
    fontSize: `${c.sub_tab_font_size}px`,
    color: c.sub_tab_text_color,
    background: c.sub_tab_bg,
    borderRadius: `${c.sub_tab_radius}px`,
    padding: `6px ${c.sub_tab_padding_x}px`,
  }
})
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
    viewText: formatLike(raw.viewCount ?? raw.view_count ?? raw.readCount ?? 0),
    collectText: formatLike(raw.collectCount ?? raw.collect_count ?? 0),
    source: String(raw.source || raw.categoryName || raw.category_name || '').trim(),
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

/* ⚠️ 2026-10-06：以下三处的底色/分割线/字间距/文字色已改为**可配置**
   （nav_bg / tab_bar_bg / tab_divider_color / tab_gap / tab_text_color），
   实际值由模板上的内联 style 给出（优先级高于此处 class）。
   CSS 里保留同值的兜底，作用是：
     ① 内联 style 缺失时（如 SSR/首帧）视觉不塌；
     ② 后人读 CSS 时能一眼看到「默认值是多少」。
   ⚠️ 改默认值时**必须三处同步**（Schema 默认 / 此处 CSS / 面板占位提示），
   只改一处会出现「面板显示 18、实际 12」这类对不上。 */
.type-tabs {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  /* 兜底：透明底 + #f0f1f5 分割线（内联 style 会覆盖） */
  background: transparent;
  border-bottom: 1px solid #f0f1f5;
}

.type-tabs__list {
  display: flex;
  flex: 1;
  /* 兜底 18px，内联 style 覆盖 */
  gap: 18px;
  overflow-x: auto;
}

.type-tab {
  position: relative;
  flex-shrink: 0;
  padding: 8px 0 10px;
  /* 兜底未选色 #727a8c，内联 style 覆盖 */
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
  /* 🔴 2026-10-06 解除写死的红条：宽度与颜色都走 CSS 变量。
     变量给同值兜底（18px / #ec2f55），未配置时与改动前逐字一致。 */
  width: var(--nt-indicator-width, 18px);
  height: 3px;
  background: var(--nt-indicator-color, #ec2f55);
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
  /* 🔴 2026-10-06 解除写死的 #c6cbd6：跟随「未选文字色」，
     配了主色主题后搜索图标自动融进去，不用改代码。 */
  border: 1.5px solid var(--nt-search-color, #c6cbd6);
  border-radius: 50%;
}

.type-search i {
  width: 8px;
  height: 2px;
  background: var(--nt-search-color, #c6cbd6);
  border-radius: 2px;
  transform: translate(5px, 5px) rotate(45deg);
}

/* ⚠️ 2026-10-06：次层胶囊的底色/圆角/内边距/字号/未选色已改为可配置
   （sub_tab_bg / sub_tab_radius / sub_tab_padding_x / sub_tab_font_size /
     sub_tab_text_color / sub_tab_gap），实际值由模板内联 style 给出。
   此处保留同值兜底，理由同首层。 */
.feed-tabs {
  display: flex;
  /* 兜底 8px，内联 style 覆盖 */
  gap: 8px;
  margin-bottom: 10px;
  overflow-x: auto;
}

.feed-tab {
  flex-shrink: 0;
  /* 兜底：padding 6px 14px / 12px / #727a8c / #f5f6f9 / 全圆，内联 style 覆盖 */
  padding: 6px 14px;
  color: #727a8c;
  font-size: 12px;
  background: #f5f6f9;
  border: none;
  border-radius: 999px;
  cursor: pointer;
}

/* 选中态：用 CSS 变量下发（由模板 style 注入），不写死色值。
   ⚠️ 必须 !important：常态色走**内联 style**，内联优先级高于 class，
   不加的话选中态会被内联常态色盖掉 → 表现为「点了没变化」。
   变量给默认值，万一变量没注入也能看到原效果。 */
.feed-tab.active {
  color: var(--nt-active-color, #ec2f55) !important;
  font-weight: 700;
  background: var(--nt-active-bg, #ffedf1) !important;
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
  /* 🔴 2026-10-06 阴影改为可配置。
     ⚠️ 原值 `0 2px 8px rgba(15,18,25,.06)` 正是「柔和微光」档 ——
     所以 Schema 缺省必须是 light（不是 none），否则老页面会集体丢阴影。
     变量给同值兜底，未配置时与改动前逐字一致。 */
  box-shadow: var(--nt-card-shadow, 0 2px 8px rgba(15, 18, 25, 0.06));
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

/* 🔴 字号与行数由面板配置经 inline style 下发（titleStyle），
   这里**不能写死**，否则会覆盖 inline 样式 → 表现为「样式 Tab 调了没反应」。
   行高与字重仍可在这里定（不影响可配置项）。 */
.note-title {
  display: -webkit-box;
  overflow: hidden;
  color: #0f1219;
  font-weight: 600;
  line-height: 1.38;
  -webkit-box-orient: vertical;
}

/* ---------- 来源渠道标 ---------- */
.note-source {
  max-width: 60px;
  padding: 1px 5px;
  overflow: hidden;
  font-size: 10px;
  line-height: 1.4;
  color: #6b7a90;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #eef2f7;
  border-radius: 4px;
}

/* ---------- 空状态：精致占位，防网格塌陷 ---------- */
.note-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 148px;
  padding: 20px 12px;
  text-align: center;
  background: #fafbfd;
  border: 1px dashed #dde3ec;
  border-radius: 10px;
}

.note-empty__art {
  display: flex;
  gap: 5px;
  align-items: flex-end;
  height: 34px;
  margin-bottom: 10px;
}

.note-empty__box {
  display: block;
  width: 20px;
  height: 26px;
  background: #e6ebf2;
  border-radius: 4px;

  /* 三张错落卡片，示意「这里本该有内容」 */
  &:nth-child(2) {
    height: 34px;
    background: #dde4ee;
  }

  &:nth-child(3) {
    height: 22px;
    background: #eef1f6;
  }
}

.note-empty__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: #5a6478;
}

.note-empty__hint {
  margin: 4px 0 0;
  font-size: 11px;
  color: #9aa4b2;
  line-height: 1.5;
}

/* ---------- Tab 选中高亮形态 ---------- */
.note-feed--tabs-fill .type-tab.active {
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 14%, transparent);
  border-radius: 999px;
}

.note-feed--tabs-ink .type-tab.active {
  font-weight: 700;

  .type-tab__bar {
    display: none;
  }
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

/* ---------------- 导航容器（2026-10-06） ----------------
   只负责承载 nav_bg / nav_radius，本身不做布局。
   ⚠️ 不用 overflow:hidden —— 胶囊横向滚动条需要溢出可见，
   否则会把滚动条裁掉（次层分类多时必然出现）。 */
.note-feed__nav {
  box-sizing: border-box;
}

</style>
