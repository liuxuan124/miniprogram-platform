<template>
  <div class="unknown-component" :class="{ 'unknown-component--preview': previewMode }">
    <template v-if="previewMode">
      <div class="unknown-component__title">{{ previewTitle }}</div>
      <div class="unknown-component__hint">该区块暂未在预览中展示，真机以已发布页面为准</div>
    </template>
    <template v-else>
      <div class="unknown-component__title">未知组件</div>
      <div class="unknown-component__type">{{ component.type }}</div>
      <div class="unknown-component__hint">该类型未注册，小程序端将跳过渲染</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentInstance } from '@/types/page'

const props = defineProps<{
  component: ComponentInstance
  previewMode?: boolean
}>()

const previewTitle = computed(() => {
  const type = String(props.component.type || '')
  const id = String(props.component.id || '')
  if (/flow-ai|ai[-_]?assistant/i.test(type) || /flow-ai|ai[-_]?assistant/i.test(id)) {
    return 'AI 智能助手'
  }
  const title = String((props.component.props as any)?.title || '').trim()
  if (title) return title
  return '功能区块'
})
</script>

<style scoped>
.unknown-component {
  padding: 16px 12px;
  text-align: center;
  background: #fef2f2;
  border: 1px dashed #fca5a5;
  border-radius: 8px;
  color: #991b1b;
}

.unknown-component__title {
  font-size: 13px;
  font-weight: 600;
}

.unknown-component__type {
  margin-top: 4px;
  font-family: monospace;
  font-size: 12px;
}

.unknown-component__hint {
  margin-top: 6px;
  font-size: 11px;
  color: #b91c1c;
}

.unknown-component--preview {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}
.unknown-component--preview .unknown-component__title {
  color: #334155;
}
.unknown-component--preview .unknown-component__hint {
  color: #64748b;
}
</style>
