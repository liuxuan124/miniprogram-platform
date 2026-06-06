<template>
  <component
    :is="BaseRenderer"
    :index="index"
    :selected="selected"
    :label="ComponentTypeLabels[component.type] || component.type"
    :style="component.style"
    @select="$emit('select')"
    @delete="$emit('delete')"
    @copy="$emit('copy')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <component
      :is="rendererMap[component.type]"
      :component="component"
      :preview-mode="previewMode"
      @preview-action="(payload: any) => $emit('preview-action', payload)"
    />
  </component>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'
import BaseRenderer from './renderers/BaseRenderer.vue'

defineProps<{
  component: ComponentInstance
  index: number
  selected: boolean
  previewMode?: boolean
}>()

defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

const rendererMap: Record<string, any> = {
  [ComponentType.Banner]: defineAsyncComponent(() => import('./renderers/BannerRenderer.vue')),
  [ComponentType.Search]: defineAsyncComponent(() => import('./renderers/SearchRenderer.vue')),
  [ComponentType.NoticeBar]: defineAsyncComponent(() => import('./renderers/NoticeBarRenderer.vue')),
  [ComponentType.Image]: defineAsyncComponent(() => import('./renderers/ImageRenderer.vue')),
  [ComponentType.Nav]: defineAsyncComponent(() => import('./renderers/NavRenderer.vue')),
  [ComponentType.CategoryNav]: defineAsyncComponent(() => import('./renderers/CategoryNavRenderer.vue')),
  [ComponentType.ProductList]: defineAsyncComponent(() => import('./renderers/ProductListRenderer.vue')),
  [ComponentType.FlashSale]: defineAsyncComponent(() => import('./renderers/FlashSaleRenderer.vue')),
  [ComponentType.ArticleList]: defineAsyncComponent(() => import('./renderers/ArticleListRenderer.vue')),
  [ComponentType.ActivityEntry]: defineAsyncComponent(() => import('./renderers/ActivityEntryRenderer.vue')),
  [ComponentType.ActivityList]: defineAsyncComponent(() => import('./renderers/ActivityListRenderer.vue')),
  [ComponentType.AppointmentService]: defineAsyncComponent(() => import('./renderers/AppointmentServiceRenderer.vue')),
  [ComponentType.MemberCard]: defineAsyncComponent(() => import('./renderers/MemberCardRenderer.vue')),
  [ComponentType.Coupon]: defineAsyncComponent(() => import('./renderers/CouponRenderer.vue')),
  [ComponentType.Video]: defineAsyncComponent(() => import('./renderers/VideoRenderer.vue')),
  [ComponentType.BrandIntro]: defineAsyncComponent(() => import('./renderers/BrandIntroRenderer.vue')),
  [ComponentType.ImageText]: defineAsyncComponent(() => import('./renderers/ImageTextRenderer.vue')),
  [ComponentType.ContactInfo]: defineAsyncComponent(() => import('./renderers/ContactInfoRenderer.vue')),
  [ComponentType.Certificate]: defineAsyncComponent(() => import('./renderers/CertificateRenderer.vue')),
  [ComponentType.Countdown]: defineAsyncComponent(() => import('./renderers/CountdownRenderer.vue')),
  [ComponentType.FloatButton]: defineAsyncComponent(() => import('./renderers/FloatButtonRenderer.vue')),
  [ComponentType.RichText]: defineAsyncComponent(() => import('./renderers/RichTextRenderer.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./renderers/SectionTitleRenderer.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./renderers/DividerRenderer.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./renderers/SpacerRenderer.vue')),
  [ComponentType.FormEntry]: defineAsyncComponent(() => import('./renderers/FormEntryRenderer.vue')),
  [ComponentType.AIEntry]: defineAsyncComponent(() => import('./renderers/AIEntryRenderer.vue')),
}
</script>
