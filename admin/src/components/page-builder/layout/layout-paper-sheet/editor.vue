<template>
  <div
    class="wk-card wk-sheet"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <div v-if="p.title" class="wk-sheet__title">{{ p.title }}</div>

    <div class="wk-sheet__body" :style="bodyStyle">
      <slot />
      <div v-if="editing && p.showPlaceholder" class="wk-sheet__placeholder">
        {{ p.placeholderText }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { layoutPaperSheetDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: layoutPaperSheetDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  borderRadius: `${Number(p.value.radius) || 0}px`,
  border: `1px solid ${p.value.borderColor || '#ECD9C4'}`,
  boxShadow: p.value.shadow ? '0 4px 16px rgba(180, 83, 9, 0.06)' : 'none',
}))

const bodyStyle = computed(() => ({
  padding: `${Number(p.value.padding) || 0}px`,
}))
</script>

<style scoped>
.wk-sheet {
  position: relative;
}
.wk-sheet__title {
  padding: 14px 16px 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
  color: #B45309;
}
.wk-sheet__body {
  min-height: 48px;
}
/* 空容器没有内容，必须给虚线占位，否则运营会以为组件坏了 */
.wk-sheet__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
  padding: 14px;
  border: 1px dashed #EDE0CB;
  border-radius: 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #B45309;
  text-align: center;
}
</style>
