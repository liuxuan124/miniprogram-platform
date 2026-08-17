<template>
  <div class="render-product-list split-text-typography" :class="{ 'render-product-list--preview': previewMode }">
    <div
      v-if="sectionTitle"
      class="section-header"
      :class="[
        `style-${sectionStyle}`,
        `align-${sectionAlign}`,
        { 'has-divider': sectionDivider },
      ]"
    >
      <div v-if="sectionStyle === 'bar'" class="section-header__bars" aria-hidden="true">
        <span class="section-header__bar section-header__bar--down" />
        <span class="section-header__bar section-header__bar--up" />
      </div>
      <div class="section-header__text">
        <div class="section-header__main" :style="sectionTitleStyle">{{ sectionTitle }}</div>
        <div v-if="sectionSubtitle" class="section-header__sub" :style="sectionSubtitleStyle">{{ sectionSubtitle }}</div>
      </div>
      <span
        v-if="showMore"
        class="section-header__more"
        :style="sectionMoreStyle"
        @click.stop="onMoreClick"
      >{{ moreText }}</span>
    </div>
    <div v-if="showFailState" class="preview-data-empty preview-data-fail">
      {{ failMessage }}
    </div>
    <div v-else-if="showEmptyState" class="preview-data-empty">
      {{ previewMode ? '暂无商品数据，请确认商品已上架或稍后重试' : '当前筛选下没有已上架商品' }}
    </div>
    <div v-else-if="!previewMode && liveLoading" class="preview-data-empty">正在读取已上架商品…</div>
    <div v-else class="product-grid" :class="[`layout-${productLayout}`, `cols-${columnCount}`]">
      <div
        v-for="(item, idx) in visibleProductItems"
        :key="`${item.id || 'p'}-${idx}`"
        class="product-card"
      >
        <div class="product-img">
          <img v-if="item.image" :src="item.image" alt="" class="product-cover" />
          <span v-else>🛍️</span>
        </div>
        <div class="product-info">
          <div class="product-name" :style="itemTitleStyle">{{ item.name }}</div>
          <div class="product-bottom">
            <div class="product-meta-row">
              <span v-if="showPrice" class="product-price" :style="priceStyle">¥{{ item.price }}</span>
              <span v-if="showSales" class="product-sales" :style="salesStyle">已售{{ item.sales }}</span>
            </div>
            <button
              v-if="showCart"
              type="button"
              class="cart-btn"
              aria-label="加入购物车"
              @click.stop="onCartClick(item)"
            >
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'
import { useEditorLiveItems } from '../composables/useEditorLiveItems'

type PreviewProductItem = {
  id?: number | string
  name: string
  price: string
  sales: number
  image?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const showPrice = computed(() => props.component.props?.show_price !== false)
const showSales = computed(() => props.component.props?.show_sales !== false)
const showCart = computed(() => props.component.props?.show_cart !== false)
const titleBold = computed(() => props.component.props?.title_bold !== false)
const sectionTitle = computed(() => String(props.component.props?.title ?? '').trim())
const sectionSubtitle = computed(() => String(props.component.props?.subtitle ?? '').trim())
const sectionStyle = computed(() => {
  const raw = String(props.component.props?.section_style || 'bar')
  return ['bar', 'plain', 'card'].includes(raw) ? raw : 'bar'
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
  ...titleFontStyle(props.component.props?.title_font_size, 14),
  fontWeight: titleBold.value ? '700' : '400',
}))
const priceStyle = computed(() => ({
  ...titleFontStyle(
    props.component.props?.price_font_size ?? props.component.props?.subtitle_font_size,
    13,
  ),
  color: props.component.props?.price_color || '#E53935',
}))
const salesStyle = computed(() => titleFontStyle(
  props.component.props?.sales_font_size ?? props.component.props?.subtitle_font_size,
  11,
))

const { items: liveItems, loading: liveLoading } = useEditorLiveItems(
  () => props.component,
  () => !!props.previewMode,
)

const DEMO_PRODUCTS: PreviewProductItem[] = [
  { id: 'demo-1', name: '跨境通用知识库', price: '199.00', sales: 128 },
  { id: 'demo-2', name: '跨境财税知识库', price: '299.00', sales: 86 },
]

const showFailState = computed(() => false)

const failMessage = computed(() =>
  props.previewMode
    ? '商品数据加载失败，请确认接口可用或稍后重试'
    : '商品数据请求失败，请检查网络或数据源配置',
)

const showEmptyState = computed(() => false)

function formatMoney(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return String(value ?? '0.00')
  return n.toFixed(2)
}

function normalizeItem(item: any): PreviewProductItem {
  const salesRaw = item.sales ?? item.salesCount ?? item.sold
  const sales = Number(salesRaw ?? 0)
  const price = item.price ?? item.min_price ?? item.minPrice ?? '0.00'
  return {
    id: item.id,
    name: item.name || item.title || '商品名称',
    price: formatMoney(price),
    sales: Number.isFinite(sales) ? sales : 0,
    image: item.image || item.cover || item.coverUrl || '',
  }
}

const visibleProductItems = computed<PreviewProductItem[]>(() => {
  const items = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit || 4), 1)
  const ids = Array.isArray(props.component.props?.product_ids)
    ? props.component.props.product_ids.map((id: any) => String(id))
    : []
  const manual = props.component.props?.source_mode === 'manual' || ids.length > 0

  if (props.previewMode) {
    if (manual && Array.isArray(items) && items.length) {
      const map = new Map(items.map((item: any) => [String(item.id), item]))
      const ordered = ids.length
        ? ids.map((id: string) => map.get(id)).filter(Boolean)
        : items
      return ordered.slice(0, limit).map(normalizeItem)
    }
    const source = Array.isArray(items) && items.length ? items : DEMO_PRODUCTS
    return source.slice(0, limit).map(normalizeItem)
  }

  if (manual && Array.isArray(items) && items.length) {
    const map = new Map(items.map((item: any) => [String(item.id), item]))
    const ordered = ids.length
      ? ids.map((id: string) => map.get(id)).filter(Boolean)
      : items
    if (ordered.length) return ordered.slice(0, limit).map(normalizeItem)
  }

  const live = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
  const source = live.length ? live : DEMO_PRODUCTS
  return source.slice(0, limit).map(normalizeItem)
})

function onCartClick(item: PreviewProductItem) {
  if (!props.previewMode) return
  ElMessage.success(`预览：已将「${item.name}」加入购物车`)
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
  background: #fff;
  padding: 10px;

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
      grid-template-columns: 1fr;

      .product-card {
        display: flex;
        flex-direction: row;

        .product-img {
          width: 100px;
          height: 75px;
          aspect-ratio: auto;
          flex-shrink: 0;
        }

        .product-info {
          flex: 1;
        }
      }
    }

    &.layout-waterfall {
      grid-template-columns: 1fr 1fr;

      .product-card:nth-child(odd) .product-img {
        aspect-ratio: 4 / 3;
        height: auto;
      }

      .product-card:nth-child(even) .product-img {
        aspect-ratio: 16 / 9;
        height: auto;
      }
    }
  }

  .product-card {
    background: #fff;
    border: 1px solid #edf1f7;
    border-radius: 0;
    overflow: hidden;

    .product-img {
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      background: #f1f5fb;

      .product-cover {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .product-info {
      padding: 6px;

      .product-name {
        font-size: 14px;
        font-weight: 700;
        color: #172033;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .product-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
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
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .cart-btn {
        flex-shrink: 0;
        width: 26px;
        height: 26px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        font-size: 14px;
        background: #fff5f5;
        border: 1px solid #fecaca;
        border-radius: 50%;
        cursor: pointer;

        &:hover {
          background: #fee2e2;
        }
      }
    }
  }
}
</style>
