<template>
  <!--
    缩略图里的单个节点：只渲染内容，不带选中态/工具条/拖拽语义。
    外层 margin 复刻 BaseRenderer 的算法（相对屏幕的间距用外边距），
    保证缩略图里的间距与画布一致。
  -->
  <div class="block-node" :style="{ opacity: node.style?.visible === false ? 0.42 : 1 }">
    <div :style="marginStyle">
      <div class="block-node__surface" :style="surfaceStyle">
        <div class="block-node__inner" :style="innerStyle">
          <component
            :is="resolveRenderer(node.type)"
            :component="node"
            :preview-mode="true"
          />
        </div>
      </div>
      <BlockNodeList
        v-if="node.children?.length && depth < maxDepth"
        :nodes="node.children"
        :depth="depth + 1"
        :max-depth="maxDepth"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance, ComponentStyle } from '@/types/page'
import { resolveRenderer } from './renderers/registry'
import BlockNodeList from './BlockNodeList.vue'

const props = withDefaults(
  defineProps<{
    node: ComponentInstance
    depth?: number
    maxDepth?: number
  }>(),
  { depth: 1, maxDepth: 4 },
)

function num(v: unknown) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const marginStyle = computed(() => {
  const s = props.node.style || {}
  return {
    marginTop: `${num(s.margin_top)}px`,
    marginBottom: `${num(s.margin_bottom)}px`,
    marginLeft: `${num(s.margin_left)}px`,
    marginRight: `${num(s.margin_right)}px`,
  }
})

/** 与 BaseRenderer.surfaceStyle 同规则：外壳透明、无内边距，避免整块白外框 */
const surfaceStyle = computed(() => ({
  paddingTop: '0px',
  paddingBottom: '0px',
  paddingLeft: '0px',
  paddingRight: '0px',
  backgroundColor: 'transparent',
}))

/** 与 BaseRenderer.innerStyle 同规则：圆角/文字色/字号/阴影通过 CSS 变量下发给组件内部 */
const innerStyle = computed(() => {
  const s = (props.node.style || {}) as ComponentStyle
  const style: Record<string, string> = {}
  if (s.border_radius !== undefined && s.border_radius !== null) {
    style['--card-radius'] = `${Number(s.border_radius)}px`
  }
  if (s.text_color) style['--component-text-color'] = s.text_color
  if (s.font_size !== undefined && s.font_size !== null && Number(s.font_size) > 0) {
    style['--component-font-size'] = `${Number(s.font_size)}px`
  }
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
</script>

<style scoped>
.block-node {
  display: flow-root;
  min-width: 0;
}

.block-node__surface {
  min-height: 20px;
  box-shadow: none;
  background: transparent;
}

.block-node__inner {
  display: flow-root;
  min-width: 0;
  overflow: visible;
  box-shadow: var(--component-shadow, none);
}
</style>
