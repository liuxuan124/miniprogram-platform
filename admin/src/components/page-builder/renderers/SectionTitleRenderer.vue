<template>
  <div class="render-section-title split-text-typography" :class="`align-${align}`">
    <div class="main" :style="mainStyle">{{ component.props.title || '栏目标题' }}</div>
    <div v-if="component.props.subtitle" class="sub" :style="subStyle">{{ component.props.subtitle }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const align = computed(() => {
  const raw = String(props.component.props?.align || 'left')
  return raw === 'center' ? 'center' : 'left'
})

const mainStyle = computed(() => ({
  fontSize: `${Number(props.component.props?.title_font_size ?? 17)}px`,
  color: props.component.props?.title_color || undefined,
}))

const subStyle = computed(() => ({
  fontSize: `${Number(props.component.props?.subtitle_font_size ?? 11)}px`,
  color: props.component.props?.subtitle_color || undefined,
}))
defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-section-title {
  padding-left: 8px;
  border-left: 3px solid var(--theme-primary, #1769ff);

  &.align-center {
    padding-left: 0;
    border-left: none;
    text-align: center;
  }

  .main {
    color: #172033;
    font-size: 17px;
    font-weight: 800;
  }

  .sub {
    margin-top: 2px;
    color: #7b8798;
    font-size: 11px;
  }
}</style>
