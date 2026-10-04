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
    :allow-save-as-block="canSaveAsBlock"
    @select="$emit('select')"
    @delete="$emit('delete')"
    @copy="$emit('copy')"
    @move-up="$emit('move-up')"
    @move-down="$emit('move-down')"
    @save-as-block="emit('save-as-block')"
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
import { computed } from 'vue'
import { Top, Bottom, CopyDocument, Delete } from '@element-plus/icons-vue'
import type { ComponentInstance } from '@/types/page'
import { ComponentType, ComponentTypeLabels } from '@/types/page'
import BaseRenderer from './renderers/BaseRenderer.vue'
// renderer 映射与别名表已抽到 renderers/registry.ts，与区块缩略图共用同一套，
// 避免「画布长这样、缩略图长那样」（新增组件只需改 registry.ts 一处）。
import { resolveRenderer } from './renderers/registry'

const props = defineProps<{
  component: ComponentInstance
  index: number
  selected: boolean
  previewMode?: boolean
  fabOnly?: boolean
}>()

const emit = defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
  'save-as-block': []
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

/** 容器类组件才允许「另存为区块」——只有它们带 children，才是可复用的组合体 */
const CAN_SAVE_AS_BLOCK = new Set<ComponentType>([
  ComponentType.Container,
  ComponentType.SectionBg,
])
const canSaveAsBlock = computed(() => CAN_SAVE_AS_BLOCK.has(props.component.type))
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
