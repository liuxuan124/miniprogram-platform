<template>
  <el-tooltip
    :content="text"
    placement="top"
    :show-after="260"
    :max-width="260"
    effect="light"
  >
    <button
      type="button"
      class="wb-field-hint"
      :aria-label="text"
      tabindex="0"
      @click.stop
      @mousedown.stop
    >
      ?
    </button>
  </el-tooltip>
</template>

<script setup lang="ts">
/**
 * 字段标题旁的「?」悬浮说明。
 * 目的：把原先平铺在控件下方的长段解释文案收进 tooltip，
 * 面板恢复清爽留白，同时说明不丢。
 */
defineProps<{ text: string }>()
</script>

<style scoped>
.wb-field-hint {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 15px;
  height: 15px;
  margin-left: 3px;
  padding: 0;
  color: #b3a596;
  font-family: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  vertical-align: 1px;
  background: transparent;
  border: 1px solid #ded2c2;
  border-radius: 50%;
  cursor: help;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.wb-field-hint:hover,
.wb-field-hint:focus-visible {
  color: var(--el-color-primary, #c08e6e);
  background: color-mix(in srgb, var(--el-color-primary, #c08e6e) 8%, #fff);
  border-color: color-mix(in srgb, var(--el-color-primary, #c08e6e) 45%, #fff);
  outline: none;
}
</style>
