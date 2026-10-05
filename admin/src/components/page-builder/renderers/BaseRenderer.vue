<template>
  <div
    class="component-item"
    :class="{ selected, 'is-hidden': isHidden, 'stack-on-top': stackOnTop }"
    :style="marginStyle"
    @click.stop="$emit('select')"
  >
    <div v-if="selected" class="component-toolbar" :class="{ 'component-toolbar--below': index === 0 || toolbarAlwaysBelow }">
      <span class="toolbar-label">{{ label }}</span>
      <span class="toolbar-sep" aria-hidden="true"></span>
      <div class="toolbar-actions">
        <button type="button" class="toolbar-btn" :disabled="index === 0" aria-label="上移组件" title="上移" @click.stop="emit('move-up')">
          <el-icon><Top /></el-icon>
        </button>
        <button type="button" class="toolbar-btn" aria-label="下移组件" title="下移" @click.stop="emit('move-down')">
          <el-icon><Bottom /></el-icon>
        </button>
        <button
          v-if="allowSaveAsBlock"
          type="button"
          class="toolbar-btn"
          aria-label="另存为区块"
          title="另存为区块（可复用到其他页）"
          @click.stop="emit('save-as-block')"
        >
          <el-icon><Collection /></el-icon>
        </button>
        <button type="button" class="toolbar-btn" aria-label="复制组件" title="复制" @click.stop="emit('copy')">
          <el-icon><CopyDocument /></el-icon>
        </button>
        <button type="button" class="toolbar-btn toolbar-btn--danger" aria-label="删除组件" title="删除" @click.stop="emit('delete')">
          <el-icon><Delete /></el-icon>
        </button>
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
import { Top, Bottom, CopyDocument, Delete, Collection } from '@element-plus/icons-vue'
import type { ComponentStyle } from '@/types/page'
import '../componentTextStyle.scss'

const props = withDefaults(defineProps<{
  index: number
  selected: boolean
  label: string
  componentStyle?: ComponentStyle
  /** 列表类：外壳透明，避免整块白框包住条目（已全局透明，保留字段兼容） */
  shellTransparent?: boolean
  /** 导航栏等：负边距重叠时保持在最上层 */
  stackOnTop?: boolean
  /** 编辑工具条始终显示在组件下方（品牌顶栏） */
  toolbarAlwaysBelow?: boolean
  /** 是否展示「另存为区块」按钮（仅容器类组件由调用方开启） */
  allowSaveAsBlock?: boolean
}>(), { allowSaveAsBlock: false })

const emit = defineEmits<{
  select: []
  delete: []
  copy: []
  'move-up': []
  'move-down': []
  'save-as-block': []
}>()

const isHidden = computed(() => props.componentStyle?.visible === false)

function formatMargin(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

const marginStyle = computed(() => {
  const s = props.componentStyle || {}
  return {
    marginTop: `${formatMargin(s.margin_top)}px`,
    marginBottom: `${formatMargin(s.margin_bottom)}px`,
    marginLeft: `${formatMargin(s.margin_left)}px`,
    marginRight: `${formatMargin(s.margin_right)}px`,
  }
})

const surfaceStyle = computed(() => {
  // 外壳透明、无内边距，避免「整块白外框」；相对屏幕的间距用外边距
  return {
    paddingTop: '0px',
    paddingBottom: '0px',
    paddingLeft: '0px',
    paddingRight: '0px',
    backgroundColor: 'transparent',
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

  // 暖调环境阴影：shadow_* 字段合成 box-shadow（与小程序端 parseStyle 同规则）
  const sx = Number(s.shadow_x || 0)
  const sy = Number(s.shadow_y || 0)
  const sb = Number(s.shadow_blur || 0)
  const ss = Number(s.shadow_spread || 0)
  const sc = typeof s.shadow_color === 'string' && s.shadow_color ? s.shadow_color : 'rgba(0, 0, 0, 0)'
  if (sx !== 0 || sy !== 0 || sb !== 0 || ss !== 0) {
    style['--component-shadow'] = `${sx}px ${sy}px ${sb}px ${ss}px ${sc}`
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
  transition: outline 0.15s;
}
/* hover 用极淡实线，不再是蓝色虚线（虚线在小屏上会显脏） */
.component-item:hover {
  outline: 1px solid color-mix(in srgb, var(--color-primary) 32%, transparent);
  outline-offset: 2px;
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
.component-item.stack-on-top {
  z-index: 10;
}
.component-item.selected {
  z-index: 2;
  /* 1.5px 品牌色实线 + 极轻外发光：比橙色虚线柔和，但仍一眼可辨 */
  outline: 1.5px solid var(--color-primary);
  outline-offset: 2px;
  border-radius: 3px;
}
.component-item.stack-on-top.selected {
  z-index: 11;
}

/* 浅色毛玻璃工具条：贴右上角，不再是黑底大色块 */
.component-toolbar {
  position: absolute;
  top: -32px;
  right: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 4px 0 9px;
  z-index: 20;
  white-space: nowrap;
  background: rgb(255 255 255 / 82%);
  border: 1px solid rgb(42 31 23 / 8%);
  border-radius: 8px;
  box-shadow: 0 4px 14px rgb(42 31 23 / 12%);
  backdrop-filter: blur(10px) saturate(1.4);
}

/* 第一个组件上方没有空间（会被画布裁掉），改为显示在组件下方 */
.component-toolbar--below {
  top: auto;
  bottom: -32px;
}

.toolbar-label {
  color: #2a1f17;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.1px;
}

.toolbar-sep {
  width: 1px;
  height: 12px;
  background: rgb(42 31 23 / 12%);
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 1px;
}

.toolbar-btn {
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

.toolbar-btn:hover:not(:disabled) {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 10%, #fff);
}

.toolbar-btn:disabled {
  opacity: 0.32;
  cursor: not-allowed;
}

.toolbar-btn--danger:hover:not(:disabled) {
  color: #c0392b;
  background: #fdeef0;
}
.component-render {
  min-height: 20px;
  /* 不再给外壳加阴影/描边，避免「整块外框」 */
  box-shadow: none;
  background: transparent;
}
.component-render-inner {
  display: flow-root;
  min-width: 0;
  overflow: visible;
  /* 暖调环境阴影由 innerStyle 注入 --component-shadow；未配置时为 none */
  box-shadow: var(--component-shadow, none);
}
</style>
