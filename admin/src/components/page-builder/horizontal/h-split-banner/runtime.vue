<template>
  <div
    class="wk-card wk-split"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：不会真实跳转</span>

    <div class="wk-split__row">
      <div class="wk-split__cell" :style="leftStyle" @click.stop="go(p.leftLink, $event, 'left')">
        <span class="wk-split__icon">
          <img v-if="isImage(p.leftIcon)" :src="p.leftIcon" alt="" class="wk-split__icon-img" />
          <template v-else>{{ p.leftIcon || '◈' }}</template>
        </span>
        <div class="wk-split__text">
          <h4 class="wk-split__title" :style="{ color: p.accentColor || '#C2410C' }">
            {{ p.leftTitle || '左格标题' }}
          </h4>
          <p class="wk-split__sub">{{ p.leftSub || '一句话说明点击后的动作与收益' }}</p>
        </div>
        <span v-if="p.showArrow" class="wk-split__arrow" :style="{ color: p.accentColor || '#C2410C' }">
          →
        </span>
      </div>

      <div class="wk-split__cell" :style="rightStyle" @click.stop="go(p.rightLink, $event, 'right')">
        <span class="wk-split__icon">
          <img v-if="isImage(p.rightIcon)" :src="p.rightIcon" alt="" class="wk-split__icon-img" />
          <template v-else>{{ p.rightIcon || '◈' }}</template>
        </span>
        <div class="wk-split__text">
          <h4 class="wk-split__title" :style="{ color: p.accentColor || '#C2410C' }">
            {{ p.rightTitle || '右格标题' }}
          </h4>
          <p class="wk-split__sub">{{ p.rightSub || '一句话说明点击后的动作与收益' }}</p>
        </div>
        <span v-if="p.showArrow" class="wk-split__arrow" :style="{ color: p.accentColor || '#C2410C' }">
          →
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { hSplitBannerDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, guard, editing, bg } = useWarmKit({
  defaults: hSplitBannerDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

/** 左右比例 → flex-grow */
const grow = computed(() => {
  const r = String(p.value.ratio || '1:1')
  if (r === '1:2') return { left: 1, right: 2 }
  if (r === '2:1') return { left: 2, right: 1 }
  return { left: 1, right: 1 }
})

/** 两格底色必须有微色差：左 #FDF6EC / 右 #FBEADB 同色系深浅 */
const leftStyle = computed(() => ({
  flex: `${grow.value.left} 1 0`,
  background: p.value.leftBg || '#FDF6EC',
}))

const rightStyle = computed(() => ({
  flex: `${grow.value.right} 1 0`,
  background: p.value.rightBg || '#FBEADB',
}))

function isImage(v: any) {
  return typeof v === 'string' && /^(https?:)?\/\/|\.(png|jpe?g|webp|gif)$/i.test(v)
}

function go(link: any, e: Event, side: 'left' | 'right') {
  if (editing.value) {
    guard(e)
    return
  }
  const target = String(link || '').trim()
  if (!target) return
  e.stopPropagation()
  window.dispatchEvent(
    new CustomEvent('h-split-banner-navigate', {
      detail: { side, link: target, title: p.value[side === 'left' ? 'leftTitle' : 'rightTitle'] },
    }),
  )
}
</script>

<style scoped>
.wk-split {
  position: relative;
  padding: 12px;
}
.wk-split__row {
  display: flex;
  align-items: stretch;
}
/* flex:1 挡不住长文案折行，必须显式 min-width:0 */
.wk-split__cell {
  min-width: 0;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 11px;
  border-radius: 12px;
  border: 1px solid #F5E6D4;
  box-shadow: 0 4px 16px rgba(180, 83, 9, 0.06);
}
.wk-split__icon {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  line-height: 1;
  border-radius: 8px;
  background: #FFFDF9;
  border: 1px solid #F5E6D4;
}
.wk-split__icon-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  display: block;
}
.wk-split__text {
  flex: 1 1 auto;
  min-width: 0;
}
.wk-split__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.wk-split__sub {
  margin: 4px 0 0;
  font-size: 11px;
  line-height: 1.6;
  color: #57534E;
  overflow-wrap: anywhere;
}
.wk-split__arrow {
  flex-shrink: 0;
  align-self: center;
  font-size: 15px;
  line-height: 1;
}
</style>
