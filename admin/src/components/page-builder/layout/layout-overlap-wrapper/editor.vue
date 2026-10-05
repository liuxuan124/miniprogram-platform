<template>
  <div
    class="wk-card wk-ovl"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing && p.showHint" class="wk-edit-hint">{{ p.hintText }}</span>

    <div class="wk-ovl__body" :style="bodyStyle">
      <slot />
      <div v-if="editing" class="wk-ovl__placeholder">重叠内容区 · 将组件拖入此处</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { layoutOverlapWrapperDefaultProps, normalizeOverlap } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: layoutOverlapWrapperDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
})

/** 重叠档位（px），非法值收敛为 0 */
const overlapPx = computed(() => normalizeOverlap(p.value.overlap))

const rootStyle = computed(() => ({
  /** 负外边距把本层往上提；必须配 position:relative + z-index，否则会被上层背景盖住 */
  marginTop: `${-overlapPx.value}px`,
  position: 'relative',
  zIndex: 2,
  background: bg.value || '#FDF6EC',
  borderRadius: `${Number(p.value.radius) || 0}px`,
  border: `1px solid ${p.value.borderColor || '#ECD9C4'}`,
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const bodyStyle = computed(() => ({
  padding: `${Number(p.value.padding) || 0}px`,
}))
</script>

<style scoped>
.wk-ovl__body {
  position: relative;
  min-height: 56px;
}
.wk-ovl__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 12px;
  border: 1px dashed #EDE0CB;
  border-radius: 12px;
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
