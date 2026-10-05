<template>
  <div
    class="wk-card wk-chal"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：按钮不会真实打卡</span>

    <div class="wk-chal__head">
      <div class="wk-chal__head-left">
        <span v-if="p.title" class="wk-title">{{ p.title }}</span>
        <span v-if="p.cycleStart || p.cycleEnd" class="wk-chal__cycle">
          {{ p.cycleStart }} - {{ p.cycleEnd }}
        </span>
      </div>
      <span class="wk-chal__pct" :style="{ color: p.accentColor }">{{ percent }}%</span>
    </div>

    <div v-if="p.showCalendar" class="wk-chal__cal">
      <span
        v-for="n in calendarCount"
        :key="n"
        class="wk-chal__cell"
        :class="n <= filledCount ? 'wk-chal__cell--on' : ''"
        :style="n <= filledCount ? onCellStyle : offCellStyle"
      />
    </div>

    <div class="wk-chal__body">
      <div class="wk-chal__streak">
        <span class="wk-chal__num" :style="{ color: p.accentColor }">{{ streak }}</span>
        <span class="wk-chal__unit">天连击</span>
      </div>
      <div class="wk-chal__meta">
        <span class="wk-chal__done">已打卡 {{ checked }} / {{ total }} 天</span>
        <span class="wk-chal__tip">{{ streak > 0 ? '别断签，今天是第 ' + (streak + 1) + ' 天' : '今天开个头，连击从 1 开始' }}</span>
      </div>
    </div>

    <button
      v-if="p.ctaText"
      type="button"
      class="wk-chal__cta"
      :class="checkedToday ? 'wk-chal__cta--done' : ''"
      :style="ctaStyle"
      @click.stop="toggle"
    >
      {{ checkedToday ? p.doneText : p.ctaText }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { planetChallengeCardDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: planetChallengeCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
})

const checkedToday = ref(false)

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const total = computed(() => Math.max(1, Math.floor(Number(p.value.totalDays) || 1)))

const checked = computed(() =>
  Math.min(total.value, Math.max(0, Math.floor(Number(p.value.checkedDays) || 0))),
)

const checkedWithToday = computed(() =>
  Math.min(total.value, checked.value + (checkedToday.value ? 1 : 0)),
)

const streak = computed(() => Math.max(0, Math.floor(Number(p.value.streakDays) || 0)))

const calendarCount = computed(() =>
  Math.min(Math.max(1, Math.floor(Number(p.value.calendarMax) || 31)), total.value),
)

const filledCount = computed(() => {
  const c = calendarCount.value
  return Math.round((checkedWithToday.value / total.value) * c)
})

const percent = computed(() => Math.round((checkedWithToday.value / total.value) * 100))

const onCellStyle = computed(() => ({
  background: p.value.accentColor || '#C2410C',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const offCellStyle = computed(() => ({
  background: '#F5E6D4',
}))

const ctaStyle = computed(() =>
  checkedToday.value
    ? { background: '#0AAA75', boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)' }
    : { background: p.value.accentColor || '#C2410C', boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)' },
)

function toggle(e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  checkedToday.value = !checkedToday.value
}
</script>

<style scoped>
.wk-chal {
  position: relative;
  padding: 14px;
}
.wk-chal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.wk-chal__head-left {
  min-width: 0;
}
.wk-chal__cycle {
  display: inline-block;
  margin-top: 4px;
  font-size: 12px;
  color: #78716C;
}
.wk-chal__pct {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}
.wk-chal__cal {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 12px;
  padding: 10px;
  border-radius: 10px;
  background: #FFFAF3;
}
.wk-chal__cell {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.wk-chal__body {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
}
.wk-chal__streak {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.wk-chal__num {
  font-size: 34px;
  font-weight: 700;
  line-height: 1;
}
.wk-chal__unit {
  font-size: 12px;
  color: #57534E;
}
.wk-chal__meta {
  text-align: right;
}
.wk-chal__done {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: #57534E;
}
.wk-chal__tip {
  display: block;
  margin-top: 2px;
  font-size: 11px;
  color: #78716C;
}
.wk-chal__cta {
  display: block;
  width: 100%;
  margin-top: 12px;
  padding: 10px 0;
  border: none;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
  color: #FFFDF9;
  cursor: pointer;
}
.wk-chal__cta--done {
  color: #FFFDF9;
}
.wk-guard .wk-chal__cta {
  cursor: default;
}
</style>