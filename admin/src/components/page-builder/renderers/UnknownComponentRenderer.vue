<template>
  <div class="unknown-component">
    <div class="unknown-component__title">未知组件</div>
    <div class="unknown-component__type">{{ component.type }}</div>
    <div class="unknown-component__hint">该类型未注册，小程序端将跳过渲染</div>
  </div>
</template>

<script setup lang="ts">
import type { ComponentInstance } from '@/types/page'

defineProps<{
  component: ComponentInstance
}>()
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
</style>
