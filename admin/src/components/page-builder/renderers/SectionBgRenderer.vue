<template>
  <div class="render-section-bg" :style="boxStyle">
    <div v-if="component.props?.title" class="render-section-bg__title">{{ component.props.title }}</div>
    <div v-if="children.length" class="render-section-bg__body">
      <div v-for="child in children" :key="child.id" class="render-section-bg__child">
        <component :is="resolveRenderer(child.type)" :component="child" :preview-mode="previewMode" />
      </div>
    </div>
    <div v-else class="render-section-bg__hint">通栏背景 · 可在右侧添加子组件</div>
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

const children = computed(() => props.component.children || [])

const boxStyle = computed(() => {
  const p = props.component.props || {}
  const minH = Number(p.min_height) || 120
  const style: Record<string, string> = {
    minHeight: `${minH}px`,
    padding: '16px',
  }
  if (p.background_type === 'gradient') {
    style.background = `linear-gradient(180deg, ${p.gradient_from || '#F5F7FB'}, ${p.gradient_to || '#FFFFFF'})`
  } else if (p.background_type === 'image' && p.background_image) {
    style.backgroundImage = `url(${p.background_image})`
    style.backgroundSize = 'cover'
    style.backgroundPosition = 'center'
  } else {
    style.background = p.background_color || '#F5F7FB'
  }
  return style
})

const rendererMap: Record<string, any> = {
  [ComponentType.Image]: defineAsyncComponent(() => import('./ImageRenderer.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./RichTextRenderer.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./SectionTitleRenderer.vue')),
  [ComponentType.FeatureCards]: defineAsyncComponent(() => import('./FeatureCardsRenderer.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./SpacerRenderer.vue')),
}

function resolveRenderer(type: string) {
  return rendererMap[type] || UnknownComponentRenderer
}
</script>

<style scoped>
.render-section-bg {
  border-radius: 8px;
}
.render-section-bg__title {
  margin-bottom: 10px;
  font-size: 15px;
  font-weight: 700;
  color: #172033;
}
.render-section-bg__hint {
  color: #94a3b8;
  font-size: 12px;
  text-align: center;
  padding: 24px 0;
}
.render-section-bg__child + .render-section-bg__child {
  margin-top: 8px;
}
</style>
