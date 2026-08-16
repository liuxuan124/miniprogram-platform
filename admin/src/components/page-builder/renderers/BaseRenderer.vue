<template>
  <div
    class="component-item"
    :class="{ selected, 'is-hidden': isHidden }"
    :style="marginStyle"
    @click.stop="$emit('select')"
  >
    <div v-if="selected" class="component-toolbar" :class="{ 'component-toolbar--below': index === 0 }">
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
    <div v-if="isHidden" class="hidden-badge">已隐藏</div>
    <div class="component-render" :style="surfaceStyle">
      <!-- 通过 --card-radius 变量下发圆角：只影响组件内的卡片/按钮，背景层永远保持直角 -->
      <div class="component-render-inner" :class="textStyleClass" :style="innerStyle">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Top, Bottom, CopyDocument, Delete } from '@element-plus/icons-vue'
import type { ComponentStyle } from '@/types/page'
import '../componentTextStyle.scss'

const props = defineProps<{
  index: number
  selected: boolean
  label: string
  componentStyle?: ComponentStyle
}>()

defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
}>()

const isHidden = computed(() => props.componentStyle?.visible === false)

const marginStyle = computed(() => {
  const s = props.componentStyle || {}
  return {
    marginTop: `${Number(s.margin_top) || 0}px`,
    marginBottom: `${Number(s.margin_bottom) || 0}px`,
    marginLeft: `${Number(s.margin_left) || 0}px`,
    marginRight: `${Number(s.margin_right) || 0}px`,
  }
})

const surfaceStyle = computed(() => {
  const s = props.componentStyle || {}
  return {
    paddingTop: `${Number(s.padding_top) || 0}px`,
    paddingBottom: `${Number(s.padding_bottom) || 0}px`,
    paddingLeft: `${Number(s.padding_left) || 0}px`,
    paddingRight: `${Number(s.padding_right) || 0}px`,
    backgroundColor: s.background_color || 'transparent',
  }
})

const innerStyle = computed(() => {
  const s = props.componentStyle || {}
  const style: Record<string, string> = {}

  const radius = s.border_radius
  if (radius !== undefined && radius !== null) {
    style['--card-radius'] = `${Number(radius)}px`
  }

  if (s.text_color) {
    style['--component-text-color'] = s.text_color
  }
  if (s.font_size !== undefined && s.font_size !== null && Number(s.font_size) > 0) {
    style['--component-font-size'] = `${Number(s.font_size)}px`
  }

  return style
})

const textStyleClass = computed(() => {
  const s = props.componentStyle || {}
  return {
    'has-text-color': !!s.text_color,
    'has-text-size': Number(s.font_size) > 0,
  }
})
</script>

<style scoped>
.component-item {
  position: relative;
  cursor: pointer;
  transition: box-shadow 0.15s, transform 0.15s;
}
.component-item:hover .component-render {
  box-shadow:
    0 2px 10px rgba(15, 23, 42, 0.08),
    0 0 0 1px rgba(23, 105, 255, 0.35);
}
.component-item.is-hidden .component-render {
  opacity: 0.42;
}
.hidden-badge {
  position: absolute;
  top: 6px;
  left: 6px;
  z-index: 3;
  padding: 1px 6px;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  background: #909399;
  border-radius: 4px;
}
.component-item.selected {
  z-index: 2;
}
.component-item.selected .component-render {
  box-shadow:
    0 4px 14px rgba(23, 105, 255, 0.14),
    0 0 0 2px #1769ff;
}
.component-toolbar {
  /* 悬浮在选中组件上方外侧，避免遮挡组件内容 */
  position: absolute;
  top: -34px;
  right: 0;
  width: fit-content;
  height: 30px;
  background: rgba(23, 32, 51, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.22);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 8px;
  z-index: 20;
  backdrop-filter: blur(6px);
  white-space: nowrap;
}
/* 第一个组件上方没有空间（会被画布裁掉），改为显示在组件下方 */
.component-toolbar--below {
  top: auto;
  bottom: -34px;
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
  border-radius: 2px;
  /* 统一轻阴影：白底组件在画布上可区分块边界 */
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.08);
  transition: box-shadow 0.15s;
}
.component-render-inner {
  display: flow-root;
}
</style>
