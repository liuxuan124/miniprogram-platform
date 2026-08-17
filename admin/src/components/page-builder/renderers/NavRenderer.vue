<template>
  <div
    class="render-nav"
    :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
  >
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
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const columns = computed(() => {
  const n = Number(props.component.props?.columns || 4)
  return n >= 3 && n <= 5 ? n : 4
})

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
  padding: 6px 0;
  background: #fff;

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;

    .nav-icon {
      width: auto;
      height: auto;
      min-height: 28px;
      border-radius: 0;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;

      span {
        font-size: 26px;
        line-height: 1;
      }

      .nav-icon-img {
        width: 28px;
        height: 28px;
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
