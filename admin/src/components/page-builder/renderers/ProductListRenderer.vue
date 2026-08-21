<template>
  <div class="render-product-list split-text-typography" :class="{ 'render-product-list--preview': previewMode }">
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showEmptyState" class="preview-data-empty">
      {{ previewMode ? '暂无商品数据，请确认商品已上架或稍后重试' : '当前筛选下没有已上架商品' }}
    </div>
    <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已上架商品…</div>
    <div v-else class="product-grid" :class="[`layout-${productLayout}`, `cols-${columnCount}`]" :style="{ gap: `${itemGap}px` }">
      <template v-if="productLayout === 'list'">
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
          </div>
          <div class="product-body">
            <div class="product-row-name" :style="itemTitleStyle">{{ item.name }}</div>
            <div class="product-row-sub" :style="salesStyle">{{ item.meta }}</div>
            <div class="product-row-foot">
              <span v-if="showPrice" class="product-row-price" :style="priceStyle">
                <template v-if="item.priceWithYuan">¥</template>{{ item.priceText }}
              </span>
              <span v-if="showRating" class="product-row-rate">{{ item.ratingLine }}</span>
              <span v-else-if="showSales" class="product-row-sales" :style="salesStyle">{{ item.salesLabel }}</span>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div
          v-for="(item, idx) in visibleProductItems"
          :key="`${item.id || 'p'}-${idx}`"
          class="product-card"
          :class="{ 'is-clickable': previewMode }"
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
          </div>
          <div class="product-info">
            <div class="product-name" :style="itemTitleStyle">{{ item.name }}</div>
            <div class="product-bottom">
              <div class="product-meta-row">
                <span v-if="showPrice" class="product-price" :style="priceStyle">
                  <template v-if="item.priceWithYuan">¥</template>{{ item.priceText }}
                </span>
                <span v-if="showSales" class="product-sales" :style="salesStyle">{{ item.salesLabel }}</span>
              </div>
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

type PreviewProductItem = {
  id?: number | string
  name: string
  price: string
  priceText: string
  priceWithYuan: boolean
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

const showPrice = computed(() => props.component.props?.show_price !== false)
const zeroPriceDisplay = computed(() =>
  props.component.props?.zero_price_display === 'free' ? 'free' : 'amount',
)
const showSales = computed(() => props.component.props?.show_sales !== false)
const showRating = computed(() => {
  if (productLayout.value === 'list') return props.component.props?.show_rating !== false
  return props.component.props?.show_rating === true
})
const itemGap = computed(() => {
  const n = Number(props.component.props?.item_gap)
  const fallback = productLayout.value === 'list' ? 10 : 8
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : fallback
})
const titleBold = computed(() => props.component.props?.title_bold !== false)
const sectionTitle = computed(() => String(props.component.props?.title ?? '').trim())
const sectionSubtitle = computed(() => String(props.component.props?.subtitle ?? '').trim())
const sectionStyle = computed(() => {
  const raw = String(props.component.props?.section_style || 'plain')
  return ['bar', 'plain', 'card'].includes(raw) ? raw : 'plain'
})
const sectionAlign = computed(() => (props.component.props?.section_align === 'center' ? 'center' : 'left'))
const sectionDivider = computed(() => props.component.props?.section_divider === true)
const showMore = computed(() => props.component.props?.show_more !== false)
const moreText = computed(() => String(props.component.props?.more_text || '查看更多>').trim() || '查看更多>')
const moreLink = computed(() =>
  String(props.component.props?.more_link || '/pages/product-list/product-list').trim()
  || '/pages/product-list/product-list',
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
  const fallback = isBand ? '#D4E2FF' : '#7b8798'
  const color = custom || fallback
  return {
    ...titleFontStyle(props.component.props?.section_subtitle_font_size, 11),
    color,
  }
})
const productLayout = computed(() => {
  const raw = String(props.component.props?.layout || 'grid')
  return ['grid', 'list', 'waterfall'].includes(raw) ? raw : 'grid'
})
const columnCount = computed(() => {
  if (productLayout.value === 'list') return 1
  if (productLayout.value === 'waterfall') return 2
  return Number(props.component.props?.columns || 2)
})
const itemTitleStyle = computed(() => ({
  ...titleFontStyle(
    props.component.props?.title_font_size,
    productLayout.value === 'list' ? 15 : 14,
  ),
  fontWeight: titleBold.value ? '700' : '400',
}))
const priceStyle = computed(() => ({
  ...titleFontStyle(
    props.component.props?.price_font_size ?? props.component.props?.subtitle_font_size,
    productLayout.value === 'list' ? 16 : 13,
  ),
  color: props.component.props?.price_color || '#E53935',
}))
const salesStyle = computed(() => titleFontStyle(
  props.component.props?.sales_font_size ?? props.component.props?.subtitle_font_size,
  11,
))
const itemCardStyle = computed(() => {
  const fromProp = props.component.props?.item_border_radius
  const fromStyle = props.component.style?.border_radius
  const fallback = productLayout.value === 'list' ? 14 : 12
  const hasStyleRadius = fromStyle !== undefined && fromStyle !== null && fromStyle !== ''
  const raw = hasStyleRadius
    ? fromStyle
    : (fromProp !== undefined && fromProp !== null && fromProp !== '' ? fromProp : fallback)
  const n = Number(raw)
  const radius = Number.isFinite(n) ? Math.max(0, n) : fallback
  return {
    borderRadius: `${radius}px`,
    boxShadow: '0 4px 12px rgba(28, 43, 76, 0.06)',
  }
})
const itemImageStyle = computed(() => {
  const fromProp = props.component.props?.image_border_radius
  const fallback = productLayout.value === 'list' ? 10 : 0
  const raw = fromProp !== undefined && fromProp !== null && fromProp !== ''
    ? fromProp
    : fallback
  const n = Number(raw)
  const radius = Number.isFinite(n) ? Math.max(0, n) : fallback
  return { borderRadius: `${radius}px` }
})

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

const DEMO_PRODUCTS: PreviewProductItem[] = [
  { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128 },
  { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86 },
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
  return {
    id: item.id,
    name: item.name || item.title || '商品名称',
    price: formatMoney(price),
    priceText: priceLabel.text,
    priceWithYuan: priceLabel.withYuan,
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
  const displayMode = props.component.props?.display_mode === 'stream' ? 'stream' : 'fixed'
  const cap = displayMode === 'stream'
    ? Math.max(Number(props.component.props?.page_size || 10), 5)
    : Math.max(Number(props.component.props?.limit || 4), 1)
  const ids = Array.isArray(props.component.props?.product_ids)
    ? props.component.props.product_ids.map((id: any) => String(id))
    : []
  const manual = props.component.props?.source_mode === 'manual' || ids.length > 0
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
    const manualCap = displayMode === 'stream' ? Math.max(ids.length, saved.length, 50) : cap
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
    ? '/pages/product-list/product-list'
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
      grid-template-columns: repeat(2, 1fr);
    }

    &.cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }

    &.layout-list {
      display: flex;
      flex-direction: column;
      grid-template-columns: 1fr;
    }

    &.layout-waterfall {
      grid-template-columns: 1fr 1fr;
    }
  }

  .product-row {
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
