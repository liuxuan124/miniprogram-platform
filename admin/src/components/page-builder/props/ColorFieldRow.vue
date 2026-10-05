<template>
  <div class="clr-field">
    <!--
      颜色字段：色块 + Hex 输入 + 透明提示 + 恢复默认。

      三个真问题（都是实际踩到的）：
      ① 纯色块**看不出 alpha**：选了「黑」但值是 rgba(0,0,0,0)，
         色块显示黑、画布却透明 → 运营以为样式没生效。
         ColorInputRow 会自动给这类值加虚线框 + 棕色字提示。
      ② 没法清空：清空按钮把它还原为未设置（null）。
      ③ 无 Hex 回显：运营记不住上次配了什么色，也没法手输精确值。

      🔴 2026-10-06：三段式布局统一交给 ColorInputRow，
      修掉 EP trigger 内部绝对定位色块/清空图标盖住色块、溢出边框的问题。
    -->
    <ColorInputRow
      :model-value="raw || ''"
      size="small"
      :show-alpha="true"
      :predefine="predefine"
      :default-value="fallback || ''"
      :aria-label="`${field} 颜色`"
      @update:model-value="(v: string | null) => emit('update', { field: props.field, value: v || null })"
    />
    <span v-if="isAlpha" class="clr-field__alpha">透明</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import ColorInputRow from '@/components/ColorInputRow.vue'

const props = defineProps<{
  /** props 里的字段名 */
  field: string
  /** 当前值（可能是 hex / rgba / 空） */
  value?: string | null
  /** 缺省值（重置按钮的目标） */
  fallback?: string
  /** 预设色板 */
  predefine?: string[]
}>()

const emit = defineEmits<{ update: [value: { field: string; value: string | null }] }>()

const raw = computed(() => String(props.value ?? '').trim())

/** alpha < 1 的 rgba 要显式提示，否则「色块是黑、画布却透明」会被当成 bug */
const isAlpha = computed(() => {
  const m = raw.value.match(/rgba?\([^)]*?,\s*([\d.]+)\s*\)/i)
  if (!m) return false
  return Number(m[1]) < 1
})
</script>

<style scoped lang="scss">
.clr-field {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

/* 输入框已经用虚线框+棕字提示过了，这里补一个显式文字标签，
   避免运营只看到「颜色淡」却不知道是透明度问题 */
.clr-field__alpha {
  flex: none;
  padding: 1px 6px;
  color: #b45309;
  font-size: 11px;
  white-space: nowrap;
  background: #fffbeb;
  border: 1px dashed #fcd34d;
  border-radius: 5px;
}
</style>