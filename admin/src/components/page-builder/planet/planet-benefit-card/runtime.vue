<template>
  <div
    class="wk-card wk-benefit"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">编辑态：点击不会跳转</span>

    <span v-if="p.badge" class="wk-benefit__badge" :style="badgeStyle">{{ p.badge }}</span>

    <div class="wk-benefit__head">
      <div class="wk-benefit__name">{{ p.planetName || '星球名' }}</div>
      <div v-if="p.tagline" class="wk-benefit__tagline">{{ p.tagline }}</div>
    </div>

    <ul class="wk-benefit__list">
      <li v-for="(b, i) in topBenefits" :key="b.id || i" class="wk-benefit__item">
        <span class="wk-benefit__icon">{{ b.icon || '✦' }}</span>
        <div class="wk-benefit__text">
          <div class="wk-benefit__btitle">{{ b.title || '核心特权' }}</div>
          <div class="wk-benefit__bdesc">{{ b.desc || '一句话说明这项特权带来的实际收益' }}</div>
        </div>
      </li>
    </ul>

    <div class="wk-benefit__foot">
      <div class="wk-benefit__price">
        <span v-if="p.originalPrice" class="wk-benefit__orig">¥{{ p.originalPrice }}</span>
        <span class="wk-benefit__now" :style="{ color: p.accentColor }">
          <i class="wk-benefit__symbol">¥</i>{{ p.price || '0' }}
        </span>
        <span v-if="p.priceUnit" class="wk-benefit__unit">{{ p.priceUnit }}</span>
      </div>
      <button
        v-if="p.ctaText"
        type="button"
        class="wk-benefit__cta"
        :style="ctaStyle"
        @click.stop="enter"
      >
        {{ p.ctaText }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { planetBenefitCardDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, items, guard, editing, bg } = useWarmKit({
  defaults: planetBenefitCardDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
  itemKey: 'benefits',
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const topBenefits = computed(() => items.value.slice(0, 3))

const badgeStyle = computed(() => ({
  background: '#FDE8D8',
  color: p.value.accentColor || '#C2410C',
}))

const ctaStyle = computed(() => ({
  background: p.value.accentColor || '#C2410C',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

function enter(e: Event) {
  if (editing.value) {
    guard(e)
    return
  }
  window.dispatchEvent(
    new CustomEvent('planet-join-open', {
      detail: { planet: p.value.planetName, link: p.value.ctaLink },
    }),
  )
}
</script>

<style scoped>
.wk-benefit {
  position: relative;
  padding: 16px 14px 14px;
}
.wk-benefit__badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}
.wk-benefit__head {
  margin-top: 10px;
}
.wk-benefit__name {
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
  color: #292524;
}
.wk-benefit__tagline {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #78716C;
}
.wk-benefit__list {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
}
.wk-benefit__item {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid #F5E6D4;
}
.wk-benefit__item:first-child {
  border-top: none;
  padding-top: 0;
}
.wk-benefit__icon {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: #FFFAF3;
}
.wk-benefit__text {
  min-width: 0;
}
.wk-benefit__btitle {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  color: #292524;
}
.wk-benefit__bdesc {
  margin-top: 2px;
  font-size: 11px;
  line-height: 1.6;
  color: #78716C;
}
.wk-benefit__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid #F5E6D4;
}
.wk-benefit__price {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.wk-benefit__orig {
  font-size: 12px;
  color: #78716C;
  text-decoration: line-through;
}
.wk-benefit__now {
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}
.wk-benefit__symbol {
  font-size: 14px;
  font-style: normal;
  margin-right: 1px;
}
.wk-benefit__unit {
  font-size: 11px;
  color: #78716C;
}
.wk-benefit__cta {
  flex-shrink: 0;
  padding: 9px 22px;
  border: none;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: #FFFDF9;
  cursor: pointer;
}
.wk-guard .wk-benefit__cta {
  cursor: default;
}
</style>