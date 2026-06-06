<template>
  <div class="render-flash-sale">
    <div class="flash-header">
      <span class="title">{{ component.props.title || '限时秒杀' }}</span>
      <span class="tag">进行中</span>
    </div>
    <div class="flash-grid">
      <div v-for="(item, idx) in flashSaleItems" :key="`flash-${idx}`" class="flash-item">
        <div class="flash-img">🔥</div>
        <div class="flash-name">{{ item.name }}</div>
        <div class="flash-price">¥{{ item.price }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const flashSaleItems = computed<Array<{ name: string; price: string }>>(() => {
  const limit = Math.max(Number(props.component.props?.limit || 4), 1)
  return [
    { name: '限时爆款A', price: '69.00' },
    { name: '限时爆款B', price: '89.00' },
    { name: '限时爆款C', price: '129.00' },
    { name: '限时爆款D', price: '199.00' },
  ].slice(0, limit)
})
</script>

<style lang="scss" scoped>
.render-flash-sale {
  margin: 10px;
  padding: 10px;
  background: linear-gradient(180deg, #fff7ed, #ffffff);
  border: 1px solid #fed7aa;
  border-radius: 10px;

  .flash-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;

    .title {
      color: #9a3412;
      font-size: 14px;
      font-weight: 800;
    }

    .tag {
      padding: 2px 6px;
      color: #fff;
      font-size: 10px;
      background: #ea580c;
      border-radius: 999px;
    }
  }

  .flash-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }

  .flash-item {
    padding: 8px;
    background: #fff;
    border: 1px solid #fde5d2;
    border-radius: 8px;

    .flash-img {
      text-align: center;
      font-size: 20px;
    }

    .flash-name {
      margin-top: 4px;
      color: #475569;
      font-size: 11px;
    }

    .flash-price {
      margin-top: 2px;
      color: #dc2626;
      font-size: 13px;
      font-weight: 700;
    }
  }
}
</style>
