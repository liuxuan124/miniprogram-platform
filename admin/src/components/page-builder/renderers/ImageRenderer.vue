<template>
  <div class="render-image" :style="imageBoxStyle">
    <img v-if="component.props.image" :src="component.props.image" alt="" class="single-image" />
    <div v-else class="image-placeholder">
      <span>📷</span>
      <em>{{ component.props.title || '图片' }}</em>
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

const imageBoxStyle = computed<Record<string, string>>(() => {
  const styleRadius = Number(props.component.style?.border_radius ?? 0)
  const propRadius = Number(props.component.props?.border_radius ?? 8)
  const radius = styleRadius > 0 ? styleRadius : propRadius
  return {
    borderRadius: `${radius}px`,
  }
})
</script>

<style lang="scss" scoped>
.render-image {
  height: 150px;
  margin: 10px;
  overflow: hidden;
  background: #f1f5fb;

  .single-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #8a94a6;

    span {
      font-size: 30px;
      line-height: 1.2;
    }

    em {
      margin-top: 5px;
      font-size: 12px;
      font-style: normal;
    }
  }
}
</style>
