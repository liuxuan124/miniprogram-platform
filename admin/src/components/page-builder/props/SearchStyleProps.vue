<template>
  <SearchStyleForm :config="cfg" @patch="(p) => emit('update', p)" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SearchStyleForm from '../search/SearchStyleForm.vue'
import { normalizeSearchProps, type SearchProps } from '../search/searchSchema'

/**
 * 搜索组件的「样式」子面板适配层。
 *
 * 为什么要这一层：PropsPanel 的 stylePanelMap 统一传 `props` + 收 `update`，
 * 而 SearchStyleForm 吃的是归一化后的 `config` + `patch`。
 * 归一化只在这一层做一次，面板与画布共用同一个 normalizeSearchProps，不会两边漂移。
 */
const props = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()

const cfg = computed<SearchProps>(() => normalizeSearchProps(props.props))
</script>