<template>
  <div class="render-divider">
    <hr :style="{ borderStyle: component.props.style_type || 'solid', borderColor: component.props.color || '#e5e5e5' }" />
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

defineEmits<{
  'preview-action': [payload: { tab: string; message: string; detailType?: string; detailTitle?: string; detailDesc?: string }]
}>()
</script>

<style lang="scss" scoped>
.render-divider {
  padding: 4px 0;

  hr {
    border: none;
    border-top-width: 1px;
    border-top-color: #e5e5e5;
  }
}
</style>
