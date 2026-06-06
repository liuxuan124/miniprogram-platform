<template>
  <div class="render-product-list">
    <div v-if="component.props.title" class="section-title">{{ component.props.title }}</div>
    <div class="product-grid" :class="`cols-${component.props.columns || 2}`">
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
          <div class="product-name">{{ item.name }}</div>
          <div class="product-price">¥{{ item.price }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

type PreviewProductItem = {
  id?: number
  name: string
  price: string
  image?: string
}

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const visibleProductItems = computed<PreviewProductItem[]>(() => {
  const limit = Math.max(Number(props.component.props?.limit || 4), 1)
  return [
    { name: '湘品甄选礼盒', price: '99.00' },
    { name: '药食同源组合', price: '99.00' },
    { name: '品牌文创礼盒', price: '99.00' },
    { name: '品牌定制马克杯', price: '99.00' },
  ].slice(0, limit)
})
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

  .product-grid {
    display: grid;
    gap: 8px;

    &.cols-2 {
      grid-template-columns: repeat(2, 1fr);
    }

    &.cols-3 {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .product-card {
    background: #fff;
    border: 1px solid #edf1f7;
    border-radius: 12px;
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

      .product-price {
        font-size: 13px;
        color: #f56c6c;
        font-weight: 600;
        margin-top: 2px;
      }
    }
  }
}
</style>
