<template>
  <div class="page-path-field">
    <template v-if="locked">
      <el-input :model-value="fullPath" disabled />
      <div class="hint">首页路径固定，不可修改</div>
    </template>
    <template v-else>
      <div class="path-row">
        <span class="prefix mono">{{ prefix }}</span>
        <el-input
          :model-value="slug"
          :disabled="disabled"
          placeholder="可改后缀，如 page-home"
          maxlength="64"
          @update:model-value="onSlugInput"
        />
      </div>
      <div class="hint">完整路径：<span class="mono">{{ fullPath }}</span></div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  isHomePathLocked,
  joinEditablePath,
  normalizeBuilderPath,
  pathPrefixByType,
  splitEditablePath,
} from '@/utils/page-path'

const props = defineProps<{
  modelValue: string
  pageType: number | string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const locked = computed(() => isHomePathLocked(props.pageType))
const prefix = computed(() => pathPrefixByType(props.pageType))
const slug = computed(() => splitEditablePath(props.modelValue, props.pageType).slug)
const fullPath = computed(() => {
  if (locked.value) return '/pages/index/index'
  return joinEditablePath(prefix.value, slug.value, props.pageType)
    || normalizeBuilderPath(props.modelValue)
})

function onSlugInput(raw: string) {
  emit('update:modelValue', joinEditablePath(prefix.value, raw, props.pageType))
}
</script>

<style scoped lang="scss">
.page-path-field {
  width: 100%;
}

.path-row {
  display: flex;
  align-items: center;
  gap: 0;
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: var(--el-fill-color-blank);

  .prefix {
    flex: 0 0 auto;
    padding: 0 10px;
    color: #64748b;
    font-size: 12px;
    background: #f8fafc;
    border-right: 1px solid var(--el-border-color);
    white-space: nowrap;
    line-height: 32px;
  }

  :deep(.el-input) {
    flex: 1;
  }

  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    border-radius: 0;
  }
}

.hint {
  margin-top: 6px;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.4;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
</style>
