<template>
  <!-- 贴角浮层：不走 BaseRenderer，选中时在圆钮旁显示工具条 -->
  <div v-if="fabOnly" class="fab-only-wrap" :class="{ selected }">
    <div v-if="selected" class="fab-toolbar" @click.stop>
      <span class="fab-toolbar__label">{{ ComponentTypeLabels[component.type] || '悬浮按钮' }}</span>
      <el-tooltip content="上移" placement="left" :show-after="300">
        <el-button text size="small" aria-label="上移" :disabled="index === 0" @click.stop="$emit('move-up')">
          <el-icon><Top /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="下移" placement="left" :show-after="300">
        <el-button text size="small" aria-label="下移" @click.stop="$emit('move-down')">
          <el-icon><Bottom /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="复制" placement="left" :show-after="300">
        <el-button text size="small" aria-label="复制" @click.stop="$emit('copy')">
          <el-icon><CopyDocument /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="删除" placement="left" :show-after="300">
        <el-button text size="small" type="danger" aria-label="删除" @click.stop="$emit('delete')">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
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
    :stack-on-top="component.type === ComponentType.Nav || component.type === ComponentType.Banner || component.type === ComponentType.ProductList || component.type === ComponentType.BrandHeader"
    :toolbar-always-below="component.type === ComponentType.BrandHeader || component.type === ComponentType.Nav || component.type === ComponentType.Banner"
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
  [ComponentType.ContentPaywall]: defineAsyncComponent(() => import('./renderers/ContentPaywallRenderer.vue')),
  [ComponentType.MaterialList]: defineAsyncComponent(() => import('./renderers/MaterialListRenderer.vue')),
  [ComponentType.MemberPlan]: defineAsyncComponent(() => import('./renderers/MemberPlanRenderer.vue')),
  [ComponentType.QaList]: defineAsyncComponent(() => import('./renderers/QaListRenderer.vue')),
  [ComponentType.SectionTitle]: defineAsyncComponent(() => import('./renderers/SectionTitleRenderer.vue')),
  [ComponentType.Divider]: defineAsyncComponent(() => import('./renderers/DividerRenderer.vue')),
  [ComponentType.Spacer]: defineAsyncComponent(() => import('./renderers/SpacerRenderer.vue')),
  [ComponentType.FormEntry]: defineAsyncComponent(() => import('./renderers/FormEntryRenderer.vue')),
  [ComponentType.AIEntry]: defineAsyncComponent(() => import('./renderers/AIEntryRenderer.vue')),
  [ComponentType.JoinGroup]: defineAsyncComponent(() => import('./renderers/JoinGroupRenderer.vue')),
  [ComponentType.BrandHeader]: defineAsyncComponent(() => import('./renderers/BrandHeaderRenderer.vue')),
  [ComponentType.Container]: defineAsyncComponent(() => import('./renderers/ContainerRenderer.vue')),
  [ComponentType.ImageHotspot]: defineAsyncComponent(() => import('./renderers/ImageHotspotRenderer.vue')),
  [ComponentType.SectionBg]: defineAsyncComponent(() => import('./renderers/SectionBgRenderer.vue')),
  [ComponentType.FeatureCards]: defineAsyncComponent(() => import('./renderers/FeatureCardsRenderer.vue')),
  [ComponentType.ImageCube]: defineAsyncComponent(() => import('./renderers/ImageCubeRenderer.vue')),
  [ComponentType.ContentTabs]: defineAsyncComponent(() => import('./renderers/ContentTabsRenderer.vue')),
  [ComponentType.PlanetHero]: defineAsyncComponent(() => import('./renderers/PlanetHeroRenderer.vue')),
  [ComponentType.PlanetTopics]: defineAsyncComponent(() => import('./renderers/PlanetTopicsRenderer.vue')),
  [ComponentType.PlanetFeed]: defineAsyncComponent(() => import('./renderers/PlanetFeedRenderer.vue')),
  [ComponentType.WarmGreet]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmAuthors]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmFeature]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmColumns]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmPlanetRec]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmFeed]: defineAsyncComponent(() => import('./renderers/warm/DslWarmBlock.vue')),
  [ComponentType.WarmHome]: defineAsyncComponent(() => import('./renderers/WarmShellRenderer.vue')),
  [ComponentType.WarmDiscover]: defineAsyncComponent(() => import('./renderers/WarmShellRenderer.vue')),
  [ComponentType.WarmPlanet]: defineAsyncComponent(() => import('./renderers/WarmShellRenderer.vue')),
  [ComponentType.WarmShop]: defineAsyncComponent(() => import('./renderers/WarmShellRenderer.vue')),
  [ComponentType.WarmMine]: defineAsyncComponent(() => import('./renderers/WarmShellRenderer.vue')),
}

const warnedUnknownTypes = new Set<string>()

/** 历史 DSL / 外部组件别名 → 已注册类型 */
const COMPONENT_TYPE_ALIASES: Record<string, string> = {
  'flow-ai-assistant': ComponentType.AIEntry,
  flow_ai_assistant: ComponentType.AIEntry,
  'flow-ai': ComponentType.AIEntry,
}

function resolveRenderer(type: string) {
  const key = COMPONENT_TYPE_ALIASES[type] || type
  if (rendererMap[key]) return rendererMap[key]
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
