<template>
  <div
    class="wk-card wk-met"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：背书条仅预览</span>

    <div v-if="p.title" class="wk-met__head">
      <span class="wk-title">{{ p.title }}</span>
    </div>

    <div v-if="!visible.length" class="wk-met__empty">暂无关键数据</div>

    <div v-else class="wk-met__row">
      <div
        v-for="(m, i) in visible"
        :key="`m-${i}`"
        class="wk-met__item"
        :class="p.showDivider && i > 0 ? 'wk-met__item--div' : ''"
      >
        <div class="wk-met__num-wrap">
          <span class="wk-met__num" :style="{ color: p.valueColor || '#C2410C' }">
            {{ m.value || '0' }}<span v-if="m.suffix" class="wk-met__suffix">{{ m.suffix }}</span>
          </span>
          <span v-if="m.unit" class="wk-met__unit" :style="{ color: p.accentColor || '#C2410C' }">
            {{ m.unit }}
          </span>
        </div>
        <div class="wk-met__label" :style="{ color: p.labelColor || '#78716C' }">
          {{ m.label || '指标名' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { hMetricStripDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, items, guard, editing, bg } = useWarmKit({
  defaults: hMetricStripDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
  itemKey: 'metrics',
})

/** 列数只支持 3 / 4，且条目数不超过列数 */
const columns = computed(() => {
  const n = Number(p.value.columns)
  return [3, 4].includes(n) ? n : Math.min(4, Math.max(1, items.value.length || 3))
})

const visible = computed(() => items.value.slice(0, columns.value))

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))
</script>

<style scoped>
.wk-met {
  position: relative;
  padding: 14px 12px 16px;
}
.wk-met__head {
  padding: 0 2px;
  margin-bottom: 12px;
}
.wk-met__row {
  display: flex;
  align-items: stretch;
}
/* flex:1 挡不住长文案折行，必须显式 min-width:0，否则会把卡片撑破 */
.wk-met__item {
  flex: 1;
  min-width: 0;
  text-align: center;
  padding: 0 4px;
}
.wk-met__item--div {
  border-left: 1px solid #F5E6D4;
}
.wk-met__num-wrap {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}
.wk-met__num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1.15;
  letter-spacing: -0.2px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.wk-met__suffix {
  font-size: 13px;
  font-weight: 600;
}
.wk-met__unit {
  font-size: 11px;
  font-weight: 500;
  line-height: 1.4;
  flex-shrink: 0;
}
.wk-met__label {
  margin-top: 5px;
  font-size: 11px;
  line-height: 1.5;
  min-width: 0;
  overflow-wrap: anywhere;
}
.wk-met__empty {
  padding: 22px 0;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  color: #78716C;
  background: #FFFAF3;
}
</style>
