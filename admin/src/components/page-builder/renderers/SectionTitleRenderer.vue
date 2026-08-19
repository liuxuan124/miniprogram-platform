<template>
  <div
    class="render-section-title"
    :class="[`align-${align}`, { 'has-more': showMore }]"
    :style="rootStyle"
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
import { ElMessage } from 'element-plus'
import type { ComponentInstance } from '@/types/page'
import { resolvePreviewLinkAction, runPreviewLinkAction } from '@/utils/preview-link'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: {
    tab: string
    message: string
    detailType?: string
    detailTitle?: string
    detailDesc?: string
    productId?: string | number
    previewPath?: string
  }]
}>()

function clampPad(v: unknown, fallback: number) {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.min(n, 48)) : fallback
}

const rootStyle = computed(() => ({
  paddingTop: `${clampPad(props.component.props?.padding_top, 4)}px`,
  paddingBottom: `${clampPad(props.component.props?.padding_bottom, 8)}px`,
}))

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
  const link = moreLink.value
  if (!link) {
    ElMessage.warning('未配置跳转链接')
    return
  }
  if (!props.previewMode) {
    ElMessage.info(`已配置跳转：${link}`)
    return
  }
  const action = resolvePreviewLinkAction(
    { link_type: 'page', link_url: link },
    moreText.value,
  )
  if (!action) {
    ElMessage.warning('未配置跳转链接')
    return
  }
  const message = runPreviewLinkAction(action, (payload) => emit('preview-action', payload))
  if (message) ElMessage.info(message)
}
</script>

<style lang="scss" scoped>
.render-section-title {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding-left: 2px;
  padding-right: 2px;
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
