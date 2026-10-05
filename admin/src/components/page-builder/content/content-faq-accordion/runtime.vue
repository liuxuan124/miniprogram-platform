<template>
  <div
    class="wk-card wk-faq"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：展开收起仅预览</span>

    <div v-if="p.title || (p.showExpandAll && !p.accordionMode)" class="wk-faq__head">
      <span v-if="p.title" class="wk-title">{{ p.title }}</span>
      <button
        v-if="p.showExpandAll && !p.accordionMode && items.length"
        type="button"
        class="wk-faq__all"
        :style="{ color: accent }"
        @click.stop="toggleAll($event)"
      >
        {{ allOpen ? '收起全部' : '展开全部' }}
      </button>
    </div>

    <div v-if="!items.length" class="wk-faq__empty">暂无问答</div>

    <div v-for="(it, i) in items" :key="it.id || i" class="wk-faq__item">
      <button
        type="button"
        class="wk-faq__q"
        :class="{ 'wk-faq__q--on': isOpen(i) }"
        @click.stop="toggle(i, $event)"
      >
        <span class="wk-faq__qtext">{{ it.question || '问题' }}</span>
        <span v-if="it.tag" class="wk-faq__tag" :style="tagStyle">{{ it.tag }}</span>
        <span
          class="wk-faq__arrow"
          :class="{ 'wk-faq__arrow--open': isOpen(i) }"
          :style="{ color: accent }"
        >▾</span>
      </button>
      <div class="wk-faq__body" :class="{ 'wk-faq__body--open': isOpen(i) }">
        <div class="wk-faq__inner">
          <p class="wk-faq__a">{{ it.answer || '答案' }}</p>
        </div>
      </div>
    </div>

    <div v-if="!anyOpen && p.collapsedHint" class="wk-faq__hint">{{ p.collapsedHint }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { contentFaqAccordionDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, items, guard, editing, bg, accent } = useWarmKit({
  defaults: contentFaqAccordionDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
  itemKey: 'items',
})

/** -1 = 全部闭合；0..n-1 = 对应条目；超出范围回落到第一条 */
function normalize(v: any) {
  const n = Math.trunc(Number(v))
  if (!Number.isFinite(n) || n < 0) return -1
  if (n > items.value.length - 1) return items.value.length ? 0 : -1
  return n
}

const openSet = ref<number[]>([])

function resetOpen() {
  const n = normalize(p.value.defaultOpenIndex)
  openSet.value = n < 0 ? [] : [n]
}

resetOpen()

watch(
  () => [p.value.defaultOpenIndex, items.value.length] as const,
  () => resetOpen(),
)

const anyOpen = computed(() => openSet.value.length > 0)

const allOpen = computed(
  () => items.value.length > 0 && openSet.value.length === items.value.length,
)

function isOpen(i: number) {
  return openSet.value.indexOf(i) >= 0
}

function toggle(i: number, e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  if (p.value.accordionMode) {
    openSet.value = isOpen(i) ? [] : [i]
    return
  }
  openSet.value = isOpen(i)
    ? openSet.value.filter((x) => x !== i)
    : openSet.value.concat(i)
}

function toggleAll(e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  openSet.value = allOpen.value ? [] : items.value.map((_, k) => k)
}

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const tagStyle = computed(() => ({
  color: accent.value || '#C2410C',
  borderColor: '#F5E6D4',
  background: '#FFFAF3',
}))
</script>

<style scoped>
.wk-faq {
  position: relative;
  padding: 14px;
  border-radius: 14px;
}
.wk-faq__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}
.wk-faq__all {
  flex-shrink: 0;
  padding: 0;
  border: none;
  background: none;
  font-family: inherit;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
}
.wk-faq__item {
  border-bottom: 1px solid #F5E6D4;
}
.wk-faq__item:last-of-type {
  border-bottom: none;
}
.wk-faq__q {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
  padding: 12px 0;
  border: none;
  background: none;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.wk-faq__qtext {
  flex: 1 1 auto;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.6;
  color: #57534E;
  transition: color 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.wk-faq__q--on .wk-faq__qtext {
  color: #B45309;
}
.wk-faq__tag {
  flex-shrink: 0;
  max-width: 88px;
  padding: 1px 7px;
  border: 1px solid #F5E6D4;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wk-faq__arrow {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 13px;
  line-height: 1.5;
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.wk-faq__arrow--open {
  transform: rotate(180deg);
}
/* 平滑展开：grid-template-rows 0fr -> 1fr，不猜max-height */
.wk-faq__body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}
.wk-faq__body--open {
  grid-template-rows: 1fr;
}
.wk-faq__inner {
  overflow: hidden;
  min-width: 0;
}
.wk-faq__a {
  margin: 0;
  padding: 0 0 12px;
  font-size: 12px;
  line-height: 1.8;
  color: #78716C;
}
.wk-faq__hint {
  margin-top: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 11px;
  line-height: 1.7;
  color: #B45309;
  background: #FFFAF3;
}
.wk-faq__empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: #78716C;
}
.wk-guard .wk-faq__q,
.wk-guard .wk-faq__all {
  cursor: default;
}
</style>
