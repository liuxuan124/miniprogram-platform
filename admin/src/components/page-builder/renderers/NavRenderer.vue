<template>
  <div
    class="render-nav"
    :class="{ 'render-nav--frame': showFrame }"
    :style="frameStyle"
  >
    <div
      class="render-nav__grid"
      :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }"
    >
      <div
        v-for="(item, i) in (component.props.items || [])"
        :key="i"
        class="nav-item"
      >
        <div class="nav-icon" :class="{ 'nav-icon--img': isImageIcon(item.icon) }">
          <img v-if="isImageIcon(item.icon)" :src="item.icon" alt="" class="nav-icon-img" />
          <span v-else>{{ item.icon || '▦' }}</span>
        </div>
        <span class="nav-text">{{ item.title }}</span>
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

const columns = computed(() => {
  const n = Number(props.component.props?.columns || 4)
  return n >= 3 && n <= 5 ? n : 4
})

const showFrame = computed(() => props.component.props?.show_frame !== false)

const frameStyle = computed(() => {
  if (!showFrame.value) return {}
  const radius = Number(props.component.props?.frame_radius)
  const r = Number.isFinite(radius) ? Math.max(0, Math.min(radius, 40)) : 16
  const bg = props.component.props?.frame_bg || '#ffffff'
  return {
    background: String(bg),
    borderRadius: `${r}px`,
  }
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
  padding: 10px 4px 6px;
  background: transparent;

  &--frame {
    padding: 14px 8px 10px;
    border: 1px solid #edf1f7;
    box-shadow: 0 4px 14px rgba(28, 43, 76, 0.06);
  }

  &__grid {
    display: grid;
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 4px 0;

    .nav-icon {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: transparent;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 6px;
      overflow: hidden;

      span {
        font-size: 22px;
        line-height: 1;
      }

      .nav-icon-img {
        width: 48px;
        height: 48px;
        object-fit: contain;
        display: block;
      }
    }

    .nav-text {
      font-size: 11px;
      color: #4b5563;
    }
  }
}
</style>
