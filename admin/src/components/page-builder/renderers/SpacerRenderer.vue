<template>
  <div class="render-spacer" :style="{ height: (component.props.height || 20) + 'px' }">
    <span class="spacer-label">间距 {{ component.props.height || 20 }}px</span>
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
.render-spacer {
  display: flex;
  align-items: center;
  justify-content: center;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 5px,
    #f5f7fa 5px,
    #f5f7fa 10px
  );

  .spacer-label {
    font-size: 11px;
    color: #c0c4cc;
    background: #fff;
    padding: 2px 8px;
    border-radius: 10px;
  }
}
</style>
