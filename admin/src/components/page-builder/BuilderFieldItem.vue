<template>
  <el-form-item :label-width="labelWidth">
    <template #label>
      <span class="wb-label">
        <span v-if="required" class="wb-label__req" title="必填">*</span>
        {{ label }}
        <FieldHint v-if="hint" :text="hint" />
      </span>
    </template>
    <slot />
  </el-form-item>
</template>

<script setup lang="ts">
/**
 * 带「?」说明的表单项 —— 字段标题旁挂提示气泡，替代原先平铺在控件下方的长段解释。
 *
 * 为什么要这个薄封装：
 * 用 el-form-item 的 `label` 插槽 + FieldHint 也能实现，但每个字段都要写一遍插槽样板，
 * 漏一处就退回成平铺文案。这里包一层，`hint` 传了就自动出 `?`。
 */
import FieldHint from './FieldHint.vue'

withDefaults(
  defineProps<{
    label: string
    /** 悬停 ? 展示的业务说明；留空则不出 ? */
    hint?: string
    labelWidth?: string
    /** 必填星号：用于「开关打开后才有意义」的字段（如加群链接） */
    required?: boolean
  }>(),
  { labelWidth: '76px' },
)
</script>

<style scoped>
.wb-label {
  display: inline-flex;
  gap: 2px;
  align-items: center;
  max-width: 100%;
  /* 中文标签换行成两行比被裁成「平台维」可读得多 */
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}
.wb-label__req {
  flex: none;
  color: var(--el-color-danger, #f56c6c);
  font-weight: 700;
}
</style>
