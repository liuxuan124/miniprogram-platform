<template>
  <FlashSaleStyleForm :config="cfg" @patch="(p) => emit('update', p)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FlashSaleStyleForm from '../flashSale/FlashSaleStyleForm.vue'
import { normalizeFlashSaleProps, type FlashSaleProps } from '../flashSale/flashSaleSchema'

/**
 * 限时秒杀的「样式」子面板适配层。
 *
 * 与 SearchStyleProps / CategoryNavStyleProps / CouponStyleProps 同款：
 * PropsPanel.stylePanelMap 统一传 `props` + 收 `update`，
 * 而 FlashSaleStyleForm 吃归一化后的 `config` + `patch`。
 */
const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const cfg = computed<FlashSaleProps>(() => normalizeFlashSaleProps(props.props))
</script>
