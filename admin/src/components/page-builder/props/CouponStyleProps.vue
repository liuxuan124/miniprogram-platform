<template>
  <CouponStyleForm :config="cfg" @patch="(p) => emit('update', p)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CouponStyleForm from '../coupon/CouponStyleForm.vue'
import { normalizeCouponProps, type CouponProps } from '../coupon/couponSchema'

/**
 * 优惠券的「样式」子面板适配层。
 *
 * 与 SearchStyleProps / CategoryNavStyleProps 同款：PropsPanel.stylePanelMap
 * 统一传 `props` + 收 `update`，而 CouponStyleForm 吃归一化后的 `config` + `patch`。
 * 归一化只在这层做一次，面板与画布共用同一个 normalizeCouponProps，不会两边漂移。
 */
const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const cfg = computed<CouponProps>(() => normalizeCouponProps(props.props))
</script>
