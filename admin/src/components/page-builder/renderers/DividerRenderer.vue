<template>
  <div class="render-divider" :style="dividerSpacing">
    <hr :style="{ borderStyle: component.props.style_type || 'solid', borderColor: component.props.color || '#e5e5e5' }" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const dividerSpacing = computed(() => ({
  padding: `${Number(props.component.props?.margin ?? 16)}px 0`,
}))

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-divider {
  hr {
    border: none;
    border-top-width: 1px;
    border-top-color: #e5e5e5;
  }
}
</style>
