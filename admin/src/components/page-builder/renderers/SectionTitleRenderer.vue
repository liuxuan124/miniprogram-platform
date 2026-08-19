<template>
  <div
    class="render-section-title"
    :class="[`align-${align}`, { 'has-more': showMore }]"
  >
    <div class="text">
      <div class="main" :style="mainStyle">{{ component.props.title || '分区标题' }}</div>
      <div v-if="component.props.subtitle" class="sub" :style="subStyle">{{ component.props.subtitle }}</div>
    </div>
    <span
      v-if="showMore"
      class="more"
      :style="moreStyle"
      @click.stop="onMoreClick"
    >{{ moreText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const align = computed(() => (String(props.component.props?.align || 'left') === 'center' ? 'center' : 'left'))
const showMore = computed(() => props.component.props?.show_more === true)
const moreText = computed(() => String(props.component.props?.more_text || '查看更多>').trim() || '查看更多>')
const moreLink = computed(() => String(props.component.props?.more_link || '').trim())

const mainStyle = computed(() => ({
  fontSize: `${Number(props.component.props?.title_font_size ?? 16)}px`,
  fontWeight: props.component.props?.title_bold === false ? '400' : '800',
  color: props.component.props?.title_color || '#172033',
}))

const subStyle = computed(() => ({
  fontSize: `${Number(props.component.props?.subtitle_font_size ?? 11)}px`,
  color: props.component.props?.subtitle_color || '#7b8798',
}))

const moreStyle = computed(() => ({
  color: props.component.props?.more_color || '#7b8798',
  fontSize: '12px',
}))

function onMoreClick() {
  if (!props.previewMode || !moreLink.value) return
  emit('preview-action', {
    tab: 'content',
    message: `跳转：${moreLink.value}`,
  })
}
</script>

<style lang="scss" scoped>
.render-section-title {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 2px 8px;
  background: transparent;

  &.align-center {
    justify-content: center;
    text-align: center;

    .more {
      position: absolute;
      right: 4px;
    }
  }

  &.align-center.has-more {
    position: relative;
  }

  .text {
    flex: 1;
    min-width: 0;
  }

  .main {
    color: #172033;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.3;
  }

  .sub {
    margin-top: 2px;
    color: #7b8798;
    font-size: 11px;
    line-height: 1.4;
  }

  .more {
    flex-shrink: 0;
    align-self: center;
    color: #7b8798;
    font-size: 12px;
    cursor: pointer;
    white-space: nowrap;
  }
}
</style>
