<template>
  <div
    class="wk-card wk-referral"
    :style="rootStyle"
  >
    <span v-if="editing" class="wk-edit-hint">editing</span>

    <h4 class="wk-referral__incentive">{{ p.incentive || '邀请同行入圈，双方各得合规手册' }}</h4>

    <div v-if="p.showProgress" class="wk-referral__progress">
      <div class="wk-referral__bar">
        <span class="wk-referral__fill" :style="fillStyle" />
      </div>
      <div class="wk-referral__nums">
        <span class="wk-referral__count">已邀 {{ invited }} / 目标 {{ target }}</span>
        <span class="wk-referral__pct" :style="{ color: p.progressColor }">{{ percent }}%</span>
      </div>
    </div>

    <ul v-if="rewards.length" class="wk-referral__rewards">
      <li v-for="(r, i) in rewards" :key="r.id || i" class="wk-referral__reward">
        <span v-if="r.icon" class="wk-referral__ricon">{{ r.icon }}</span>
        <span class="wk-referral__rtext">{{ r.text || '已获奖励' }}</span>
      </li>
    </ul>

    <div v-if="p.ctaText" class="wk-referral__foot">
      <span class="wk-referral__cta" :style="ctaStyle">{{ p.ctaText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useWarmKit } from '../../shared/useWarmKit'
import { opReferralBannerDefaultProps } from './schema'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
}>()

const { safe: p, items: rewards, guard, editing, bg } = useWarmKit({
  defaults: opReferralBannerDefaultProps,
  source: computed(() => props.component?.props),
  editorMode: computed(() => false),
  itemKey: 'rewards',
})

const rootStyle = computed(() => ({
  background: bg.value || '#FDF6EC',
  boxShadow: '0 4px 16px rgba(180, 83, 9, 0.06)',
}))

const invited = computed(() => {
  const n = Number(p.value.invitedCount)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})

const target = computed(() => {
  const n = Number(p.value.targetCount)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
})

const percent = computed(() => {
  if (target.value <= 0) return 0
  return Math.min(100, Math.round((invited.value / target.value) * 100))
})

const fillStyle = computed(() => ({
  width: `${percent.value}%`,
  background: p.value.progressColor || '#0AAA75',
}))

const ctaStyle = computed(() => ({
  background: p.value.accentColor || '#C2410C',
}))
</script>

<style scoped>
.wk-referral {
  position: relative;
  padding: 14px;
}
.wk-referral__incentive {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.65;
  color: #292524;
}
.wk-referral__progress {
  margin-top: 12px;
}
.wk-referral__bar {
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #F5E6D4;
}
.wk-referral__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}
.wk-referral__nums {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-top: 6px;
}
.wk-referral__count {
  font-size: 11px;
  color: #78716C;
}
.wk-referral__pct {
  font-size: 13px;
  font-weight: 600;
}
.wk-referral__rewards {
  margin: 12px 0 0;
  padding: 10px 12px;
  list-style: none;
  border-radius: 10px;
  background: #FFFAF3;
}
.wk-referral__reward {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 3px 0;
}
.wk-referral__ricon {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1.7;
}
.wk-referral__rtext {
  font-size: 12px;
  line-height: 1.7;
  color: #57534E;
}
.wk-referral__foot {
  margin-top: 12px;
}
.wk-referral__cta {
  display: block;
  padding: 8px 0;
  border-radius: 999px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #FFFDF9;
}
</style>
