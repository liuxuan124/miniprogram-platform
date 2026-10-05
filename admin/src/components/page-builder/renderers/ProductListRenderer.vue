<template>
  <div class="render-product-list split-text-typography" :class="{ 'render-product-list--preview': previewMode }">
    <!-- 内置标题行：show_title=false 时整行不渲染 -->
    <div
      v-if="cfg.show_title && (cfg.title || cfg.subtitle)"
      class="pls-head"
      :class="`style-${sectionStyle} align-${sectionAlign}`"
    >
      <span class="pls-head__bars" aria-hidden="true">
        <i class="pls-head__bar pls-head__bar--down"></i>
        <i class="pls-head__bar pls-head__bar--up"></i>
      </span>
      <span class="pls-head__text">
        <span class="pls-head__main" :style="sectionTitleStyle">{{ cfg.title }}</span>
        <span v-if="cfg.subtitle" class="pls-head__sub" :style="sectionSubtitleStyle">{{ cfg.subtitle }}</span>
      </span>
      <button
        v-if="cfg.show_more"
        type="button"
        class="pls-head__more"
        :style="sectionMoreStyle"
        @click.stop="onMoreClick"
      >{{ cfg.more_text }} ›</button>
    </div>

    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showEmptyState" class="preview-data-empty">
      {{ previewMode ? '暂无商品数据，请确认商品已上架或稍后重试' : '当前筛选下没有已上架商品' }}
    </div>
    <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已上架商品…</div>
    <div
      v-else
      class="product-grid"
      :class="[`layout-${cfg.layout}`, `cols-${columnCount}`, `style-${cfg.card_style}`]"
      :style="{ gap: `${cfg.item_gap}px` }"
    >
      <template v-if="cfg.layout === 'row'">
        <div
          v-for="(item, idx) in visibleProductItems"
          :key="`${item.id || 'p'}-${idx}`"
          class="product-row"
          :class="{ 'is-clickable': previewMode }"
          :style="itemCardStyle"
          @click="onProductClick($event, item)"
        >
          <div class="product-thumb" :style="[itemImageStyle, !showItemImage(item, idx) ? item.artStyle : null]">
            <img
              v-if="showItemImage(item, idx)"
              :src="item.image"
              alt=""
              class="product-thumb-img"
              @error="markImageBroken(item, idx)"
            />
            <span v-else>{{ item.glyph || '🛍️' }}</span>
            <span v-if="item.badge" class="product-badge" :style="badgeStyle(item)">{{ item.badge }}</span>
          </div>
          <div class="product-body">
            <div v-if="cfg.show_title_in_card" class="product-row-name" :style="itemTitleStyle">{{ item.name }}</div>
            <div class="product-row-sub" :style="salesStyle">{{ item.meta }}</div>
            <div class="product-row-foot">
              <span v-if="showPrice" class="product-row-price" :style="priceStyle(item)">
                <template v-if="item.priceWithYuan && !item.isFree">¥</template>{{ item.priceText }}
              </span>
              <span v-if="cfg.show_original_price && item.originalPriceText" class="product-row-origin" :style="salesStyle">
                ¥{{ item.originalPriceText }}
              </span>
              <span v-if="showRating" class="product-row-rate">{{ item.ratingLine }}</span>
              <span v-else-if="cfg.show_sales" class="product-row-sales" :style="salesStyle">{{ item.salesLabel }}</span>
              <span v-if="ctaText" class="product-cta" :style="ctaStyle">{{ ctaText }}</span>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(item, idx) in visibleProductItems"
          :key="`${item.id || 'p'}-${idx}`"
          class="product-card"
          :class="{ 'is-clickable': previewMode, 'is-free': item.isFree }"
          :style="itemCardStyle"
          @click="onProductClick($event, item)"
        >
          <div class="product-img" :style="itemImageStyle">
            <img
              v-if="showItemImage(item, idx)"
              :src="item.image"
              alt=""
              class="product-cover"
              @error="markImageBroken(item, idx)"
            />
            <span v-else class="product-img-ph">🛍️</span>
            <span v-if="item.badge" class="product-badge" :style="badgeStyle(item)">{{ item.badge }}</span>
          </div>
          <div class="product-info">
            <div v-if="cfg.show_title_in_card" class="product-name" :style="itemTitleStyle">{{ item.name }}</div>
            <div class="product-bottom">
              <div class="product-meta-row">
                <span v-if="showPrice" class="product-price" :style="priceStyle(item)">
                  <template v-if="item.priceWithYuan && !item.isFree">¥</template>{{ item.priceText }}
                </span>
                <span
                  v-if="cfg.show_original_price && item.originalPriceText"
                  class="product-origin"
                  :style="salesStyle"
                >¥{{ item.originalPriceText }}</span>
                <span v-if="cfg.show_sales" class="product-sales" :style="salesStyle">{{ item.salesLabel }}</span>
              </div>
              <span v-if="ctaText" class="product-cta" :style="ctaStyle">{{ ctaText }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'
import { pickProductCoverUrl, orderProductsByIds } from '@/utils/product-cover'
import { formatProductPriceLabel, formatProductSalesLabel } from '@/utils/product-price-display'
import {
  normalizeProductListProps,
  resolveCardSurface,
  resolveCtaText,
  resolveColumnCount,
  resolveProductBadge,
  type ProductListProps as ProductConfig,
} from '../productList/productListSchema'

type PreviewProductItem = {
  id?: number | string
  name: string
  price: string
  priceText: string
  priceWithYuan: boolean
  /** 0 元商品单独标记：画布与真机都要靠它区分「免费领取」与「¥0」 */
  isFree: boolean
  originalPriceText: string
  badge?: string
  sales: number
  salesLabel: string
  image?: string
  meta?: string
  ratingLine?: string
  glyph?: string
  artStyle?: Record<string, string>
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: {
    tab: string
    message: string
    detailType?: string
    detailTitle?: string
    detailDesc?: string
    productId?: string | number
  }]
}>()

const brokenImageKeys = ref(new Set<string>())

function itemKey(item: PreviewProductItem, idx: number) {
  return `${item.id ?? 'p'}-${idx}`
}

function isImageBroken(item: PreviewProductItem, idx: number) {
  return brokenImageKeys.value.has(itemKey(item, idx))
}

function markImageBroken(item: PreviewProductItem, idx: number) {
  const key = itemKey(item, idx)
  if (brokenImageKeys.value.has(key)) return
  brokenImageKeys.value = new Set(brokenImageKeys.value).add(key)
}

function showItemImage(item: PreviewProductItem, idx: number) {
  return !!item.image && !isImageBroken(item, idx)
}

/** 归一化配置：与属性面板 / 样式面板读同一份 Schema */
const cfg = computed<ProductConfig>(() => normalizeProductListProps(props.component.props))

/**
 * 是否显示价格。
 * ⚠️ 需求里的「展示要素」列表**不含价格本身**（价格是商品列表的必备信息，
 *关掉整张卡就没有价格了），所以价格仍沿用旧 `show_price` 字段，缺省 true。
 */
const showPrice = computed(() => props.component.props?.show_price !== false)
const zeroPriceDisplay = computed(() => cfg.value.zero_price_display)
const showRating = computed(() => cfg.value.show_rating)

const productLayout = computed(() => cfg.value.layout)
const columnCount = computed(() => resolveColumnCount(cfg.value.layout, cfg.value.columns))

const sectionStyle = computed(() => {
  const raw = String(props.component.props?.section_style || 'plain')
  return ['bar', 'plain', 'card'].includes(raw) ? raw : 'plain'
})
const sectionAlign = computed(() => (props.component.props?.section_align === 'center' ? 'center' : 'left'))
const showMore = computed(() => cfg.value.show_more)
const moreText = computed(() => cfg.value.more_text || '查看更多 ›')
const moreLink = computed(() =>
  String(cfg.value.more_link || '/pkg-content/product-list/product-list').trim()
  || '/pkg-content/product-list/product-list',
)

const sectionMoreStyle = computed(() => {
  const isBand = sectionStyle.value === 'bar'
  const custom = props.component.props?.more_color
  const color = custom || (isBand ? '#D4E2FF' : cfg.value.price_color)
  return { color }
})

const sectionTitleStyle = computed(() => {
  const isBand = sectionStyle.value === 'bar'
  const custom = props.component.props?.section_title_color
  const fallback = isBand ? '#F3F7FC' : '#172033'
  // 旧默认深色在渐变条上会看不清，自动换成浅色
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
  const color = custom || (isBand ? '#D4E2FF' : '#7b8798')
  return {
    ...titleFontStyle(props.component.props?.section_subtitle_font_size, 11),
    color,
  }
})

/* ---------------- 字号与度量（全部读归一化后的 cfg） ---------------- */
const itemTitleStyle = computed(() => ({
  ...titleFontStyle(cfg.value.title_font_size, cfg.value.layout === 'row' ? 15 : 14),
  fontWeight: cfg.value.title_bold ? '700' : '400',
}))

const salesStyle = computed(() => titleFontStyle(cfg.value.sales_font_size, 11))

/**
 * 价格色：0 元商品走固定绿，不跟随价格高亮色。
 * 🔴 两端必须一致 —— 画布绿、真机红会让运营以为「免费领取」是 bug。
 */
function priceStyle(item: PreviewProductItem) {
  return {
    ...titleFontStyle(cfg.value.price_font_size, cfg.value.layout === 'row' ? 16 : 13),
    color: item.isFree ? '#1FA97A' : cfg.value.price_color,
  }
}

const itemCardStyle = computed(() => {
  const surface = resolveCardSurface(cfg.value.card_style, cfg.value.item_border_radius)
  const fromStyle = props.component.style?.border_radius
  const hasStyleRadius = fromStyle !== undefined && fromStyle !== null && (fromStyle as number | string) !== ''
  // 🔴 通用「外框圆角」在 style 面板显式设过时优先（那是运营的全局决定）
  const radius = hasStyleRadius ? Number(fromStyle) : cfg.value.item_border_radius
  return {
    ...surface,
    borderRadius: `${Number.isFinite(radius) ? Math.max(0, radius) : cfg.value.item_border_radius}px`,
  }
})

const itemImageStyle = computed(() => ({
  borderRadius: `${cfg.value.image_border_radius}px`,
}))

/* ---------------- CTA ---------------- */
const ctaText = computed(() => {
  if (cfg.value.cta === 'cart') return '🛒'
  return resolveCtaText(cfg.value.cta, cfg.value.cta_text)
})

const ctaStyle = computed(() => {
  if (cfg.value.cta === 'cart') {
    return { color: cfg.value.price_color, border: `1px solid ${cfg.value.price_color}44` }
  }
  return { background: cfg.value.price_color, color: '#fff' }
})

/** 角标底色：统一用价格高亮色（与端上同规则）。参数留着是为了模板可传可不传 */
function badgeStyle(_item?: PreviewProductItem) {
  return { background: cfg.value.price_color }
}

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

const DEMO_PRODUCTS: PreviewProductItem[] = [
  // 🔴 演示商品也要给全 isFree / originalPriceText —— 少一个字段 normalizeItem
  //    就会把它们算成 undefined，画布上「免费领取」与「¥0」就分不出来了。
  { id: 'demo-1', name: '示例商品 A', price: '199.00', priceText: '199.00', priceWithYuan: true, isFree: false, originalPriceText: '299.00', sales: 128, salesLabel: '已售128' },
  { id: 'demo-2', name: '示例商品 B', price: '0.00', priceText: '免费领取', priceWithYuan: false, isFree: true, originalPriceText: '', sales: 86, salesLabel: '已领86' },
]

const showFailState = computed(() => !!props.previewMode && props.component.props?._previewDataFailed === true)

const failMessage = computed(() =>
  props.previewMode
    ? '商品数据加载失败，请确认商品已上架或稍后重试'
    : '商品数据请求失败，请检查网络或数据源配置',
)

const showEmptyState = computed(() => {
  if (showFailState.value) return false
  if (!props.previewMode) return false
  return visibleProductItems.value.length === 0 && !liveLoading.value
})

function formatMoney(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? '0.00')
  return n.toFixed(2)
}

function pickTypeLabel(item: any) {
  const raw = String(item.product_type || item.productType || item.type || item.category_name || item.categoryName || '').toLowerCase()
  const name = String(item.name || item.title || '')
  if (/实物|physical|goods|周边|手册|纸质/.test(raw) || /实物|周边|手册|纸质/.test(name)) return '实物商品'
  if (/咨询|1v1|service|服务/.test(raw)) return '1v1 咨询'
  if (/数字|digital|知识|课|资料/.test(raw)) return '数字商品'
  return '实物商品'
}

const ART_PALETTE = [
  { bg: '#dbeafe', glyph: '📘' },
  { bg: '#ffedd5', glyph: '☕' },
  { bg: '#e0e7ff', glyph: '📦' },
  { bg: '#dcfce7', glyph: '🎁' },
]

function normalizeItem(item: any, index = 0): PreviewProductItem {
  const salesRaw = item.sales ?? item.salesCount ?? item.sold
  const sales = Number(salesRaw ?? 0)
  const price = item.price ?? item.min_price ?? item.minPrice ?? '0.00'
  const scoreRaw = item.avg_score ?? item.avgScore ?? item.rating ?? item.score
  const score = Number(scoreRaw)
  const reviews = Number(item.review_count ?? item.reviewCount ?? item.comment_count ?? item.comments ?? 0)
  const safeScore = Number.isFinite(score) && score > 0 ? score.toFixed(1) : '4.9'
  const safeReviews = reviews > 0 ? reviews : (86 + (index % 40))
  const art = ART_PALETTE[index % ART_PALETTE.length]
  const priceLabel = formatProductPriceLabel(price, zeroPriceDisplay.value)
  const salesCount = Number.isFinite(sales) ? sales : 0
  const salesLabel = formatProductSalesLabel(price, salesCount)
  // 🔴 0 元商品单独标记：画布要能只靠样式区分「免费领取」与「¥0」，
  //    否则运营看不出这两种展示方式的差别，也没法验证端上是否一致。
  const isFree = Number(price) === 0
  // 划线原价：取系统原价字段；缺省时不显示（不拿售价冒充原价）
  const originalRaw = item.originalPrice ?? item.original_price ?? item.marketPrice ?? item.market_price
  const originalNum = Number(originalRaw)
  const originalPriceText = Number.isFinite(originalNum) && originalNum > 0 ? originalNum.toFixed(2) : ''
  const badge = resolveProductBadge(
    cfg.value.badge_mode,
    cfg.value.badge_text,
    Number(price),
    originalNum,
  )
  return {
    id: item.id,
    name: item.name || item.title || '商品名称',
    price: formatMoney(price),
    priceText: priceLabel.text,
    priceWithYuan: priceLabel.withYuan,
    isFree,
    originalPriceText,
    badge,
    sales: salesCount,
    salesLabel,
    image: pickProductCoverUrl(item),
    meta: `${pickTypeLabel(item)} · ${salesLabel}`,
    ratingLine: `⭐ ${safeScore} · ${safeReviews} 评价`,
    glyph: art.glyph,
    artStyle: { background: art.bg },
  }
}

function resolveManualDisplayItems(
  saved: any[],
  live: any[],
  ids: string[],
  limit: number,
) {
  const ordered = ids.length
    ? orderProductsByIds(ids, live, saved)
    : orderProductsByIds(saved.map((item) => String(item.id)), live, saved)
  return ordered.slice(0, limit)
}

const visibleProductItems = computed<PreviewProductItem[]>(() => {
  const items = props.component.props?.items
  // 数量策略读归一化后的 cfg（面板的 page_strategy / limit 已在 Schema 里夹紧）
  const cap = cfg.value.page_strategy === 'stream'
    ? cfg.value.page_size
    : cfg.value.limit
  // 手动勾选的 id 顺序 = 展示顺序（Schema 已把 product_ids / manual_ids 合并去重）
  const ids = cfg.value.manual_ids
  const manual = cfg.value.pick_mode === 'manual' || ids.length > 0
  const saved = Array.isArray(items) ? items : []
  const live = liveItems.value.length ? liveItems.value : saved

  if (props.previewMode) {
    if (manual && (saved.length || live.length)) {
      const ordered = resolveManualDisplayItems(saved, live, ids, cap)
      if (ordered.length) return ordered.map((item, i) => normalizeItem(item, i))
    }
    if (Array.isArray(items) && items.length) {
      return items.slice(0, cap).map((item, i) => normalizeItem(item, i))
    }
    if (props.component.props?._previewDataFailed) return []
    return DEMO_PRODUCTS.slice(0, cap).map((item, i) => normalizeItem(item, i))
  }

  if (manual && (saved.length || live.length)) {
    const manualCap = cfg.value.page_strategy === 'stream' ? Math.max(ids.length, saved.length, 50) : cap
    const ordered = resolveManualDisplayItems(saved, live, ids, manualCap)
    if (ordered.length) return ordered.map(normalizeItem)
  }

  const source = live.length ? live : DEMO_PRODUCTS
  return source.slice(0, cap).map(normalizeItem)
})

function onProductClick(event: MouseEvent, item: PreviewProductItem) {
  // 编辑画布不拦截点击，让事件冒泡以便选中组件
  if (!props.previewMode) return
  event.stopPropagation()
  const id = item.id
  if (id == null || String(id).startsWith('demo-')) {
    ElMessage.info('演示商品无真实详情，请用已上架商品预览')
    return
  }
  emit('preview-action', {
    tab: 'product',
    message: `已打开商品「${item.name}」`,
    detailType: 'product',
    detailTitle: item.name,
    detailDesc: `售价 ¥${item.price}`,
    productId: id,
  })
}

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
  // 误填成管理端地址时回退默认商品页
  const link = (/page-builder/i.test(raw) || /^https?:\/\/[^/]*localhost/i.test(raw) && !/\/pages\//i.test(raw))
    ? '/pkg-content/product-list/product-list'
    : raw
  if (/^https?:\/\//i.test(link)) {
    window.open(link, '_blank')
    ElMessage.success('已在新窗口打开链接')
    return
  }
  emit('preview-action', {
    tab: resolvePreviewTab(link, 'shop'),
    message: `已打开商品列表（${link}）`,
  })
}
</script>

<style lang="scss" scoped>
.render-product-list {
  background: transparent;
  padding: 0;

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
      /* 独立通栏标题带：抵消外层 padding，左右顶满 */
      align-items: center;
      margin: -10px -10px 8px;
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

    /* 仅分割线通栏；竖条/标题位置不变 */
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

    /* 渐变条：保证上下内边距一致，不被上面的 has-divider 拉大 */
    &.style-bar {
      padding-top: 8px;
      padding-bottom: 8px;
    }

    &.style-card.has-divider {
      border-bottom: none;
    }
  }

  .section-title {
    font-size: 15px;
    font-weight: 600;
    color: #172033;
    margin-bottom: 8px;
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

  .product-grid {
    display: grid;
    gap: 8px;

    &.cols-1 {
      grid-template-columns: 1fr;
    }

    &.cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    &.cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    /* 旧类名保留：历史数据可能还有 layout-list 残留样式依赖 */
    &.layout-list,
    &.layout-row {
      display: flex;
      flex-direction: column;
      grid-template-columns: 1fr;
    }

    &.layout-waterfall {
      grid-template-columns: 1fr 1fr;
    }

    /* 🔴 横向滑动：一行放不下时左右滑。
       用 grid-auto-flow: column + auto-columns 才能既保留卡片宽度又允许横滑，
       直接写 flex 会让「cols-2/3」的列数设置失效。 */
    &.layout-scroll {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: minmax(132px, 42%);
      overflow-x: auto;
      padding-bottom: 4px;
      grid-template-columns: none;
    }
  }

  /* ---------- 卡片风格三档 ---------- */
  /* shadow 走行内 resolveCardSurface（白底 + 投影），这里只做描边/平铺的兜底 */
  .product-grid.style-outline .product-card,
  .product-grid.style-outline .product-row {
    background: transparent;
  }

  .product-grid.style-flat .product-card,
  .product-grid.style-flat .product-row {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
  }

  /* ---------- 角标 ---------- */
  .product-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    padding: 1px 5px;
    max-width: 60%;
    overflow: hidden;
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    line-height: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
    border-radius: 3px;
  }

  /* ---------- 划线原价 ---------- */
  .product-origin,
  .product-row-origin {
    color: #b3a596;
    text-decoration: line-through;
    white-space: nowrap;
  }

  /* ---------- CTA ---------- */
  .product-cta {
    flex: none;
    padding: 2px 8px;
    font-size: 10.5px;
    font-weight: 700;
    white-space: nowrap;
    border-radius: 999px;
  }

  /* 🔴 0 元商品：绿色左边框 + 淡绿底，让「免费领取」在一堆付费卡里一眼可辨 */
  .product-card.is-free {
    border-color: rgba(31, 169, 122, 0.32) !important;
    background: rgba(31, 169, 122, 0.05);
  }

  .product-row {
    /* 角标定位前提，同 product-card */
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 10px;
    padding: 10px;
    background: #fff;
    border: 1px solid #edf1f7;
    box-sizing: border-box;

    &.is-clickable {
      cursor: pointer;

      &:hover {
        border-color: #c9d8ff;
        box-shadow: 0 6px 16px rgba(28, 43, 76, 0.08);
      }
    }
  }

  .product-thumb {
    flex-shrink: 0;
    width: 84px;
    height: 84px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #eef3fb;
    font-size: 28px;

    .product-thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .product-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }

  .product-row-name {
    font-size: 15px;
    font-weight: 700;
    color: #172033;
    line-height: 1.35;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    word-break: break-word;
  }

  .product-row-sub {
    color: #8b95a7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .product-row-foot {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 2px;
  }

  .product-row-price {
    font-size: 16px;
    font-weight: 800;
    color: #E53935;
  }

  .product-row-rate,
  .product-row-sales {
    color: #8b95a7;
  }

  .product-card {
    /* 🔴 position: relative 是角标定位的前提 —— 少了它角标会相对整个卡片列表定位，
       跑到画布左上角去（这种问题肉眼一看就知道，但静态读代码很难发现）。 */
    position: relative;
    background: #fff;
    border: 1px solid #edf1f7;
    border-radius: var(--card-radius, 12px);
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(28, 43, 76, 0.06);

    &.is-clickable {
      cursor: pointer;

      &:hover {
        border-color: #c9d8ff;
        box-shadow: 0 8px 18px rgba(28, 43, 76, 0.1);
      }
    }

    .product-img {
      position: relative;
      width: 100%;
      aspect-ratio: 16 / 9;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f1f5fb;

      .product-cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .product-img-ph {
        font-size: 32px;
      }
    }

    .product-info {
      padding: 6px;

      .product-name {
        font-size: 14px;
        font-weight: 700;
        color: #172033;
        line-height: 1.35;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        overflow: hidden;
        word-break: break-word;
      }

      .product-bottom {
        display: flex;
        align-items: center;
        margin-top: 4px;
      }

      .product-meta-row {
        min-width: 0;
        flex: 1;
        display: flex;
        align-items: baseline;
        gap: 8px;
        overflow: hidden;
      }

      .product-price {
        flex-shrink: 0;
        color: #E53935;
        font-size: 13px;
        font-weight: 700;
      }

      .product-sales {
        min-width: 0;
        color: #909399;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }
  }
}
</style>
