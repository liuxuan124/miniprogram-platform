<template>
  <div
    class="component-item"
    :class="{ selected }"
    @click.stop="$emit('select')"
  >
    <div v-if="selected" class="component-toolbar">
      <span class="toolbar-label">{{ label }}</span>
      <div class="toolbar-actions">
        <el-tooltip content="上移" placement="top" :show-after="300">
          <el-button text size="small" :disabled="index === 0" @click.stop="$emit('move-up')">
            <el-icon><Top /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="下移" placement="top" :show-after="300">
          <el-button text size="small" @click.stop="$emit('move-down')">
            <el-icon><Bottom /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="复制" placement="top" :show-after="300">
          <el-button text size="small" @click.stop="$emit('copy')">
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="删除" placement="top" :show-after="300">
          <el-button text size="small" type="danger" @click.stop="$emit('delete')">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>
    <div class="component-render" :style="componentStyle">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Top, Bottom, CopyDocument, Delete } from '@element-plus/icons-vue'
import type { ComponentStyle } from '@/types/page'

const props = defineProps<{
  index: number
  selected: boolean
  label: string
  style?: ComponentStyle
}>()

defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
}>()

const componentStyle = computed(() => {
  const s = props.style || {}
  return {
    marginTop: (s.margin_top || 0) + 'px',
    marginBottom: (s.margin_bottom || 0) + 'px',
    marginLeft: (s.margin_left || 0) + 'px',
    marginRight: (s.margin_right || 0) + 'px',
    paddingTop: (s.padding_top || 0) + 'px',
    paddingBottom: (s.padding_bottom || 0) + 'px',
    paddingLeft: (s.padding_left || 0) + 'px',
    paddingRight: (s.padding_right || 0) + 'px',
    backgroundColor: s.background_color || 'transparent',
    borderRadius: (s.border_radius || 0) + 'px',
  }
})
</script>

<style scoped>
.component-item {
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.15s;
}
.component-item:hover {
  box-shadow: inset 0 0 0 2px rgba(23, 105, 255, 0.3);
}
.component-item.selected {
  box-shadow: inset 0 0 0 2px #1769ff;
}
.component-toolbar {
  position: absolute;
  top: -32px;
  left: 0;
  right: 0;
  height: 32px;
  background: #1769ff;
  border-radius: 6px 6px 0 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  z-index: 10;
}
.toolbar-label {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}
.toolbar-actions {
  display: flex;
  gap: 2px;
}
.toolbar-actions .el-button {
  color: #fff !important;
  padding: 4px;
}
.component-render {
  min-height: 20px;
}
</style>
