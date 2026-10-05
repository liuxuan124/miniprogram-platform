<template>
  <div
    class="wk-card wk-grid"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">{{ p.ratio }} · {{ grows.length }} 栏</span>

    <div class="wk-grid__row" :style="rowStyle">
      <div
        v-for="(grow, i) in grows"
        :key="i"
        class="wk-grid__cell"
        :style="cellStyle(grow, i)"
      >
        <slot :name="`cell-${i + 1}`" />
        <div
          v-if="editing && p.showCellHints"
          class="wk-grid__cell-hint"
          :style="{ color: p.accentColor || '#B45309' }"
        >
          格 {{ i + 1 }}<span class="wk-grid__cell-grow">· {{ grow }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import {
  layoutFlexibleGridDefaultProps,
  parseRatioGrow,
  normalizeAlign,
} from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: layoutFlexibleGridDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

/** 比例串 → flex-grow 数组 */
const grows = computed(() => parseRatioGrow(p.value.ratio))

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  borderRadius: `${Number(p.value.radius) || 0}px`,
  border: '1px solid #ECD9C4',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const rowStyle = computed(() => ({
  display: 'flex',
  gap: `${Number(p.value.gap) || 0}px`,
  alignItems: normalizeAlign(p.value.alignItems),
  padding: `${Number(p.value.padding) || 0}px`,
}))

/** 每格 flex-grow:n + flex-basis:0 + min-width:0，长文案才不会撑破比例 */
function cellStyle(grow: number, index: number) {
  return {
    flexGrow: String(grow),
    flexBasis: '0',
    minWidth: '0',
    background: index % 2 === 0 ? '#FFFAF3' : '#FDF6EC',
  }
}
</script>

<style scoped>
.wk-grid {
  position: relative;
}
.wk-grid__row {
  width: 100%;
  box-sizing: border-box;
}
.wk-grid__cell {
  position: relative;
  min-height: 56px;
  border-radius: 10px;
  overflow: hidden;
}
/* 每格显示编号，运营才能看懂 1:2 到底谁宽谁窄 */
.wk-grid__cell-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 56px;
  padding: 10px 6px;
  border: 1px dashed #EDE0CB;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
  text-align: center;
  overflow-wrap: anywhere;
}
.wk-grid__cell-grow {
  margin-left: 3px;
  font-size: 11px;
  font-weight: 400;
  opacity: 0.75;
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
