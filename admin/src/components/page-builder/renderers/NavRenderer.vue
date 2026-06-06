<template>
  <div class="render-nav">
    <div
      v-for="(item, i) in (component.props.items || [])"
      :key="i"
      class="nav-item"
    >
      <div class="nav-icon">
        <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="nav-icon-img" />
        <span v-else>{{ item.icon || '▦' }}</span>
      </div>
      <span class="nav-text">{{ item.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

function isImageIcon(icon?: string): boolean {
  if (!icon) return false
  return /^(https?:\/\/|\/|data:image|\.\/|\.\.\/)/i.test(icon.trim())
}
</script>

<style lang="scss" scoped>
.render-nav {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  padding: 12px 0;
  background: #fff;

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;

    .nav-icon {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #eef4ff;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;

      span {
        font-size: 18px;
      }

      .nav-icon-img {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }
    }

    .nav-text {
      font-size: 11px;
      color: #4b5563;
    }
  }
}
</style>
