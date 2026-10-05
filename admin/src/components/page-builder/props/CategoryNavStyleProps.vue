<template>
  <CategoryNavStyleForm :config="cfg" @patch="(p) => emit('update', p)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CategoryNavStyleForm from '../categoryNav/CategoryNavStyleForm.vue'
import { normalizeCategoryNavProps, type CategoryNavProps } from '../categoryNav/categoryNavSchema'

/**
 * 分类导航的「样式」子面板适配层。
 *
 * 与 SearchStyleProps 同款：PropsPanel.stylePanelMap 统一传 `props` + 收 `update`，
 * 而 CategoryNavStyleForm 吃的是归一化后的 `config` + `patch`。
 * 归一化只在这层做一次，面板与画布共用同一个 normalizeCategoryNavProps，不会两边漂移。
 */
const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const cfg = computed<CategoryNavProps>(() => normalizeCategoryNavProps(props.props))
</script>
