<template>
  <div v-if="!hiddenUnlocked" class="paywall" :class="'paywall--' + (component.props.theme || 'warm')">
    <div class="paywall__fade" :style="fadeStyle" />
    <div v-if="unlockedBanner" class="paywall__unlocked-banner">您已解锁本篇内容</div>
    <div v-else class="paywall__box">
      <div class="paywall__lock">🔒</div>
      <h4>{{ mainTitle }}</h4>
      <p class="paywall__sub">{{ subTitle }}</p>
      <p v-if="hintText" class="paywall__hint">{{ hintText }}</p>
      <button type="button" class="paywall__btn">{{ component.props.button_text || '立即解锁' }}</button>
      <div v-if="secondaryRows.length" class="paywall__options">
        <button
          v-for="row in secondaryRows"
          :key="row.method"
          type="button"
          class="paywall__opt"
        >
          {{ row.button_text }}
          <span v-if="row.price" class="paywall__opt-price">{{ row.price }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'
import {
  buildUnlockRows,
  interpolatePaywallCopy,
  normalizeUnlockMethods,
  shouldHidePaywall,
  type PaywallPreviewIdentity,
} from '@/utils/dsl-paywall'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const paywall = computed(() => props.component.props?.paywall || {})
const identity = computed(
  () => (props.component.props?.preview_identity || 'guest') as PaywallPreviewIdentity,
)
const unlockedBehavior = computed(() => props.component.props?.unlocked_behavior || 'hide')

const hiddenUnlocked = computed(() =>
  shouldHidePaywall(identity.value, unlockedBehavior.value),
)
const unlockedBanner = computed(() =>
  identity.value === 'unlocked' && unlockedBehavior.value === 'banner',
)

const mainTitle = computed(() =>
  interpolatePaywallCopy(props.component.props?.title || '解锁全文', {
    remainPercent: paywall.value.remainPercent ?? '30%',
    price: paywall.value.price,
    memberPrice: paywall.value.memberPrice,
  }),
)

const subTitle = computed(() =>
  interpolatePaywallCopy(props.component.props?.subtitle || '', {
    remainPercent: paywall.value.remainPercent ?? '30%',
    price: paywall.value.price,
    memberPrice: paywall.value.memberPrice,
  }),
)

const hintText = computed(() => String(props.component.props?.hint || '').trim())

const methods = computed(() => normalizeUnlockMethods(props.component.props?.unlock_methods))
const secondaryRows = computed(() => {
  const overrides = props.component.props?.unlock_labels || {}
  const rows = buildUnlockRows(methods.value, overrides, {
    price: paywall.value.price ? `¥${paywall.value.price}` : undefined,
    memberPrice: paywall.value.memberPrice,
  })
  return rows.slice(1, 4)
})

const fadeStyle = computed(() => {
  const h = Number(props.component.props?.mask_height) || 72
  const color = String(props.component.props?.mask_color || '').trim()
  const base = color || 'rgba(255, 255, 255, 0)'
  return { height: `${h}px`, background: `linear-gradient(180deg, ${base}, #fdf6ec 85%)` }
})
</script>

<style scoped>
.paywall {
  position: relative;
  margin-top: -40px;
  padding: 48px 16px 0;
}
.paywall__fade {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  pointer-events: none;
}
.paywall__box {
  position: relative;
  border-radius: 16px;
  padding: 18px 16px;
  text-align: center;
  background: linear-gradient(150deg, #fff6ea, #fdeedb);
  border: 1px solid #f0e0c8;
}
.paywall__lock {
  font-size: 22px;
  margin-bottom: 4px;
}
.paywall__box h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: #172033;
}
.paywall__sub {
  margin: 6px 0 0;
  font-size: 12px;
  color: #c8923a;
}
.paywall__hint {
  margin: 8px 0 14px;
  font-size: 12px;
  line-height: 1.6;
  color: #5c6570;
}
.paywall__btn {
  border: none;
  border-radius: 999px;
  padding: 10px 28px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #c8923a, #a66b1f);
  cursor: default;
}
.paywall__options {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 10px;
}
.paywall__opt {
  border: 1px dashed #e8dcc8;
  background: #fff;
  border-radius: 10px;
  padding: 8px;
  font-size: 12px;
  cursor: default;
}
.paywall__opt-price {
  margin-left: 6px;
  color: #c8923a;
}
.paywall__unlocked-banner {
  text-align: center;
  padding: 10px;
  border-radius: 12px;
  background: #ecfdf5;
  color: #047857;
  font-size: 12px;
}
.paywall--blue .paywall__box {
  background: linear-gradient(150deg, #eef5ff, #e3edff);
  border-color: #c8d9f5;
}
</style>
