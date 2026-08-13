<template>
  <div class="rich-text-props">
    <div class="label">内容</div>
    <PageRichTextEditor
      :model-value="data.content || ''"
      @update:model-value="(v) => emit('update', { content: v })"
    />
  </div>
</template>

<script setup lang="ts">
import PageRichTextEditor from './PageRichTextEditor.vue'

const { props: data } = defineProps<{ props: Record<string, any> }>()
const emit = defineEmits<{ update: [value: Record<string, any>] }>()
</script>

<style scoped>
.rich-text-props {
  width: 100%;
}

.label {
  margin-bottom: 6px;
  color: #7b8798;
  font-size: 12px;
  font-weight: 600;
}
</style>
