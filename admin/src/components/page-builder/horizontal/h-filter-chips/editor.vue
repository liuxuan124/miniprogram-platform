<template>
  <div
    class="wk-card wk-chips"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：点击不会真实切换</span>

    <div v-if="p.title" class="wk-chips__head">
      <span class="wk-title">{{ p.title }}</span>
    </div>

    <div v-if="!chips.length" class="wk-chips__empty">暂无筛选项</div>

    <div v-else class="wk-chips__track">
      <button
        v-if="p.showAllChip"
        type="button"
        class="wk-chips__pill"
        :class="active === -1 ? 'wk-chips__pill--on' : ''"
        :style="active === -1 ? activeStyle : idleStyle"
        @click.stop="select(-1, $event)"
      >
        <span class="wk-chips__text">{{ p.allLabel || '全部' }}</span>
      </button>

      <button
        v-for="(c, i) in chips"
        :key="c.id || i"
        type="button"
        class="wk-chips__pill"
        :class="active === i ? 'wk-chips__pill--on' : ''"
        :style="active === i ? activeStyle : idleStyle"
        @click.stop="select(i, $event)"
      >
        <span class="wk-chips__text">{{ c.label || '标签' }}</span>
        <span
          v-if="p.showCount && c.count !== undefined && c.count !== null"
          class="wk-chips__count"
          :class="active === i ? 'wk-chips__count--on' : ''"
        >
          {{ c.count }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { hFilterChipsDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, items, guard, editing, bg, accent } = useWarmKit({
  defaults: hFilterChipsDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
  itemKey: 'chips',
})

const chips = computed(() => items.value)

/** -1 = 「全部」高亮；0..n-1 = 对应芯片高亮 */
function normalize(v: any) {
  const n = Math.trunc(Number(v))
  if (!Number.isFinite(n) || n < -1) return -1
  if (n > chips.value.length - 1) return chips.value.length ? 0 : -1
  return n
}

const active = ref(normalize(p.value.activeIndex))

watch(
  () => [p.value.activeIndex, chips.value.length] as const,
  () => {
    active.value = normalize(p.value.activeIndex)
  },
)

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const activeStyle = computed(() => ({
  background: p.value.activeColor || '#C2410C',
  borderColor: p.value.activeColor || '#C2410C',
}))

const idleStyle = computed(() => ({
  borderColor: accent.value || '#C2410C',
}))

function select(i: number, e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  active.value = i
}
</script>

<style scoped>
.wk-chips {
  position: relative;
  padding: 14px 0 12px;
}
.wk-chips__head {
  padding: 0 14px;
  margin-bottom: 10px;
}
.wk-chips__track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 2px 14px 6px;
}
.wk-chips__track::-webkit-scrollbar {
  display: none;
}
.wk-chips__pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  white-space: nowrap;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid #F5E6D4;
  background: #FFFAF3;
  font-size: 13px;
  line-height: 1.5;
  color: #57534E;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}
.wk-chips__pill--on {
  color: #FFFDF9;
  font-weight: 600;
}
.wk-chips__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wk-chips__count {
  flex-shrink: 0;
  min-width: 16px;
  padding: 0 4px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  color: #B45309;
  background: #F5E6D4;
}
.wk-chips__count--on {
  color: #C2410C;
  background: #FFFDF9;
}
.wk-chips__empty {
  margin: 0 14px;
  padding: 20px 0;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  color: #78716C;
  background: #FFFAF3;
}
.wk-guard .wk-chips__pill {
  cursor: default;
}
</style>
