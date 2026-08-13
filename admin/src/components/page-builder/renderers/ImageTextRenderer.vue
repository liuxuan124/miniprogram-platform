<template>
  <div class="render-image-text split-text-typography" :class="`layout-${component.props.layout || 'left-image'}`" :style="cardStyle">
    <div class="image-box">
      <img v-if="imageUrl" :src="imageUrl" alt="" class="image-real" />
      <span v-else>📷</span>
    </div>
    <div class="text-box">
      <div class="title" :style="titleStyle">{{ component.props.title || '图文组合' }}</div>
      <div class="desc" :style="descStyle">{{ component.props.content || '请输入图文说明' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { normalizeUploadUrl } from '@/api/system'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const imageUrl = computed(() => normalizeUploadUrl(props.component.props?.image || ''))
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 13))
const descStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))

// 圆角以样式面板为准（显式 0 生效），未设置时用默认 10；背景色同样跟随样式面板
const cardStyle = computed<Record<string, string>>(() => {
  const styleRadius = props.component.style?.border_radius
  const radius = styleRadius === undefined || styleRadius === null ? 10 : Number(styleRadius)
  const style: Record<string, string> = { borderRadius: `${radius}px` }
  if (props.component.style?.background_color) {
    style.background = props.component.style.background_color
  }
  return style
})

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-image-text {
  display: grid;
  grid-template-columns: 86px 1fr;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #e6edf6;

  &.layout-right-image {
    grid-template-columns: 1fr 86px;

    .image-box {
      order: 2;
    }

    .text-box {
      order: 1;
    }
  }

  &.layout-top-image {
    grid-template-columns: 1fr;
  }

  &.layout-three-card {
    grid-template-columns: repeat(3, 1fr);
  }

  .image-box {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 70px;
    font-size: 24px;
    background: #f1f5fb;
    border-radius: 8px;
    overflow: hidden;

    .image-real {
      width: 100%;
      height: 100%;
      min-height: 70px;
      object-fit: cover;
      display: block;
    }
  }

  .text-box {
    .title {
      color: #1e293b;
      font-size: 13px;
      font-weight: 700;
    }

    .desc {
      margin-top: 4px;
      color: #64748b;
      font-size: 11px;
      line-height: 1.6;
    }
  }
}
</style>
