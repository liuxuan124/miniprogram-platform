<template>
  <div
    class="wk-card wk-stick"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">{{ hintLabel }}</span>

    <div class="wk-stick__body" :style="bodyStyle">
      <slot />
      <div v-if="editing && p.showPlaceholder" class="wk-stick__placeholder">
        {{ p.placeholderText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { layoutStickyWrapperDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: layoutStickyWrapperDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

/** 关闭吸顶时退化为普通静态容器，便于运营对比两种效果 */
const stickyOn = computed(() => p.value.enabled !== false)

const zIndexNum = computed(() => {
  const n = Math.round(Number(p.value.zIndex))
  return Number.isFinite(n) && n > 0 ? n : 20
})

/** 底色强制不透明：透明会让吸顶时滑动内容穿透显脏 */
const rootStyle = computed(() => ({
  position: stickyOn.value ? 'sticky' : 'relative',
  top: stickyOn.value ? `${Number(p.value.stickyTop) || 0}px` : 'auto',
  zIndex: stickyOn.value ? zIndexNum.value : 1,
  background: bg.value || '#FDF6EC',
  borderRadius: `${Number(p.value.radius) || 0}px`,
  border: '1px solid #ECD9C4',
  boxShadow:
    p.value.showShadow && stickyOn.value ? '0 8px 28px rgba(180, 83, 9, 0.10)' : 'none',
}))

const bodyStyle = computed(() => ({
  padding: `${Number(p.value.padding) || 0}px`,
}))

const hintLabel = computed(() =>
  stickyOn.value
    ? `吸顶 ${Number(p.value.stickyTop) || 0}px · z-index ${zIndexNum.value}`
    : '吸顶已关闭 · 普通静态容器',
)
</script>

<style scoped>
.wk-stick {
  position: relative;
}
.wk-stick__body {
  min-height: 44px;
}
/* 不吸顶时也要有占位提示，否则画布上只是一条空色带，运营无法判断组件是否生效 */
.wk-stick__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px dashed #EDE0CB;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #B45309;
  text-align: center;
}
/* 角标：wk-edit-hint 未被全局引入，这里自带一份定位样式 */
.wk-edit-hint {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 4;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1.6;
  color: #FFFDF9;
  background: #B45309;
  opacity: 0.92;
  pointer-events: none;
}
</style>
