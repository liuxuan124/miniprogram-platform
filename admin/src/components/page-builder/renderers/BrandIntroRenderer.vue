<template>
  <div
    class="render-brand-intro split-text-typography"
    :class="[`logo-${logoPosition}`, `align-${contentAlign}`]"
  >
    <div v-if="logoUrl" class="logo-wrap" :style="logoBoxStyle">
      <img :src="logoUrl" alt="logo" class="logo" :style="logoImgStyle" />
    </div>
    <div class="text-wrap" :style="textBoxStyle">
      <div class="title" :style="titleStyle">{{ component.props.title || '品牌介绍' }}</div>
      <div v-if="component.props.subtitle" class="subtitle" :style="subtitleStyle">{{ component.props.subtitle }}</div>
      <div class="desc" :style="descStyle">{{ component.props.desc || '请输入品牌介绍内容' }}</div>
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

const logoUrl = computed(() => normalizeUploadUrl(String(props.component.props?.logo || '')))
const logoPosition = computed(() => {
  const raw = String(props.component.props?.logo_position || 'top')
  return raw === 'left' || raw === 'right' ? raw : 'top'
})
const contentAlign = computed(() => {
  const raw = String(props.component.props?.content_align || 'left')
  return raw === 'center' || raw === 'right' ? raw : 'left'
})

const logoBoxStyle = computed(() => {
  const x = Number(props.component.props?.logo_offset_x || 0)
  const y = Number(props.component.props?.logo_offset_y || 0)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const logoImgStyle = computed(() => {
  const size = Number(props.component.props?.logo_size ?? 48)
  return {
    width: `${size}px`,
    height: `${size}px`,
  }
})

const textBoxStyle = computed(() => {
  const x = Number(props.component.props?.text_offset_x || 0)
  const y = Number(props.component.props?.text_offset_y || 0)
  return {
    transform: `translate(${x}px, ${y}px)`,
  }
})

const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const subtitleStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 11))
const descStyle = computed(() => titleFontStyle(props.component.props?.desc_font_size, 12))

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-brand-intro {
  display: flex;
  gap: 12px;
  padding: 12px;
  color: #fff;
  background: linear-gradient(135deg, #0f172a, #1e3a8a);
  border-radius: var(--card-radius, 10px);

  &.logo-top {
    flex-direction: column;
  }

  &.logo-left {
    flex-direction: row;
    align-items: flex-start;
  }

  &.logo-right {
    flex-direction: row-reverse;
    align-items: flex-start;
  }

  &.align-left {
    text-align: left;

    .logo-wrap {
      align-self: flex-start;
    }
  }

  &.align-center {
    text-align: center;

    &.logo-top .logo-wrap {
      align-self: center;
    }
  }

  &.align-right {
    text-align: right;

    &.logo-top .logo-wrap {
      align-self: flex-end;
    }
  }

  .logo-wrap {
    flex-shrink: 0;
  }

  .logo {
    object-fit: contain;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.12);
    display: block;
  }

  .text-wrap {
    flex: 1;
    min-width: 0;
  }

  .title {
    font-size: 15px;
    font-weight: 800;
  }

  .subtitle {
    margin-top: 4px;
    font-size: 11px;
    opacity: 0.85;
  }

  .desc {
    margin-top: 8px;
    font-size: 12px;
    line-height: 1.6;
    opacity: 0.92;
  }
}
</style>
