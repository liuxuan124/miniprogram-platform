<template>
  <!-- 贴角浮层：不走 BaseRenderer，选中时在圆钮旁显示工具条 -->
  <div v-if="fabOnly" class="fab-only-wrap" :class="{ selected }">
    <div v-if="selected" class="fab-toolbar" @click.stop>
      <span class="fab-toolbar__label">{{ ComponentTypeLabels[component.type] || '悬浮按钮' }}</span>
      <el-button text size="small" :disabled="index === 0" @click.stop="$emit('move-up')">
        <el-icon><Top /></el-icon>
      </el-button>
      <el-button text size="small" @click.stop="$emit('move-down')">
        <el-icon><Bottom /></el-icon>
      </el-button>
      <el-button text size="small" @click.stop="$emit('copy')">
        <el-icon><CopyDocument /></el-icon>
      </el-button>
      <el-button text size="small" type="danger" @click.stop="$emit('delete')">
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>
    <component
      :is="resolveRenderer(component.type)"
      :component="component"
      :preview-mode="previewMode"
      :fab-only="true"
      :selected="selected"
      @preview-action="(payload: any) => $emit('preview-action', payload)"
      @select-hint="$emit('select')"
    />
  </div>
  <component
    v-else
    :is="BaseRenderer"
    :index="index"
    :selected="selected"
    :label="ComponentTypeLabels[component.type] || component.type"
    :component-style="component.style"
    :stack-on-top="component.type === ComponentType.Nav || component.type === ComponentType.ProductList || component.type === ComponentType.BrandHeader"
    :toolbar-always-below="component.type === ComponentType.BrandHeader"
    @select="$emit('select')"
    @delete="$emit('delete')"
    @copy="$emit('copy')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
  >
    <component
      :is="resolveRenderer(component.type)"
      :component="component"
      :preview-mode="previewMode"
      @preview-action="(payload: any) => $emit('preview-action', payload)"
    />
  </component>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { Top, Bottom, CopyDocument, Delete } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'
import BaseRenderer from './renderers/BaseRenderer.vue'
import UnknownComponentRenderer from './renderers/UnknownComponentRenderer.vue'

defineProps<{
  component: ComponentInstance
  index: number
  selected: boolean
  previewMode?: boolean
  fabOnly?: boolean
}>()

defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
  'preview-action': [payload: {
    tab: string
    message: string
    detailType?: string
    detailTitle?: string
    detailDesc?: string
    formId?: string
    productId?: string | number
  }]
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
  [ComponentType.ArticleFeed]: defineAsyncComponent(() => import('./renderers/ArticleFeedRenderer.vue')),
  [ComponentType.NoteFeed]: defineAsyncComponent(() => import('./renderers/NoteFeedRenderer.vue')),
  [ComponentType.MomentsFeed]: defineAsyncComponent(() => import('./renderers/MomentsFeedRenderer.vue')),
  [ComponentType.HotNews]: defineAsyncComponent(() => import('./renderers/HotNewsRenderer.vue')),
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
  [ComponentType.JoinGroup]: defineAsyncComponent(() => import('./renderers/JoinGroupRenderer.vue')),
  [ComponentType.BrandHeader]: defineAsyncComponent(() => import('./renderers/BrandHeaderRenderer.vue')),
}

const warnedUnknownTypes = new Set<string>()

function resolveRenderer(type: string) {
  if (rendererMap[type]) return rendererMap[type]
  if (!warnedUnknownTypes.has(type)) {
    warnedUnknownTypes.add(type)
    console.warn(`[page-builder] 未知组件 type "${type}"，画布以占位展示，小程序端将跳过渲染`)
  }
  return UnknownComponentRenderer
}
</script>

<style scoped>
.fab-only-wrap {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.fab-toolbar {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  color: #fff;
  background: rgba(23, 32, 51, 0.94);
  border-radius: 8px;
  transform: translateX(-50%);
  pointer-events: auto;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.25);
}

.fab-toolbar__label {
  margin-right: 6px;
  font-size: 12px;
  white-space: nowrap;
}

.fab-toolbar :deep(.el-button) {
  color: #fff;
}
</style>
