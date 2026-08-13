<template>
  <div
    class="render-coupon split-text-typography"
    :class="[`layout-${layout}`, { clickable: previewMode }]"
  >
    <div v-if="component.props.title" class="section-title" :style="titleStyle">
      {{ component.props.title }}
    </div>
    <div class="coupon-list">
      <div
        v-for="item in displayCoupons"
        :key="item.id"
        class="coupon-item"
        @click="onClaim(item)"
      >
        <div class="coupon-amount" :style="amountStyle">{{ item.displayValue }}</div>
        <div class="coupon-info">
          <div class="coupon-meta">
            <div class="coupon-name" :style="metaStyle">{{ item.name }}</div>
            <div class="coupon-condition" :style="metaStyle">{{ item.condition }}</div>
          </div>
          <div class="coupon-btn">{{ buttonText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getCouponList } from '@/api/coupon'
import type { ComponentInstance } from '@/types/page'
import { titleFontStyle } from '../composables/titleFontStyle'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const emit = defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()

type DisplayCoupon = {
  id: string | number
  name: string
  displayValue: string
  condition: string
}

const remoteCoupons = ref<DisplayCoupon[]>([])

const layout = computed(() =>
  props.component.props?.style_type === 'vertical' ? 'vertical' : 'horizontal',
)
const limit = computed(() => Math.max(Number(props.component.props?.limit) || 3, 1))
const buttonText = computed(() => props.component.props?.button_text || '领取')
const titleStyle = computed(() => titleFontStyle(props.component.props?.title_font_size, 15))
const metaStyle = computed(() => titleFontStyle(props.component.props?.subtitle_font_size, 12))
const amountStyle = computed(() => titleFontStyle((Number(props.component.props?.subtitle_font_size) || 12) + 8, 20))

const fallbackCoupons = computed<DisplayCoupon[]>(() => [
  { id: 'demo-1', name: '新人专享券', displayValue: '¥10', condition: '满100可用' },
  { id: 'demo-2', name: '满减优惠券', displayValue: '¥20', condition: '满199可用' },
  { id: 'demo-3', name: '会员折扣券', displayValue: '9折', condition: '全场可用' },
])

const displayCoupons = computed(() => {
  const source = remoteCoupons.value.length ? remoteCoupons.value : fallbackCoupons.value
  return source.slice(0, limit.value)
})

function formatCoupon(raw: any): DisplayCoupon {
  const type = String(raw?.type || 'fixed')
  const value = Number(raw?.value ?? raw?.amount ?? raw?.discount ?? 0)
  const min = Number(raw?.minOrderAmount ?? raw?.min_amount ?? raw?.minAmount ?? 0)
  return {
    id: raw?.id ?? `coupon-${Math.random()}`,
    name: raw?.name || raw?.title || '优惠券',
    displayValue: type === 'percent' ? `${value}折` : `¥${value}`,
    condition: min > 0 ? `满${min}可用` : '无门槛',
  }
}

async function loadCoupons() {
  try {
    const res = await getCouponList({ page: 1, page_size: 20, status: 'published' })
    const payload = (res as any)?.data || {}
    const records = payload.records || payload.list || []
    remoteCoupons.value = (Array.isArray(records) ? records : []).map(formatCoupon)
  } catch {
    remoteCoupons.value = []
  }
}

function onClaim(item: DisplayCoupon) {
  if (!props.previewMode) return
  emit('preview-action', {
    tab: 'home',
    message: `领取优惠券：${item.name}`,
    detailType: 'coupon',
    detailTitle: item.name,
    detailDesc: `${item.displayValue} · ${item.condition}`,
  })
}

onMounted(loadCoupons)
</script>

<style lang="scss" scoped>
.render-coupon {
  padding: 8px;
  background: #fff;
  border-radius: var(--card-radius, 10px);

  &.clickable .coupon-item {
    cursor: pointer;
  }

  .section-title {
    margin-bottom: 8px;
    color: #172033;
    font-size: 15px;
    font-weight: 700;
  }

  .coupon-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &.layout-horizontal .coupon-list {
    flex-direction: row;
    overflow-x: auto;
    gap: 10px;

    .coupon-item {
      flex: 0 0 220px;
    }
  }

  .coupon-item {
    display: flex;
    align-items: stretch;
    overflow: hidden;
    background: #fff5f5;
    border: 1px solid #fde2e2;
    border-radius: var(--card-radius, 8px);
  }

  .coupon-amount {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 72px;
    padding: 12px 4px;
    color: #f56c6c;
    font-size: 20px;
    font-weight: 700;
    border-right: 1px dashed #fde2e2;
  }

  .coupon-info {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
    padding: 8px 10px;
  }

  .coupon-meta {
    min-width: 0;
  }

  .coupon-name {
    overflow: hidden;
    color: #172033;
    font-size: 12px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .coupon-condition {
    margin-top: 2px;
    color: #909399;
    font-size: 11px;
  }

  .coupon-btn {
    flex-shrink: 0;
    padding: 4px 12px;
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    background: #f56c6c;
    border-radius: 999px;
  }
}
</style>
