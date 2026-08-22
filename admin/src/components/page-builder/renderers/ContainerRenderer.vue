<template>
  <div class="render-container" :style="boxStyle">
    <div v-if="component.props?.title" class="render-container__title">{{ component.props.title }}</div>
    <div class="render-container__body" :class="`is-${layout}`" :style="bodyStyle">
      <template v-if="children.length">
        <div
          v-for="child in children"
          :key="child.id"
          class="render-container__slot"
          :style="slotStyle"
        >
          <component :is="resolveRenderer(child.type)" :component="child" :preview-mode="previewMode" />
        </div>
      </template>
      <div v-else class="render-container__empty">容器 · {{ layoutLabel }} · 在右侧添加子组件</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType } from '@/types/page'
import UnknownComponentRenderer from './UnknownComponentRenderer.vue'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const layout = computed(() => String(props.component.props?.layout || 'row'))
const layoutLabel = computed(() => {
  const map: Record<string, string> = { row: '横向', grid: '网格', stack: '纵向', scroll: '横滑' }
  return map[layout.value] || layout.value
})
const children = computed(() => props.component.children || [])
const columns = computed(() => Math.max(Number(props.component.props?.columns) || 2, 1))
const gap = computed(() => Number(props.component.props?.gap) || 12)

const boxStyle = computed(() => ({
  background: props.component.props?.background_color || 'transparent',
}))

const bodyStyle = computed(() => ({
  gap: `${gap.value}px`,
}))

const slotStyle = computed(() => {
  if (layout.value === 'grid') {
    return { width: `calc(${100 / columns.value}% - ${gap.value}px)` }
  }
  if (layout.value === 'row' || layout.value === 'scroll') {
    return { flex: '1 1 0', minWidth: layout.value === 'scroll' ? '140px' : '0' }
  }
  return { width: '100%' }
})

const rendererMap: Record<string, any> = {
  [ComponentType.Image]: defineAsyncComponent(() => import('./ImageRenderer.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./RichTextRenderer.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./SectionTitleRenderer.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./DividerRenderer.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./SpacerRenderer.vue')),
  [ComponentType.Banner]: defineAsyncComponent(() => import('./BannerRenderer.vue')),
  [ComponentType.FeatureCards]: defineAsyncComponent(() => import('./FeatureCardsRenderer.vue')),
}

function resolveRenderer(type: string) {
  return rendererMap[type] || UnknownComponentRenderer
}
</script>

<style scoped>
.render-container {
  padding: 8px;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #fafbfc;
}
.render-container__title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #172033;
}
.render-container__body {
  display: flex;
  min-height: 56px;
}
.render-container__body.is-stack { flex-direction: column; }
.render-container__body.is-grid { flex-wrap: wrap; }
.render-container__body.is-scroll { overflow-x: auto; flex-wrap: nowrap; }
.render-container__slot {
  box-sizing: border-box;
  min-width: 0;
}
.render-container__empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  font-size: 12px;
  padding: 16px;
}
</style>
