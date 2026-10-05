<template>
  <div
    class="wk-card wk-cmp"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：对比卡仅预览</span>

    <div v-if="p.title" class="wk-cmp__head">
      <span class="wk-title">{{ p.title }}</span>
    </div>

    <div class="wk-cmp__cols">
      <section
        class="wk-cmp__col wk-cmp__col--left"
        :class="p.highlightRight ? '' : 'wk-cmp__col--on'"
        :style="p.highlightRight ? null : colOnStyle"
      >
        <header class="wk-cmp__label" :style="{ background: p.leftColor || '#B45309' }">
          <span class="wk-cmp__label-text">{{ p.leftLabel || '对照方案' }}</span>
        </header>
        <ul class="wk-cmp__list">
          <li v-for="(pt, i) in leftPoints" :key="`l-${i}`" class="wk-cmp__row">
            <span class="wk-cmp__icon" :class="toneClass(pt.icon)">{{ pt.icon || '·' }}</span>
            <span class="wk-cmp__text">{{ pt.text || '要点文案' }}</span>
          </li>
          <li v-if="!leftPoints.length" class="wk-cmp__row wk-cmp__row--muted">
            <span class="wk-cmp__icon">·</span>
            <span class="wk-cmp__text">待补充对照要点</span>
          </li>
        </ul>
        <p v-if="p.leftNote" class="wk-cmp__note">{{ p.leftNote }}</p>
      </section>

      <section
        class="wk-cmp__col wk-cmp__col--right"
        :class="p.highlightRight ? 'wk-cmp__col--on' : ''"
        :style="p.highlightRight ? colOnStyle : null"
      >
        <header class="wk-cmp__label" :style="{ background: p.rightColor || '#C2410C' }">
          <span class="wk-cmp__label-text">{{ p.rightLabel || '推荐方案' }}</span>
          <span v-if="p.highlightRight" class="wk-cmp__badge">推荐</span>
        </header>
        <ul class="wk-cmp__list">
          <li v-for="(pt, i) in rightPoints" :key="`r-${i}`" class="wk-cmp__row">
            <span class="wk-cmp__icon" :class="toneClass(pt.icon)">{{ pt.icon || '·' }}</span>
            <span class="wk-cmp__text">{{ pt.text || '要点文案' }}</span>
          </li>
          <li v-if="!rightPoints.length" class="wk-cmp__row wk-cmp__row--muted">
            <span class="wk-cmp__icon">·</span>
            <span class="wk-cmp__text">待补充推荐要点</span>
          </li>
        </ul>
        <p v-if="p.rightNote" class="wk-cmp__note wk-cmp__note--on">{{ p.rightNote }}</p>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { hComparisonCardDefaultProps } from './schema'
import { pickList } from '../../shared/contract'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg, accent } = useWarmKit({
  defaults: hComparisonCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

const leftPoints = computed(() => pickList(p.value, 'leftPoints'))
const rightPoints = computed(() => pickList(p.value, 'rightPoints'))

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const colOnStyle = computed(() => ({
  borderColor: accent.value || '#C2410C',
  background: '#FFFAF3',
}))

/** ✓ 走正向绿，✗ 走警示红，其余中性 */
function toneClass(icon: any) {
  const s = String(icon || '').trim()
  if (s === '✓' || s === '√' || s === '✔') return 'wk-cmp__icon--ok'
  if (s === '✗' || s === '×' || s === '✘') return 'wk-cmp__icon--no'
  return ''
}
</script>

<style scoped>
.wk-cmp {
  position: relative;
  padding: 14px;
}
.wk-cmp__head {
  margin-bottom: 12px;
}
.wk-cmp__cols {
  display: flex;
  align-items: stretch;
  gap: 10px;
}
.wk-cmp__col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid #F5E6D4;
  border-radius: 12px;
  overflow: hidden;
  background: #FFFAF3;
}
.wk-cmp__col--on {
  border-width: 1px;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
}
.wk-cmp__label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 6px;
  min-height: 36px;
}
.wk-cmp__label-text {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  color: #FFFDF9;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wk-cmp__badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.6;
  color: #C2410C;
  background: #FFFDF9;
}
.wk-cmp__list {
  flex: 1 1 auto;
  margin: 0;
  padding: 10px 10px 4px;
  list-style: none;
  min-width: 0;
}
.wk-cmp__row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 0;
  min-width: 0;
}
.wk-cmp__row--muted {
  color: #78716C;
}
.wk-cmp__icon {
  flex-shrink: 0;
  width: 16px;
  text-align: center;
  font-size: 12px;
  line-height: 1.7;
  color: #B45309;
}
.wk-cmp__icon--ok {
  color: #0AAA75;
  font-weight: 700;
}
.wk-cmp__icon--no {
  color: #F05B5B;
  font-weight: 700;
}
.wk-cmp__text {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #57534E;
  overflow-wrap: anywhere;
}
.wk-cmp__note {
  margin: 6px 10px 10px;
  padding-top: 8px;
  border-top: 1px dashed #F5E6D4;
  font-size: 11px;
  line-height: 1.6;
  color: #78716C;
  min-width: 0;
  overflow-wrap: anywhere;
}
.wk-cmp__note--on {
  color: #C2410C;
  font-weight: 500;
}
</style>
