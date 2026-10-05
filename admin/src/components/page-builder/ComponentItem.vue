<template>
  <!-- 贴角浮层：不走 BaseRenderer，选中时在圆钮旁显示工具条 -->
  <div v-if="fabOnly" class="fab-only-wrap" :class="{ selected }">
    <div v-if="selected" class="fab-toolbar" @click.stop>
      <span class="fab-toolbar__label">{{ ComponentTypeLabels[component.type] || '悬浮按钮' }}</span>
      <span class="fab-toolbar__sep" aria-hidden="true"></span>
      <button type="button" class="fab-toolbar__btn" :disabled="index === 0" aria-label="上移" title="上移" @click.stop="emit('move-up')">
        <el-icon><Top /></el-icon>
      </button>
      <button type="button" class="fab-toolbar__btn" aria-label="下移" title="下移" @click.stop="emit('move-down')">
        <el-icon><Bottom /></el-icon>
      </button>
      <button type="button" class="fab-toolbar__btn" aria-label="复制" title="复制" @click.stop="emit('copy')">
        <el-icon><CopyDocument /></el-icon>
      </button>
      <button type="button" class="fab-toolbar__btn fab-toolbar__btn--danger" aria-label="删除" title="删除" @click.stop="emit('delete')">
        <el-icon><Delete /></el-icon>
      </button>
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
    @select="emit('select')"
    @delete="emit('delete')"
    @copy="emit('copy')"
    @move-up="emit('move-up')"
    @move-down="emit('move-down')"
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

/* 浅色毛玻璃工具条：与普通组件选中态同一套视觉语言 */
.fab-toolbar {
  position: absolute;
  top: 8px;
  left: 50%;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 4px 0 9px;
  color: #2a1f17;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(42 31 23 / 8%);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgb(42 31 23 / 12%);
  backdrop-filter: blur(10px) saturate(1.4);
  transform: translateX(-50%);
  pointer-events: auto;
  white-space: nowrap;
}

.fab-toolbar__label {
  color: #2a1f17;
  font-size: 11.5px;
  font-weight: 600;
}

.fab-toolbar__sep {
  width: 1px;
  height: 12px;
  background: rgb(42 31 23 / 12%);
}

.fab-toolbar__btn {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 20px;
  padding: 0;
  color: #6b5b4e;
  font-size: 13px;
  background: transparent;
  border: 0;
  border-radius: 5px;
  cursor: pointer;
  transition: color 0.14s, background 0.14s;
}

.fab-toolbar__btn:hover:not(:disabled) {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 10%, #fff);
}

.fab-toolbar__btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.fab-toolbar__btn--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeef0;
}
</style>
