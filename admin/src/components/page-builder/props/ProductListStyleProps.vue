<template>
  <ProductListStyleForm :config="cfg" @patch="(p) => emit('update', p)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ProductListStyleForm from '../productList/ProductListStyleForm.vue'
import { normalizeProductListProps, type ProductListProps } from '../productList/productListSchema'

/**
 * 商品列表的「样式」子面板适配层。
 *
 * 与 SearchStyleProps / CouponStyleProps / FlashSaleStyleProps 同款：
 * PropsPanel.stylePanelMap 统一传 `props` + 收 `update`，
 * 而 ProductListStyleForm 吃归一化后的 `config` + `patch`。
 * 归一化只在这层做一次，面板与画布共用同一个 normalizeProductListProps，不会两边漂移。
 */
const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const cfg = computed<ProductListProps>(() => normalizeProductListProps(props.props))
</script>
