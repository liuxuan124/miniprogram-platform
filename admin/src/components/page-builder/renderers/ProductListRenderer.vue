<template>
  <div class="render-product-list split-text-typography" :class="{ 'render-product-list--preview': previewMode }">
    <div v-if="component.props.title" class="section-title">{{ component.props.title }}</div>
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
            <div class="product-meta">
              <div v-if="showPrice" class="product-price" :style="itemMetaStyle">¥{{ item.price }}</div>
              <div v-if="showSales" class="product-sales" :style="itemMetaStyle">已售{{ item.sales }}</div>
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

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const showPrice = computed(() => props.component.props?.show_price !== false)
const showSales = computed(() => props.component.props?.show_sales !== false)
const showCart = computed(() => props.component.props?.show_cart !== false)
const productLayout = computed(() => {
  const raw = String(props.component.props?.layout || 'grid')
  return ['grid', 'list', 'waterfall'].includes(raw) ? raw : 'grid'
})
const columnCount = computed(() => {
  if (productLayout.value === 'list') return 1
  if (productLayout.value === 'waterfall') return 2
  return Number(props.component.props?.columns || 2)
})
const itemTitleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 12))
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
    ? '商品数据加载失败，请确认接口可用或稍后重试'
    : '商品数据请求失败，请检查网络或数据源配置',
)

const showEmptyState = computed(() => {
  if (showFailState.value) return false
  if (props.previewMode) {
    const items = props.component.props?.items
    return !Array.isArray(items) || items.length === 0
  }
  return !liveLoading.value && liveEmpty.value
})

function normalizeItem(item: any, index: number): PreviewProductItem {
  const salesRaw = item.sales ?? item.salesCount ?? item.sold
  const sales = Number(salesRaw ?? 0)
  return {
    id: item.id,
    name: item.name || item.title || '商品名称',
    price: String(item.price ?? '0.00'),
    sales: Number.isFinite(sales) ? sales : 0,
    image: item.image || item.cover || item.coverUrl || '',
  }
}

const visibleProductItems = computed<PreviewProductItem[]>(() => {
  const items = props.component.props?.items
  const limit = Math.max(Number(props.component.props?.limit || 4), 1)

  if (props.previewMode) {
    if (!Array.isArray(items) || items.length === 0) return []
    return items.slice(0, limit).map(normalizeItem)
  }

  const source = liveItems.value.length ? liveItems.value : (Array.isArray(items) ? items : [])
  return source.slice(0, limit).map(normalizeItem)
})

function onCartClick(item: PreviewProductItem) {
  if (!props.previewMode) return
  ElMessage.success(`预览：已将「${item.name}」加入购物车`)
}
</script>

<style lang="scss" scoped>
.render-product-list {
  background: #fff;
  padding: 10px;

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
          width: 92px;
          height: 92px;
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
        height: 118px;
      }

      .product-card:nth-child(even) .product-img {
        height: 78px;
      }
    }
  }

  .product-card {
    background: #fff;
    border: 1px solid #edf1f7;
    border-radius: var(--card-radius, 12px);
    overflow: hidden;

    .product-img {
      height: 92px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 30px;
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
        font-size: 12px;
        color: #303133;
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

      .product-meta {
        min-width: 0;
        flex: 1;
      }

      .product-price {
        font-size: 13px;
        color: #f56c6c;
        font-weight: 600;
      }

      .product-sales {
        margin-top: 2px;
        font-size: 10px;
        color: #909399;
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
