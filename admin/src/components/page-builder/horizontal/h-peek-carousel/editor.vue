<template>
  <div
    class="wk-card wk-peekc"
    :class="{ 'wk-guard': editing }"
    :style="rootStyle"
    @click="guard($event)"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：横滑不会真实滚动</span>

    <div v-if="p.title" class="wk-peekc__head">
      <span class="wk-title">{{ p.title }}</span>
      <span class="wk-peekc__tip">左右滑动查看更多</span>
    </div>

    <div v-if="!cards.length" class="wk-peekc__empty">{{ p.emptyText }}</div>

    <template v-else>
      <div ref="trackEl" class="wk-peekc__track" :style="trackStyle" @scroll.passive="onScroll">
        <article
          v-for="(c, i) in cards"
          :key="c.id || i"
          class="wk-peekc__card"
          :style="cardStyle"
        >
          <div class="wk-peekc__cover" :style="coverStyle(c.image)">
            <img v-if="c.image" :src="c.image" alt="" class="wk-peekc__cover-img" />
            <span v-else class="wk-peekc__cover-ph">{{ initial(c.title) }}</span>
          </div>
          <div class="wk-peekc__body">
            <h4 class="wk-peekc__card-title">{{ c.title || '政策标题' }}</h4>
            <p class="wk-peekc__desc">{{ c.desc || '一句话说明' }}</p>
            <span v-if="c.tag" class="wk-peekc__tag" :style="tagStyle">{{ c.tag }}</span>
          </div>
        </article>
      </div>

      <div v-if="p.showDots && cards.length > 1" class="wk-peekc__dots">
        <button
          v-for="(c, i) in cards"
          :key="`dot-${c.id || i}`"
          type="button"
          class="wk-peekc__dot"
          :class="i === activeIndex ? 'wk-peekc__dot--on' : ''"
          :style="i === activeIndex ? dotOnStyle : null"
          @click.stop="goTo(i, $event)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { hPeekCarouselDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const { safe: p, items, guard, editing, bg, accent } = useWarmKit({
  defaults: hPeekCarouselDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => !props.previewMode),
  itemKey: 'cards',
})

const cards = computed(() => items.value)

const trackEl = ref<HTMLElement | null>(null)
const activeIndex = ref(0)

/** 单屏露出张数，非法值回退 1.2 */
const peekRatio = computed(() => {
  const n = Number(p.value.peekRatio)
  return [1.2, 1.6, 2.3].includes(n) ? n : 1.2
})

const gap = computed(() => Math.max(0, Number(p.value.gap) || 0))

/**
 * 卡宽 =(容器内容宽 -(n-1)* gap) / n
 * n=1.2 → 约 83.3%   n=1.6 → 约 62.5%   n=2.3 → 约 43.5%
 * 全部交给 calc + CSS 变量，不写死 px
 */
const trackStyle = computed(() => ({
  gap: `${gap.value}px`,
  '--wk-peek-n': String(peekRatio.value),
  '--wk-peek-gap': `${gap.value}px`,
}))

const cardStyle = computed(() => ({
  height: `${Math.max(100, Number(p.value.cardHeight) || 168)}px`,
  flex: '0 0 calc((100% - (var(--wk-peek-n) - 1) * var(--wk-peek-gap)) / var(--wk-peek-n))',
}))

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const tagStyle = computed(() => ({
  color: accent.value || '#C2410C',
  background: '#FDE8D8',
}))

const dotOnStyle = computed(() => ({
  background: accent.value || '#C2410C',
}))

function initial(title: any) {
  return String(title || '策').slice(0, 1)
}

function coverStyle(src: any) {
  if (!src) return {}
  return { backgroundImage: `url(${src})` }
}

/** 滚动时按「卡宽 + 间距」推算当前页 */
function onScroll(e: Event) {
  const el = e.target as HTMLElement
  const first = el.firstElementChild as HTMLElement | null
  if (!first) return
  const step = first.offsetWidth + gap.value
  if (step <= 0) return
  const idx = Math.round(el.scrollLeft / step)
  activeIndex.value = Math.min(cards.value.length - 1, Math.max(0, idx))
}

function goTo(i: number, e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  const el = trackEl.value
  const first = el?.firstElementChild as HTMLElement | null
  if (!el || !first) return
  el.scrollTo({ left: i * (first.offsetWidth + gap.value), behavior: 'smooth' })
}
</script>

<style scoped>
.wk-peekc {
  position: relative;
  padding: 14px 0 12px;
}
.wk-peekc__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  padding: 0 14px;
  margin-bottom: 10px;
}
.wk-peekc__tip {
  font-size: 11px;
  color: #78716C;
}
.wk-peekc__track {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  padding: 4px 0 10px 14px;
}
.wk-peekc__track::-webkit-scrollbar {
  display: none;
}
.wk-peekc__card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  scroll-snap-align: start;
  overflow: hidden;
  border-radius: 14px;
  background: #FFFAF3;
  border: 1px solid #F5E6D4;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
}
.wk-peekc__cover {
  flex: 0 0 auto;
  height: 84px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5E6D4 center/cover no-repeat;
  border-bottom: 1px solid #F5E6D4;
}
.wk-peekc__cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.wk-peekc__cover-ph {
  font-size: 26px;
  font-weight: 600;
  color: #B45309;
}
.wk-peekc__body {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 10px 12px 12px;
}
.wk-peekc__card-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  color: #292524;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wk-peekc__desc {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: #57534E;
  flex: 1 1 auto;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.wk-peekc__tag {
  align-self: flex-start;
  margin-top: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  line-height: 1.6;
  white-space: nowrap;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.wk-peekc__dots {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  padding-top: 2px;
}
.wk-peekc__dot {
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 999px;
  background: #F5E6D4;
  cursor: pointer;
  transition: width 0.2s ease, background 0.2s ease;
}
.wk-peekc__dot--on {
  width: 16px;
}
.wk-peekc__empty {
  margin: 0 14px;
  padding: 26px 0;
  border-radius: 10px;
  text-align: center;
  font-size: 13px;
  color: #78716C;
  background: #FFFAF3;
}
.wk-guard .wk-peekc__dot {
  cursor: default;
}
</style>
