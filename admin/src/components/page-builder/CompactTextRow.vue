<template>
  <div class="ctr" :class="{ 'is-disabled': disabled }">
    <span class="ctr__label">
      {{ label }}
      <el-tooltip v-if="hint" :content="hint" placement="top" :show-after="200">
        <span class="ctr__q" :aria-label="`${label} 说明`" role="button" tabindex="0">?</span>
      </el-tooltip>
    </span>
    <el-input
      class="ctr__input"
      :model-value="modelValue"
      :placeholder="placeholder"
      :maxlength="maxlength"
      :disabled="disabled"
      :show-word-limit="!!maxlength"
      size="small"
      @update:model-value="(v: string) => emit('update:modelValue', v)"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * 紧凑单行文本输入（标签 + 输入框同行，32px 一行）。
 *
 * 与 `CompactSliderRow` 同构的兄弟件 —— 那一行是「标签 + 滑块 + 数字」，
 * 这一行是「标签 + 文本框」。两者一起覆盖了样式面板里最高频的两类字段，
 * 让「标签独占一行 → 两行变一行」成为默认排版。
 */
withDefaults(
  defineProps<{
    modelValue?: string
    label?: string
    placeholder?: string
    hint?: string
    maxlength?: number
    disabled?: boolean
  }>(),
  { label: '', placeholder: '', hint: '', maxlength: 0, disabled: false },
)

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<style scoped>
.ctr {
  display: flex;
  align-items: center;
  gap: 8px;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  height: 32px;
}

.ctr__label {
  display: flex;
  align-items: center;
  gap: 3px;
  flex: none;
  width: 80px;
  min-width: 0;
  overflow: hidden;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ctr__q {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 13px;
  height: 13px;
  color: #a8b3c4;
  font-size: 9px;
  font-weight: 700;
  line-height: 1;
  border: 1px solid #dbe2ec;
  border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.ctr__q:hover,
.ctr__q:focus-visible {
  color: #64748b;
  background: #f1f5f9;
  border-color: #cbd5e1;
  outline: none;
}

.ctr__input { flex: 1 1 auto; min-width: 0; }

:deep(.ctr__input .el-input__wrapper) { padding: 0 8px; }
:deep(.ctr__input .el-input__count) { font-size: 10px; }

.ctr.is-disabled { opacity: 0.6; }
</style>